package model

import (
	"errors"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func confirmPaymentComplianceForTest(t *testing.T) {
	t.Helper()
	paymentSetting := operation_setting.GetPaymentSetting()
	originalConfirmed := paymentSetting.ComplianceConfirmed
	originalTermsVersion := paymentSetting.ComplianceTermsVersion
	t.Cleanup(func() {
		paymentSetting.ComplianceConfirmed = originalConfirmed
		paymentSetting.ComplianceTermsVersion = originalTermsVersion
	})
	paymentSetting.ComplianceConfirmed = true
	paymentSetting.ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion
}

func setInviterRebatePercentForTest(t *testing.T, percent int) {
	t.Helper()
	original := common.InviterRebatePercent
	t.Cleanup(func() {
		common.InviterRebatePercent = original
	})
	common.InviterRebatePercent = percent
}

func setInviterRebateConsumeUnlockForTest(t *testing.T, quota int) {
	t.Helper()
	original := common.InviterRebateConsumeUnlockQuota
	t.Cleanup(func() {
		common.InviterRebateConsumeUnlockQuota = original
	})
	common.InviterRebateConsumeUnlockQuota = quota
}

func setInviterRebateCapsForTest(t *testing.T, maxPerTopup, monthlyMax int) {
	t.Helper()
	originalPerTopup := common.InviterRebateMaxPerTopup
	originalMonthly := common.InviterRebateMonthlyMax
	t.Cleanup(func() {
		common.InviterRebateMaxPerTopup = originalPerTopup
		common.InviterRebateMonthlyMax = originalMonthly
	})
	common.InviterRebateMaxPerTopup = maxPerTopup
	common.InviterRebateMonthlyMax = monthlyMax
}

// createRebateUsersForTest creates an inviter/invitee pair and wipes the
// user, top-up and inviter-rebate ledger tables around the test.
func createRebateUsersForTest(t *testing.T) (inviter *User, invitee *User) {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&User{}, &TopUp{}, &InviterRebate{}))
	wipe := func() {
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&TopUp{}).Error)
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Log{}).Error)
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&User{}).Error)
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&InviterRebate{}).Error)
	}
	wipe()
	t.Cleanup(wipe)

	inviter = &User{Username: "rebate-inviter", AffCode: "RBI001", Status: common.UserStatusEnabled}
	require.NoError(t, DB.Create(inviter).Error)
	invitee = &User{Username: "rebate-invitee", AffCode: "RBE001", Status: common.UserStatusEnabled, InviterId: inviter.Id}
	require.NoError(t, DB.Create(invitee).Error)
	return inviter, invitee
}

func reloadUserForTest(t *testing.T, userId int) *User {
	t.Helper()
	var user User
	require.NoError(t, DB.Where("id = ?", userId).First(&user).Error)
	return &user
}

func TestInviterRebateOnEpayTopUp(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	inviter, invitee := createRebateUsersForTest(t)

	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-1",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	// quota credited = Amount(1) * QuotaPerUnit(500000); rebate = 10%.
	creditedQuota := int(float64(topUp.Amount) * common.QuotaPerUnit)
	expectedRebate := creditedQuota * common.InviterRebatePercent / 100

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, expectedRebate, updatedInviter.AffQuota)
	assert.Equal(t, expectedRebate, updatedInviter.AffHistoryQuota)
	assert.Zero(t, updatedInviter.AffCount, "aff_count counts invitees, not rebates")

	updatedInvitee := reloadUserForTest(t, invitee.Id)
	assert.Equal(t, creditedQuota, updatedInvitee.Quota)

	var rebateLogs []Log
	require.NoError(t, DB.Where("user_id = ? AND type = ?", inviter.Id, LogTypeSystem).Find(&rebateLogs).Error)
	assert.NotEmpty(t, rebateLogs, "inviter should get a system log for the rebate")

	// Phase 0 ledger: exactly one released row for this top-up, with the
	// rebate snapshot (base/percent/quota) recorded at credit time.
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, inviter.Id, ledgers[0].InviterId)
	assert.Equal(t, invitee.Id, ledgers[0].InviteeId)
	assert.Equal(t, InviterRebateSourceTopUp, ledgers[0].SourceType)
	assert.Equal(t, topUp.Id, ledgers[0].SourceId)
	assert.Equal(t, creditedQuota, ledgers[0].BaseQuota)
	assert.Equal(t, common.InviterRebatePercent, ledgers[0].Percent)
	assert.Equal(t, expectedRebate, ledgers[0].Quota)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
	assert.NotZero(t, ledgers[0].ReleasedAt)
	assert.Empty(t, ledgers[0].VoidedReason)

	// Duplicate callback must not re-credit the rebate or duplicate the ledger.
	alreadyDone, err = RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.True(t, alreadyDone)
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, expectedRebate, updatedInviter.AffQuota)
	assert.Len(t, listInviterRebatesForTest(t), 1)
}

func listInviterRebatesForTest(t *testing.T) []InviterRebate {
	t.Helper()
	var ledgers []InviterRebate
	require.NoError(t, DB.Order("id ASC").Find(&ledgers).Error)
	return ledgers
}

func TestInviterRebateDisabledWhenPercentZero(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 0)
	inviter, invitee := createRebateUsersForTest(t)

	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-zero",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	updatedInvitee := reloadUserForTest(t, invitee.Id)
	assert.Equal(t, int(float64(topUp.Amount)*common.QuotaPerUnit), updatedInvitee.Quota)
}

func TestInviterRebateRequiresComplianceConfirmation(t *testing.T) {
	// Compliance is left unconfirmed on purpose.
	paymentSetting := operation_setting.GetPaymentSetting()
	require.False(t, paymentSetting.ComplianceConfirmed)
	setInviterRebatePercentForTest(t, 10)
	inviter, invitee := createRebateUsersForTest(t)

	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-compliance",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	// Top-up itself still succeeds; only the rebate is gated.
	updatedInvitee := reloadUserForTest(t, invitee.Id)
	assert.Equal(t, int(float64(topUp.Amount)*common.QuotaPerUnit), updatedInvitee.Quota)
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
}

func TestInviterRebateOnRedemption(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.AutoMigrate(&Redemption{}))
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Redemption{}).Error)
	t.Cleanup(func() {
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Redemption{}).Error)
	})

	// 999 quota with 10% verifies the floor rounding (99, not 100).
	redemption := &Redemption{
		Id:          1,
		Key:         "rebate-redemption-key-0000000001",
		Status:      common.RedemptionCodeStatusEnabled,
		Quota:       999,
		ExpiredTime: 0,
	}
	require.NoError(t, DB.Create(redemption).Error)

	quota, err := Redeem(redemption.Key, invitee.Id)
	require.NoError(t, err)
	assert.Equal(t, 999, quota)

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 99, updatedInviter.AffQuota)
	assert.Equal(t, 99, updatedInviter.AffHistoryQuota)
	assert.Zero(t, updatedInviter.AffCount)

	updatedInvitee := reloadUserForTest(t, invitee.Id)
	assert.Equal(t, 999, updatedInvitee.Quota)

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateSourceRedemption, ledgers[0].SourceType)
	assert.Equal(t, redemption.Id, ledgers[0].SourceId)
	assert.Equal(t, 999, ledgers[0].BaseQuota)
	assert.Equal(t, 99, ledgers[0].Quota)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
}

func TestInviterRebateWithoutInviter(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	_, _ = createRebateUsersForTest(t)

	loner := &User{Username: "rebate-loner", AffCode: "RBL001", Status: common.UserStatusEnabled, InviterId: 0}
	require.NoError(t, DB.Create(loner).Error)

	topUp := &TopUp{
		UserId:          loner.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-loner",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	updatedLoner := reloadUserForTest(t, loner.Id)
	assert.Equal(t, int(float64(topUp.Amount)*common.QuotaPerUnit), updatedLoner.Quota)
}

// TestInviterRebateFailureDoesNotBlockTopUp verifies the rebate failure
// semantics: when the inviter rebate UPDATE fails inside the top-up
// transaction, the invitee's recharge still commits. The rebate UPDATE is
// singled out via its "aff_quota" column; the invitee quota-credit UPDATE
// (column "quota") must keep succeeding.
func TestInviterRebateFailureDoesNotBlockTopUp(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	inviter, invitee := createRebateUsersForTest(t)

	callbackName := "rebate_test:block_aff_update"
	require.NoError(t, DB.Callback().Update().Before("gorm:update").Register(callbackName, func(tx *gorm.DB) {
		fields, ok := tx.Statement.Dest.(map[string]any)
		if !ok {
			return
		}
		if _, hasAffQuota := fields["aff_quota"]; hasAffQuota {
			_ = tx.AddError(errors.New("injected rebate failure"))
		}
	}))
	t.Cleanup(func() {
		DB.Callback().Update().Remove(callbackName)
	})

	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-fail",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err, "rebate failure must not fail the recharge")
	assert.False(t, alreadyDone)

	// The recharge committed: order success, invitee quota credited.
	var storedTopUp TopUp
	require.NoError(t, DB.Where("trade_no = ?", topUp.TradeNo).First(&storedTopUp).Error)
	assert.Equal(t, common.TopUpStatusSuccess, storedTopUp.Status)
	updatedInvitee := reloadUserForTest(t, invitee.Id)
	creditedQuota := int(float64(topUp.Amount) * common.QuotaPerUnit)
	assert.Equal(t, creditedQuota, updatedInvitee.Quota)

	// The rebate was dropped, not retried: no credit, no inviter-side log,
	// and no ledger row (the user UPDATE fails before the ledger INSERT).
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffHistoryQuota)
	assert.Empty(t, listInviterRebatesForTest(t), "no ledger row when the rebate credit failed")
	var rebateLogs []Log
	require.NoError(t, DB.Where("user_id = ? AND type = ?", inviter.Id, LogTypeSystem).Find(&rebateLogs).Error)
	assert.Empty(t, rebateLogs, "no rebate log for the inviter when the rebate credit failed")

	// The failure is recorded under user_id=0 so only the admin log query
	// (/api/log/, AdminAuth) surfaces it; neither party's own log page shows it.
	var failureLogs []Log
	require.NoError(t, DB.Where("user_id = 0 AND type = ?", LogTypeSystem).Find(&failureLogs).Error)
	require.Len(t, failureLogs, 1)
	assert.Contains(t, failureLogs[0].Content, "Invitation rebate", "admin-facing failure log should describe the rebate failure")

	// A duplicate callback must not retry the rebate either (order success).
	alreadyDone, err = RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.True(t, alreadyDone)
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
}

// TestInviterRebateLedgerVoidedWhenInviterHardDeleted verifies the ledger
// trail when the inviter row is gone: the recharge still succeeds, no quota
// is credited anywhere, and the ledger records the intended rebate as
// voided(inviter_missing) instead of silently disappearing.
func TestInviterRebateLedgerVoidedWhenInviterHardDeleted(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.Unscoped().Delete(&User{}, inviter.Id).Error)

	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-inviter-gone",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	// The recharge itself is unaffected.
	updatedInvitee := reloadUserForTest(t, invitee.Id)
	assert.Equal(t, int(float64(topUp.Amount)*common.QuotaPerUnit), updatedInvitee.Quota)

	creditedQuota := int(float64(topUp.Amount) * common.QuotaPerUnit)
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, inviter.Id, ledgers[0].InviterId)
	assert.Equal(t, creditedQuota*common.InviterRebatePercent/100, ledgers[0].Quota)
	assert.Equal(t, InviterRebateStatusVoided, ledgers[0].Status)
	assert.Equal(t, InviterRebateVoidedInviterMissing, ledgers[0].VoidedReason)
	assert.Zero(t, ledgers[0].ReleasedAt)

	// Nothing is owed, so there is no admin-side failure log either.
	var failureLogs []Log
	require.NoError(t, DB.Where("user_id = 0 AND type = ?", LogTypeSystem).Find(&failureLogs).Error)
	assert.Empty(t, failureLogs)
}

// TestInviterRebateLockedUntilConsumeUnlock covers the consume-unlock cycle:
// rebates are locked (frozen pool, no inviter credit, no inviter log) while the
// invitee's cumulative consumption is below the threshold, and one consumption
// that reaches the threshold releases all locked rows at once. A repeated
// consumption must not credit anything again.
func TestInviterRebateLockedUntilConsumeUnlock(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit) // Amount 1
	expectedRebate := creditedQuota * 10 / 100
	setInviterRebateConsumeUnlockForTest(t, creditedQuota*3/5)

	inviter, invitee := createRebateUsersForTest(t)
	for _, tradeNo := range []string{"rebate-epay-lock-1", "rebate-epay-lock-2"} {
		topUp := &TopUp{
			UserId:          invitee.Id,
			Amount:          1,
			Money:           1.0,
			TradeNo:         tradeNo,
			PaymentProvider: PaymentProviderEpay,
			Status:          common.TopUpStatusPending,
		}
		require.NoError(t, DB.Create(topUp).Error)
		alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
		require.NoError(t, err)
		assert.False(t, alreadyDone)
	}

	// Two locked rows: money frozen, not credited, and no inviter-side log yet.
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	for _, row := range ledgers {
		assert.Equal(t, InviterRebateStatusLocked, row.Status)
		assert.Equal(t, InviterRebateLockedAwaitingConsume, row.LockedReason)
		assert.Zero(t, row.ReleasedAt)
	}
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffHistoryQuota)
	assert.Equal(t, 2*expectedRebate, updatedInviter.AffQuotaLocked)
	var rebateLogs []Log
	require.NoError(t, DB.Where("user_id = ? AND type = ?", inviter.Id, LogTypeSystem).Find(&rebateLogs).Error)
	assert.Empty(t, rebateLogs, "no rebate log while the rebate is locked")

	// Cumulative consumption reaches the threshold: everything releases at once.
	UpdateUserUsedQuotaAndRequestCount(invitee.Id, creditedQuota*3/5)
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 2*expectedRebate, updatedInviter.AffQuota)
	assert.Equal(t, 2*expectedRebate, updatedInviter.AffHistoryQuota)
	assert.Zero(t, updatedInviter.AffQuotaLocked, "frozen pool must drain on release")
	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	for _, row := range ledgers {
		assert.Equal(t, InviterRebateStatusReleased, row.Status)
		assert.Empty(t, row.LockedReason)
		assert.NotZero(t, row.ReleasedAt)
	}
	rebateLogs = []Log{}
	require.NoError(t, DB.Where("user_id = ? AND type = ?", inviter.Id, LogTypeSystem).Find(&rebateLogs).Error)
	require.Len(t, rebateLogs, 1, "a single release event writes one aggregated log")

	// More consumption after release must not credit anything again.
	UpdateUserUsedQuotaAndRequestCount(invitee.Id, creditedQuota/5)
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 2*expectedRebate, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffQuotaLocked)
}

// TestInviterRebateLockedReleasedViaBatchFlush verifies the release hook on the
// batch-update flush write path: with BatchUpdateEnabled the used_quota rows
// are eventually written by updateUserQuotaUsedQuotaAndRequestCount, and the
// release must fire there just like on the direct write path.
func TestInviterRebateLockedReleasedViaBatchFlush(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	expectedRebate := creditedQuota * 10 / 100
	setInviterRebateConsumeUnlockForTest(t, creditedQuota/2)

	inviter, invitee := createRebateUsersForTest(t)
	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-batch-flush",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)
	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	updateUserQuotaUsedQuotaAndRequestCount(invitee.Id, -creditedQuota, creditedQuota/2, 1)
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, expectedRebate, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffQuotaLocked)
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
}

// TestInviterRebateDirectReleaseWhenAlreadyConsumed: when the invitee's
// cumulative consumption already reached the threshold before the top-up, the
// rebate is credited and released immediately, exactly like consume-unlock off.
func TestInviterRebateDirectReleaseWhenAlreadyConsumed(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	expectedRebate := creditedQuota * 10 / 100
	setInviterRebateConsumeUnlockForTest(t, creditedQuota/2)

	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.Model(&User{}).Where("id = ?", invitee.Id).Update("used_quota", creditedQuota/2).Error)

	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-pre-consumed",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)
	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, expectedRebate, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffQuotaLocked)
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
	assert.NotZero(t, ledgers[0].ReleasedAt)
}

// TestInviterRebateReleaseVoidedWhenInviterHardDeleted: a locked rebate whose
// inviter was hard-deleted before the consumption threshold is reached turns
// voided(inviter_missing) instead of being released, with nothing credited.
func TestInviterRebateReleaseVoidedWhenInviterHardDeleted(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	setInviterRebateConsumeUnlockForTest(t, creditedQuota/2)

	inviter, invitee := createRebateUsersForTest(t)
	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "rebate-epay-lock-inviter-gone",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)
	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)
	require.Len(t, listInviterRebatesForTest(t), 1)

	require.NoError(t, DB.Unscoped().Delete(&User{}, inviter.Id).Error)
	UpdateUserUsedQuotaAndRequestCount(invitee.Id, creditedQuota/2)

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusVoided, ledgers[0].Status)
	assert.Equal(t, InviterRebateVoidedInviterMissing, ledgers[0].VoidedReason)
	assert.Empty(t, ledgers[0].LockedReason)
	assert.Zero(t, ledgers[0].ReleasedAt)
}

// rechargeForTest runs one epay top-up (Amount 1) for the invitee and returns
// the credited quota (Amount × QuotaPerUnit).
func rechargeForTest(t *testing.T, inviteeId int, tradeNo string) int {
	t.Helper()
	topUp := &TopUp{
		UserId:          inviteeId,
		Amount:          1,
		Money:           1.0,
		TradeNo:         tradeNo,
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)
	alreadyDone, err := RechargeEpay(topUp.TradeNo, "", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)
	return int(float64(topUp.Amount) * common.QuotaPerUnit)
}

// countMonthlyCapAdminLogsForTest counts the admin-side (user_id=0) system
// logs about rebates withheld by the monthly cap.
func countMonthlyCapAdminLogsForTest(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, DB.Model(&Log{}).Where("user_id = 0 AND type = ? AND content LIKE ?", LogTypeSystem, "%monthly cap%").Count(&count).Error)
	return count
}

// TestInviterRebatePerTopupCapTruncates: the per-top-up cap silently truncates
// the rebate; the ledger and the credited pools carry the capped amount while
// the base quota still records the full credited top-up.
func TestInviterRebatePerTopupCapTruncates(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	fullRebate := creditedQuota * 10 / 100
	setInviterRebateCapsForTest(t, fullRebate/2, 0)

	inviter, invitee := createRebateUsersForTest(t)
	actualCredited := rechargeForTest(t, invitee.Id, "rebate-epay-per-topup-cap")
	assert.Equal(t, creditedQuota, actualCredited)

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, fullRebate/2, updatedInviter.AffQuota)
	assert.Equal(t, fullRebate/2, updatedInviter.AffHistoryQuota)

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
	assert.Equal(t, creditedQuota, ledgers[0].BaseQuota, "base quota records the full credited top-up")
	assert.Equal(t, fullRebate/2, ledgers[0].Quota, "ledger carries the capped rebate")

	// Per-top-up truncation is a policy cut, not a failure: no admin-side log.
	assert.Zero(t, countMonthlyCapAdminLogsForTest(t))
}

// TestInviterRebateMonthlyCapPartialThenVoided walks the monthly cap through
// all three stages: a normal rebate, a partially capped rebate (only the
// remaining allowance is credited, the withheld part gets an admin log), and a
// fully voided rebate once the cap is exhausted (voided(monthly_cap) ledger
// row, no credit, admin log).
func TestInviterRebateMonthlyCapPartialThenVoided(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	rebate := creditedQuota * 10 / 100
	setInviterRebateCapsForTest(t, 0, rebate+rebate/2)

	inviter, invitee := createRebateUsersForTest(t)

	// Stage 1: within the cap, full rebate.
	rechargeForTest(t, invitee.Id, "rebate-epay-monthly-1")
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, rebate, updatedInviter.AffQuota)
	assert.Zero(t, countMonthlyCapAdminLogsForTest(t))

	// Stage 2: exceeds but not exhausted: only the remaining half is credited.
	rechargeForTest(t, invitee.Id, "rebate-epay-monthly-2")
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, rebate+rebate/2, updatedInviter.AffQuota, "monthly cap allows exactly the remaining allowance")
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	assert.Equal(t, rebate/2, ledgers[1].Quota)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[1].Status)
	assert.Equal(t, int64(1), countMonthlyCapAdminLogsForTest(t), "withheld part is reported to admins")

	// Stage 3: cap exhausted: voided(monthly_cap), nothing credited.
	rechargeForTest(t, invitee.Id, "rebate-epay-monthly-3")
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, rebate+rebate/2, updatedInviter.AffQuota, "voided rebate credits nothing")
	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 3)
	assert.Equal(t, InviterRebateStatusVoided, ledgers[2].Status)
	assert.Equal(t, InviterRebateVoidedMonthlyCap, ledgers[2].VoidedReason)
	assert.Equal(t, rebate, ledgers[2].Quota)
	assert.Zero(t, ledgers[2].ReleasedAt)
	assert.Equal(t, int64(2), countMonthlyCapAdminLogsForTest(t))

	// The invitee's recharge is never affected by the cap.
	updatedInvitee := reloadUserForTest(t, invitee.Id)
	assert.Equal(t, 3*creditedQuota, updatedInvitee.Quota)
}

// TestInviterRebateMonthlyCapCountsLockedRows: locked (frozen) rows consume
// the monthly allowance too, so a further top-up past the cap is voided even
// though nothing has been paid out yet.
func TestInviterRebateMonthlyCapCountsLockedRows(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	rebate := creditedQuota * 10 / 100
	setInviterRebateConsumeUnlockForTest(t, creditedQuota)
	setInviterRebateCapsForTest(t, 0, rebate)

	inviter, invitee := createRebateUsersForTest(t)

	// First top-up freezes exactly the monthly allowance.
	rechargeForTest(t, invitee.Id, "rebate-epay-monthly-locked-1")
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	assert.Equal(t, rebate, updatedInviter.AffQuotaLocked)

	// Second top-up: the frozen row already exhausted the cap.
	rechargeForTest(t, invitee.Id, "rebate-epay-monthly-locked-2")
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, rebate, updatedInviter.AffQuotaLocked, "frozen pool unchanged")
	assert.Zero(t, updatedInviter.AffQuota)
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateStatusVoided, ledgers[1].Status)
	assert.Equal(t, InviterRebateVoidedMonthlyCap, ledgers[1].VoidedReason)
	assert.Equal(t, int64(1), countMonthlyCapAdminLogsForTest(t))
}

// TestInviterRebateMonthlyCapIgnoresPriorMonth: the monthly counter only sums
// rows created in the current calendar month; a same-size rebate from the
// previous month does not consume this month's allowance.
func TestInviterRebateMonthlyCapIgnoresPriorMonth(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	rebate := creditedQuota * 10 / 100
	setInviterRebateCapsForTest(t, 0, rebate)

	inviter, invitee := createRebateUsersForTest(t)
	rechargeForTest(t, invitee.Id, "rebate-epay-prior-month")
	require.Len(t, listInviterRebatesForTest(t), 1)

	// Backdate the ledger row into the previous month.
	priorMonth := time.Now().AddDate(0, -1, 0)
	monthStart := time.Date(priorMonth.Year(), priorMonth.Month(), 1, 0, 0, 0, 0, priorMonth.Location()).Unix()
	ledgers := listInviterRebatesForTest(t)
	require.NoError(t, DB.Model(&InviterRebate{}).Where("id = ?", ledgers[0].Id).Update("created_at", monthStart).Error)

	// This month's full allowance is still available.
	rechargeForTest(t, invitee.Id, "rebate-epay-current-month")
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 2*rebate, updatedInviter.AffQuota)
	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[1].Status)
	assert.Zero(t, countMonthlyCapAdminLogsForTest(t))
}
