package model

import (
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
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
// user, top-up, session and inviter-rebate ledger tables around the test.
func createRebateUsersForTest(t *testing.T) (inviter *User, invitee *User) {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&User{}, &TopUp{}, &UserSession{}, &InviterRebate{}))
	wipe := func() {
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&TopUp{}).Error)
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Log{}).Error)
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&User{}).Error)
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&UserSession{}).Error)
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

func setInviterRebateSelfInviteCheckForTest(t *testing.T, enabled bool) {
	t.Helper()
	original := common.InviterRebateSelfInviteCheck
	t.Cleanup(func() {
		common.InviterRebateSelfInviteCheck = original
	})
	common.InviterRebateSelfInviteCheck = enabled
}

// insertUserSessionForTest records one login-session IP for a user at the
// given age (days). Only the self-invite check reads this table, so a minimal
// active row suffices.
func insertUserSessionForTest(t *testing.T, userId int, ip string, ageDays int64) {
	t.Helper()
	at := common.GetTimestamp() - ageDays*86400
	require.NoError(t, DB.Create(&UserSession{
		SID:          fmt.Sprintf("sess-%d-%s-%d", userId, strings.ReplaceAll(ip, ".", "-"), ageDays),
		UserID:       userId,
		Status:       UserSessionStatusActive,
		RefreshHash:  strings.Repeat("a", 64),
		LoginMethod:  "password",
		IP:           ip,
		CreatedAt:    at,
		LastActiveAt: at,
		ExpiresAt:    at + 86400,
	}).Error)
}

// countSelfInviteAdminLogsForTest counts the admin-side (user_id=0) system
// logs about rebates held for self-invite suspicion.
func countSelfInviteAdminLogsForTest(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, DB.Model(&Log{}).Where("user_id = 0 AND type = ? AND content LIKE ?", LogTypeSystem, "%self-invite suspicion%").Count(&count).Error)
	return count
}

// TestInviterRebateSelfInviteLockedOnIPOverlap: an exact login-IP overlap
// within the 90-day window freezes the whole rebate as
// locked(self_invite_suspect) with an admin alert; the invitee's top-up is
// unaffected.
func TestInviterRebateSelfInviteLockedOnIPOverlap(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	rebate := creditedQuota * 10 / 100

	inviter, invitee := createRebateUsersForTest(t)
	insertUserSessionForTest(t, invitee.Id, "203.0.113.7", 0)
	insertUserSessionForTest(t, inviter.Id, "203.0.113.7", 0)

	rechargeForTest(t, invitee.Id, "rebate-epay-self-invite-ip")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateLockedSelfInviteSuspect, ledgers[0].LockedReason)
	assert.Zero(t, ledgers[0].ReleasedAt)
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffHistoryQuota)
	assert.Equal(t, rebate, updatedInviter.AffQuotaLocked)
	assert.EqualValues(t, 1, countSelfInviteAdminLogsForTest(t))

	updatedInvitee := reloadUserForTest(t, invitee.Id)
	assert.Equal(t, creditedQuota, updatedInvitee.Quota)
}

// TestInviterRebateSelfInviteOverridesConsumeUnlock: a suspect rebate locks
// even when the invitee's cumulative consumption already meets the threshold,
// and the locked row never auto-releases on further consumption.
func TestInviterRebateSelfInviteOverridesConsumeUnlock(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	rebate := creditedQuota * 10 / 100
	setInviterRebateConsumeUnlockForTest(t, creditedQuota/2)

	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.Model(&User{}).Where("id = ?", invitee.Id).Update("used_quota", creditedQuota).Error)
	insertUserSessionForTest(t, invitee.Id, "198.51.100.9", 0)
	insertUserSessionForTest(t, inviter.Id, "198.51.100.9", 0)

	rechargeForTest(t, invitee.Id, "rebate-epay-self-invite-consumed")

	// Suspect wins over consume-unlock: locked, not released.
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateLockedSelfInviteSuspect, ledgers[0].LockedReason)
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	assert.Equal(t, rebate, updatedInviter.AffQuotaLocked)

	// Further consumption must not release a self_invite_suspect row.
	UpdateUserUsedQuotaAndRequestCount(invitee.Id, creditedQuota/2)
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	assert.Equal(t, rebate, updatedInviter.AffQuotaLocked)
	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateLockedSelfInviteSuspect, ledgers[0].LockedReason)
}

// TestInviterRebateSelfInviteOnStripeCustomerMatch: a shared Stripe payment
// account is a strong signal on its own, even without any session history.
func TestInviterRebateSelfInviteOnStripeCustomerMatch(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)

	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.Model(&User{}).Where("id IN ?", []int{inviter.Id, invitee.Id}).Update("stripe_customer", "cus_shared_001").Error)

	rechargeForTest(t, invitee.Id, "rebate-epay-self-invite-stripe")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateLockedSelfInviteSuspect, ledgers[0].LockedReason)
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.NotZero(t, updatedInviter.AffQuotaLocked)
	assert.EqualValues(t, 1, countSelfInviteAdminLogsForTest(t))
}

// TestInviterRebateSelfInviteWeakSignalsRequireTwo: a single weak signal
// (similar email on the same domain) never triggers; stacking the second weak
// signal (IPv4 /24 subnet overlap) does. A 100-day-old overlapping session is
// outside the lookback window and must not count.
func TestInviterRebateSelfInviteWeakSignalsRequireTwo(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)

	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.Model(&User{}).Where("id = ?", invitee.Id).Update("email", "ming@example.com").Error)
	require.NoError(t, DB.Model(&User{}).Where("id = ?", inviter.Id).Update("email", "ming2024@example.com").Error)
	// Unrelated IPs (different /24); the stale inviter overlap is 100 days old.
	insertUserSessionForTest(t, invitee.Id, "192.0.2.10", 0)
	insertUserSessionForTest(t, inviter.Id, "198.51.100.20", 0)
	insertUserSessionForTest(t, inviter.Id, "192.0.2.99", 100)

	// Stage 1: email similarity alone (one weak signal) + stale overlap only
	// -> not a suspect, normal release.
	rechargeForTest(t, invitee.Id, "rebate-epay-self-invite-weak-1")
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
	assert.Zero(t, countSelfInviteAdminLogsForTest(t))

	// Stage 2: inviter shows up in the invitee's /24 -> second weak signal
	// stacked -> suspect.
	insertUserSessionForTest(t, inviter.Id, "192.0.2.77", 0)
	rechargeForTest(t, invitee.Id, "rebate-epay-self-invite-weak-2")
	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[1].Status)
	assert.Equal(t, InviterRebateLockedSelfInviteSuspect, ledgers[1].LockedReason)
	assert.EqualValues(t, 1, countSelfInviteAdminLogsForTest(t))
}

// TestInviterRebateSelfInviteCheckDisabled: with the check switched off, an
// exact IP overlap releases normally and writes no admin alert.
func TestInviterRebateSelfInviteCheckDisabled(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	rebate := creditedQuota * 10 / 100
	setInviterRebateSelfInviteCheckForTest(t, false)

	inviter, invitee := createRebateUsersForTest(t)
	insertUserSessionForTest(t, invitee.Id, "203.0.113.30", 0)
	insertUserSessionForTest(t, inviter.Id, "203.0.113.30", 0)

	rechargeForTest(t, invitee.Id, "rebate-epay-self-invite-off")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, rebate, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffQuotaLocked)
	assert.Zero(t, countSelfInviteAdminLogsForTest(t))
}

func setInviterRebateLockExpiryForTest(t *testing.T, days int) {
	t.Helper()
	original := common.InviterRebateLockExpiryDays
	t.Cleanup(func() {
		common.InviterRebateLockExpiryDays = original
	})
	common.InviterRebateLockExpiryDays = days
}

// backdateInviterRebateForTest moves one ledger row's created_at into the
// past so the lock-expiry sweep sees it as overdue.
func backdateInviterRebateForTest(t *testing.T, rowId int, ageDays int64) {
	t.Helper()
	require.NoError(t, DB.Model(&InviterRebate{}).Where("id = ?", rowId).
		Update("created_at", common.GetTimestamp()-ageDays*86400).Error)
}

func countLockExpiryAdminLogsForTest(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, DB.Model(&Log{}).Where("user_id = 0 AND type = ? AND content LIKE ?", LogTypeSystem, "%expired from the locked pool%").Count(&count).Error)
	return count
}

// TestInviterRebateLockExpiryVoidsOverdueRows covers the lock-expiry sweep
// (decision 3): with InviterRebateLockExpiryDays > 0 only overdue
// locked(awaiting_consume) rows are voided, the frozen pool drops by exactly
// the voided amount, one admin log is written, and a later consume-unlock
// release still credits the surviving row — a voided row never comes back.
func TestInviterRebateLockExpiryVoidsOverdueRows(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	rebate := creditedQuota * 10 / 100
	setInviterRebateConsumeUnlockForTest(t, creditedQuota*3/5)
	setInviterRebateLockExpiryForTest(t, 30)

	inviter, invitee := createRebateUsersForTest(t)
	rechargeForTest(t, invitee.Id, "rebate-epay-expiry-1")
	rechargeForTest(t, invitee.Id, "rebate-epay-expiry-2")
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	require.Equal(t, 2*rebate, reloadUserForTest(t, inviter.Id).AffQuotaLocked)

	// Row 1 is 31 days old (overdue); row 2 stays fresh.
	backdateInviterRebateForTest(t, ledgers[0].Id, 31)

	expired, err := ExpireInviterRebateLocks(300)
	require.NoError(t, err)
	assert.Equal(t, 1, expired)

	ledgers = listInviterRebatesForTest(t)
	assert.Equal(t, InviterRebateStatusVoided, ledgers[0].Status)
	assert.Equal(t, InviterRebateVoidedLockExpired, ledgers[0].VoidedReason)
	assert.Empty(t, ledgers[0].LockedReason)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[1].Status)
	assert.Equal(t, rebate, reloadUserForTest(t, inviter.Id).AffQuotaLocked)
	assert.EqualValues(t, 1, countLockExpiryAdminLogsForTest(t))

	// Reaching the consume threshold still releases the surviving row only.
	UpdateUserUsedQuotaAndRequestCount(invitee.Id, creditedQuota*3/5)
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, rebate, updatedInviter.AffQuota)
	assert.Zero(t, updatedInviter.AffQuotaLocked)
}

// TestInviterRebateLockExpiryNeverVoidsSelfInviteSuspect: self-invite
// suspicion rows are locked for manual review (decision 2) and must survive
// the expiry sweep no matter how old they are.
func TestInviterRebateLockExpiryNeverVoidsSelfInviteSuspect(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	setInviterRebateLockExpiryForTest(t, 1)

	inviter, invitee := createRebateUsersForTest(t)
	insertUserSessionForTest(t, invitee.Id, "203.0.113.40", 0)
	insertUserSessionForTest(t, inviter.Id, "203.0.113.40", 0)
	rechargeForTest(t, invitee.Id, "rebate-epay-expiry-suspect")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	require.Equal(t, InviterRebateLockedSelfInviteSuspect, ledgers[0].LockedReason)
	backdateInviterRebateForTest(t, ledgers[0].Id, 10)

	expired, err := ExpireInviterRebateLocks(300)
	require.NoError(t, err)
	assert.Zero(t, expired)

	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateLockedSelfInviteSuspect, ledgers[0].LockedReason)
	assert.NotZero(t, reloadUserForTest(t, inviter.Id).AffQuotaLocked)
	assert.Zero(t, countLockExpiryAdminLogsForTest(t))
}

// TestInviterRebateLockExpiryDisabledNoop: 0 (the default) means locked
// rebates never expire — the sweep is a no-op even for very old rows.
func TestInviterRebateLockExpiryDisabledNoop(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	setInviterRebateConsumeUnlockForTest(t, creditedQuota*3/5)
	setInviterRebateLockExpiryForTest(t, 0)

	_, invitee := createRebateUsersForTest(t)
	rechargeForTest(t, invitee.Id, "rebate-epay-expiry-off")
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	backdateInviterRebateForTest(t, ledgers[0].Id, 365)

	expired, err := ExpireInviterRebateLocks(300)
	require.NoError(t, err)
	assert.Zero(t, expired)

	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateLockedAwaitingConsume, ledgers[0].LockedReason)
	assert.Zero(t, countLockExpiryAdminLogsForTest(t))
}

// TestInviterRebateLockExpiryWithInviterHardDeleted: an overdue row whose
// inviter was hard-deleted is still voided (the ledger record matters), and
// the missing user update is not an error.
func TestInviterRebateLockExpiryWithInviterHardDeleted(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 10)
	creditedQuota := int(1 * common.QuotaPerUnit)
	setInviterRebateConsumeUnlockForTest(t, creditedQuota*3/5)
	setInviterRebateLockExpiryForTest(t, 7)

	inviter, invitee := createRebateUsersForTest(t)
	rechargeForTest(t, invitee.Id, "rebate-epay-expiry-gone")
	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	backdateInviterRebateForTest(t, ledgers[0].Id, 8)
	require.NoError(t, DB.Unscoped().Where("id = ?", inviter.Id).Delete(&User{}).Error)

	expired, err := ExpireInviterRebateLocks(300)
	require.NoError(t, err)
	assert.Equal(t, 1, expired)

	ledgers = listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, InviterRebateStatusVoided, ledgers[0].Status)
	assert.Equal(t, InviterRebateVoidedLockExpired, ledgers[0].VoidedReason)
	assert.EqualValues(t, 1, countLockExpiryAdminLogsForTest(t), "the void is still logged for the ledger trail even though no pool was lowered")
}

func setInviterRebateFirstTopUpPercentForTest(t *testing.T, percent int) {
	t.Helper()
	original := common.InviterRebateFirstTopUpPercent
	t.Cleanup(func() {
		common.InviterRebateFirstTopUpPercent = original
	})
	common.InviterRebateFirstTopUpPercent = percent
}

// TestInviterRebateFirstTopUpPercent: the invitee's first successful top-up
// is rebated at the first-top-up percent (ledger snapshots it), the second
// falls back to the regular percent.
func TestInviterRebateFirstTopUpPercent(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 5)
	setInviterRebateFirstTopUpPercentForTest(t, 15)
	inviter, invitee := createRebateUsersForTest(t)

	creditedQuota := rechargeForTest(t, invitee.Id, "rebate-first-1")
	firstRebate := creditedQuota * 15 / 100
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate, updatedInviter.AffQuota)

	rechargeForTest(t, invitee.Id, "rebate-first-2")
	secondRebate := creditedQuota * 5 / 100
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate+secondRebate, updatedInviter.AffQuota)

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	assert.Equal(t, 15, ledgers[0].Percent)
	assert.Equal(t, firstRebate, ledgers[0].Quota)
	assert.Equal(t, InviterRebateStatusReleased, ledgers[0].Status)
	assert.Equal(t, 5, ledgers[1].Percent)
	assert.Equal(t, secondRebate, ledgers[1].Quota)
}

// TestInviterRebateFirstTopUpPercentWithBaseZero: with the regular percent
// disabled, only the first top-up earns a rebate; later ones get nothing and
// leave no ledger row.
func TestInviterRebateFirstTopUpPercentWithBaseZero(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 0)
	setInviterRebateFirstTopUpPercentForTest(t, 15)
	inviter, invitee := createRebateUsersForTest(t)

	creditedQuota := rechargeForTest(t, invitee.Id, "rebate-first-only-1")
	firstRebate := creditedQuota * 15 / 100
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate, updatedInviter.AffQuota)

	rechargeForTest(t, invitee.Id, "rebate-first-only-2")
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate, updatedInviter.AffQuota, "second top-up must not earn a rebate when the regular percent is 0")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, 15, ledgers[0].Percent)
}

// TestInviterRebateFirstTopUpPercentNotForRedemption: redemption rebates
// never use the first-top-up percent, even before any top-up exists.
func TestInviterRebateFirstTopUpPercentNotForRedemption(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 5)
	setInviterRebateFirstTopUpPercentForTest(t, 15)
	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.AutoMigrate(&Redemption{}))
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Redemption{}).Error)
	t.Cleanup(func() {
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Redemption{}).Error)
	})

	redemption := &Redemption{
		Id:          1,
		Key:         "rebate-first-redemption-key1",
		Status:      common.RedemptionCodeStatusEnabled,
		Quota:       1000,
		ExpiredTime: 0,
	}
	require.NoError(t, DB.Create(redemption).Error)

	_, err := Redeem(redemption.Key, invitee.Id)
	require.NoError(t, err)

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 50, updatedInviter.AffQuota, "redemption rebate uses the regular 5%, not the first-top-up 15%")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, 5, ledgers[0].Percent)
	assert.Equal(t, InviterRebateSourceRedemption, ledgers[0].SourceType)
}

// TestInviterRebateFirstTopUpPercentOnLockedRow: the effective (first-top-up)
// percent is snapshotted on locked ledger rows too, and the locked amount is
// computed from it.
func TestInviterRebateFirstTopUpPercentOnLockedRow(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 5)
	setInviterRebateFirstTopUpPercentForTest(t, 15)
	creditedQuota := int(1 * common.QuotaPerUnit)
	setInviterRebateConsumeUnlockForTest(t, creditedQuota*3/5)
	inviter, invitee := createRebateUsersForTest(t)

	rechargeForTest(t, invitee.Id, "rebate-first-locked-1")

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota)
	assert.Equal(t, creditedQuota*15/100, updatedInviter.AffQuotaLocked, "locked amount uses the first-top-up percent")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, 15, ledgers[0].Percent)
	assert.Equal(t, InviterRebateStatusLocked, ledgers[0].Status)
	assert.Equal(t, InviterRebateLockedAwaitingConsume, ledgers[0].LockedReason)
}

func setInviterRebateTiersForTest(t *testing.T, tiersJSON string) {
	t.Helper()
	cfg := config.GlobalConfig.Get("inviter_rebate_setting")
	require.NotNil(t, cfg)
	require.NoError(t, config.UpdateConfigFromMap(cfg, map[string]string{"tiers": tiersJSON}))
	t.Cleanup(func() {
		_ = config.UpdateConfigFromMap(cfg, map[string]string{"tiers": "[]"})
	})
}

func setInviterAffCountForTest(t *testing.T, inviterId, affCount int) {
	t.Helper()
	require.NoError(t, DB.Model(&User{}).Where("id = ?", inviterId).Update("aff_count", affCount).Error)
}

// TestInviterRebateTiers: tiers replace the flat percent; the inviter's
// aff_count picks the highest tier whose min_invitees it meets, and upgrading
// the tier affects later rebates without touching already-granted ones.
func TestInviterRebateTiers(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 0)
	setInviterRebateTiersForTest(t, `[{"min_invitees":0,"percent":5},{"min_invitees":6,"percent":10}]`)
	inviter, invitee := createRebateUsersForTest(t)
	setInviterAffCountForTest(t, inviter.Id, 3)

	creditedQuota := rechargeForTest(t, invitee.Id, "rebate-tier-1")
	firstRebate := creditedQuota * 5 / 100
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate, updatedInviter.AffQuota)

	// 升档：邀请人数达到 7，落在 6–∞ 档，后续返利按 10%，已发的不追溯
	setInviterAffCountForTest(t, inviter.Id, 7)
	rechargeForTest(t, invitee.Id, "rebate-tier-2")
	secondRebate := creditedQuota * 10 / 100
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate+secondRebate, updatedInviter.AffQuota)

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	assert.Equal(t, 5, ledgers[0].Percent)
	assert.Equal(t, firstRebate, ledgers[0].Quota)
	assert.Equal(t, 10, ledgers[1].Percent)
	assert.Equal(t, secondRebate, ledgers[1].Quota)
}

// TestInviterRebateTiersBelowLowest: an inviter below the lowest tier earns
// nothing, and tiers fully replace the flat percent rather than merging with
// it — the flat fallback only applies when no tiers are configured.
func TestInviterRebateTiersBelowLowest(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 5)
	setInviterRebateTiersForTest(t, `[{"min_invitees":6,"percent":10}]`)
	inviter, invitee := createRebateUsersForTest(t)
	setInviterAffCountForTest(t, inviter.Id, 3)

	rechargeForTest(t, invitee.Id, "rebate-tier-below-1")

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, updatedInviter.AffQuota, "below the lowest tier the rebate is 0 even with a flat percent configured")

	ledgers := listInviterRebatesForTest(t)
	assert.Empty(t, ledgers)
}

// TestInviterRebateFirstTopUpMaxWithTiers: the first top-up takes the larger
// of the first-top-up percent and the tier percent.
func TestInviterRebateFirstTopUpMaxWithTiers(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 0)
	setInviterRebateFirstTopUpPercentForTest(t, 15)
	setInviterRebateTiersForTest(t, `[{"min_invitees":0,"percent":10}]`)
	inviter, invitee := createRebateUsersForTest(t)

	creditedQuota := rechargeForTest(t, invitee.Id, "rebate-tier-max-1")
	firstRebate := creditedQuota * 15 / 100
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate, updatedInviter.AffQuota)

	rechargeForTest(t, invitee.Id, "rebate-tier-max-2")
	secondRebate := creditedQuota * 10 / 100
	updatedInviter = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, firstRebate+secondRebate, updatedInviter.AffQuota)

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 2)
	assert.Equal(t, 15, ledgers[0].Percent, "first top-up: max(15, tier 10) = 15")
	assert.Equal(t, 10, ledgers[1].Percent, "later top-ups fall back to the tier percent")
}

// TestInviterRebateFirstTopUpBelowTierUsesTier: a first-top-up percent lower
// than the tier percent never reduces the rebate — the bonus is a max, not an
// override.
func TestInviterRebateFirstTopUpBelowTierUsesTier(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 0)
	setInviterRebateFirstTopUpPercentForTest(t, 5)
	setInviterRebateTiersForTest(t, `[{"min_invitees":0,"percent":10}]`)
	inviter, invitee := createRebateUsersForTest(t)

	creditedQuota := rechargeForTest(t, invitee.Id, "rebate-tier-floor-1")
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, creditedQuota*10/100, updatedInviter.AffQuota, "first top-up: max(5, tier 10) = 10")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, 10, ledgers[0].Percent)
}

// TestInviterRebateTiersApplyToRedemption: redemption rebates use the tier
// percent as their regular percent.
func TestInviterRebateTiersApplyToRedemption(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 5)
	setInviterRebateTiersForTest(t, `[{"min_invitees":0,"percent":10}]`)
	inviter, invitee := createRebateUsersForTest(t)
	require.NoError(t, DB.AutoMigrate(&Redemption{}))
	require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Redemption{}).Error)
	t.Cleanup(func() {
		require.NoError(t, DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Unscoped().Delete(&Redemption{}).Error)
	})

	redemption := &Redemption{
		Id:          1,
		Key:         "rebate-tier-redemption-key1",
		Status:      common.RedemptionCodeStatusEnabled,
		Quota:       1000,
		ExpiredTime: 0,
	}
	require.NoError(t, DB.Create(redemption).Error)

	_, err := Redeem(redemption.Key, invitee.Id)
	require.NoError(t, err)

	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 100, updatedInviter.AffQuota, "redemption rebate uses the tier 10%, not the flat 5%")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, 10, ledgers[0].Percent)
}

// TestInviterRebateTiersInvalidFallsBackToFlat: tier config that bypassed
// API validation (semantically invalid, written straight to the store) is
// ignored at rebate time and the flat percent keeps paying.
func TestInviterRebateTiersInvalidFallsBackToFlat(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	setInviterRebatePercentForTest(t, 5)
	setInviterRebateTiersForTest(t, `[{"min_invitees":6,"percent":10},{"min_invitees":6,"percent":20}]`)
	inviter, invitee := createRebateUsersForTest(t)
	setInviterAffCountForTest(t, inviter.Id, 7)

	creditedQuota := rechargeForTest(t, invitee.Id, "rebate-tier-invalid-1")
	updatedInviter := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, creditedQuota*5/100, updatedInviter.AffQuota, "invalid tiers degrade to the flat percent")

	ledgers := listInviterRebatesForTest(t)
	require.Len(t, ledgers, 1)
	assert.Equal(t, 5, ledgers[0].Percent)
}

// --- P3.1 管理端排行榜 ---

// insertRebateLedgerRowForTest 直接插入台账行（绕过充值路径），控制
// status/created_at 以构造排行聚合的输入。source_id 递增以满足
// (inviter_id, source_type, source_id) 唯一索引。
func insertRebateLedgerRowForTest(t *testing.T, inviterId, inviteeId int, sourceType string, sourceId int, quota int, status string, createdAt int64) {
	t.Helper()
	require.NoError(t, DB.Create(&InviterRebate{
		CreatedAt:  createdAt,
		InviterId:  inviterId,
		InviteeId:  inviteeId,
		SourceType: sourceType,
		SourceId:   sourceId,
		BaseQuota:  quota * 10,
		Percent:    10,
		Quota:      quota,
		Status:     status,
	}).Error)
}

func createRankingUserForTest(t *testing.T, username string, affCount int) *User {
	t.Helper()
	user := &User{
		Username: username,
		AffCode:  "RK" + strings.ToUpper(strings.ReplaceAll(username, "-", "")),
		Status:   common.UserStatusEnabled,
		AffCount: affCount,
	}
	require.NoError(t, DB.Create(user).Error)
	return user
}

// TestInviterRebateRankingPeriodStart: 排行周期起点按自然月/季/年对齐，
// all 不过滤（起点 0）。固定 now 断言，不受运行日期影响。
func TestInviterRebateRankingPeriodStart(t *testing.T) {
	now := time.Date(2026, 11, 19, 10, 30, 0, 0, time.UTC)
	utc := func(year int, month time.Month) int64 {
		return time.Date(year, month, 1, 0, 0, 0, 0, time.UTC).Unix()
	}
	assert.Equal(t, utc(2026, 11), inviterRebateRankingPeriodStart(InviterRebateRankingPeriodMonth, now))
	assert.Equal(t, utc(2026, 10), inviterRebateRankingPeriodStart(InviterRebateRankingPeriodQuarter, now))
	assert.Equal(t, utc(2026, 1), inviterRebateRankingPeriodStart(InviterRebateRankingPeriodYear, now))
	assert.Zero(t, inviterRebateRankingPeriodStart(InviterRebateRankingPeriodAll, now))

	// 跨年边界：2 月属 Q1，起点为 1 月。
	feb := time.Date(2027, 2, 10, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, utc(2027, 1), inviterRebateRankingPeriodStart(InviterRebateRankingPeriodQuarter, feb))
}

// TestInviterRebateRankingsAggregation: granted = released + locked（voided
// 单列不计入），行内带出用户信息与 aff_count、invitee_count（周期内产生
// 过台账行的被邀请人数）；两种 metric 的排序各自正确。
func TestInviterRebateRankingsAggregation(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	inviter2 := createRankingUserForTest(t, "rank-inviter-2", 9)
	inviter3 := createRankingUserForTest(t, "rank-inviter-3", 12)
	invitee2 := createRankingUserForTest(t, "rank-invitee-2", 0)
	invitee3 := createRankingUserForTest(t, "rank-invitee-3", 0)
	setInviterAffCountForTest(t, inviter.Id, 3)

	now := time.Now()
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 100, InviterRebateStatusReleased, now.Unix())
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 2, 50, InviterRebateStatusLocked, now.Unix())
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 3, 30, InviterRebateStatusVoided, now.Unix())
	insertRebateLedgerRowForTest(t, inviter2.Id, invitee2.Id, InviterRebateSourceTopUp, 4, 80, InviterRebateStatusReleased, now.Unix())
	// inviter3 邀的人数最多（2 个被邀请人）但返利额最小。
	insertRebateLedgerRowForTest(t, inviter3.Id, invitee2.Id, InviterRebateSourceTopUp, 5, 10, InviterRebateStatusReleased, now.Unix())
	insertRebateLedgerRowForTest(t, inviter3.Id, invitee3.Id, InviterRebateSourceTopUp, 6, 10, InviterRebateStatusLocked, now.Unix())

	// metric=rebate：granted 口径排序 150 / 80 / 20。
	rows, total, err := GetInviterRebateRankings(InviterRebateRankingMetricRebate, InviterRebateRankingPeriodMonth, 1, 10, now)
	require.NoError(t, err)
	assert.EqualValues(t, 3, total)
	require.Len(t, rows, 3)

	assert.Equal(t, inviter.Id, rows[0].InviterId)
	assert.Equal(t, "rebate-inviter", rows[0].Username)
	assert.Equal(t, 3, rows[0].AffCount)
	assert.EqualValues(t, 3, rows[0].RebateCount)
	assert.EqualValues(t, 1, rows[0].InviteeCount)
	assert.EqualValues(t, 100, rows[0].ReleasedQuota)
	assert.EqualValues(t, 50, rows[0].LockedQuota)
	assert.EqualValues(t, 30, rows[0].VoidedQuota)
	assert.EqualValues(t, 150, rows[0].GrantedQuota, "granted = released + locked, voided excluded")

	assert.Equal(t, inviter2.Id, rows[1].InviterId)
	assert.EqualValues(t, 80, rows[1].GrantedQuota)
	assert.Equal(t, inviter3.Id, rows[2].InviterId)
	assert.EqualValues(t, 20, rows[2].GrantedQuota)

	// metric=invitees：按周期内被邀请人数排序 2 / 1 / 1，并列按 inviter_id 升序。
	rows, total, err = GetInviterRebateRankings(InviterRebateRankingMetricInvitees, InviterRebateRankingPeriodMonth, 1, 10, now)
	require.NoError(t, err)
	assert.EqualValues(t, 3, total)
	require.Len(t, rows, 3)
	assert.Equal(t, inviter3.Id, rows[0].InviterId)
	assert.EqualValues(t, 2, rows[0].InviteeCount)
	// inviter 与 inviter2 各 1 人并列，按 id 升序（fixture 邀请人先创建，id 更小）。
	assert.Equal(t, inviter.Id, rows[1].InviterId)
	assert.Equal(t, inviter2.Id, rows[2].InviterId)
}

// TestInviterRebateRankingsPeriodFilter: 周期外的台账行不参与聚合；all
// 不过滤。旧行放在年初前一天，保证早于月/季/年任一起点，不受运行日期
// 影响（季起点/月起点必然不早于年起点）。
func TestInviterRebateRankingsPeriodFilter(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	inviterOld := createRankingUserForTest(t, "rank-inviter-old", 0)
	inviteeOld := createRankingUserForTest(t, "rank-invitee-old", 0)

	now := time.Now()
	yearStart := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
	oldAt := yearStart.Unix() - 86400

	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 40, InviterRebateStatusReleased, now.Unix())
	// 年初前一天的大额行：任何周期口径（除 all）都应被排除。
	insertRebateLedgerRowForTest(t, inviterOld.Id, inviteeOld.Id, InviterRebateSourceTopUp, 2, 400, InviterRebateStatusReleased, oldAt)

	for _, period := range []string{InviterRebateRankingPeriodMonth, InviterRebateRankingPeriodQuarter, InviterRebateRankingPeriodYear} {
		rows, total, err := GetInviterRebateRankings(InviterRebateRankingMetricRebate, period, 1, 10, now)
		require.NoError(t, err, "period=%s", period)
		assert.EqualValues(t, 1, total, "period=%s should exclude last-year rows", period)
		require.Len(t, rows, 1, "period=%s", period)
		assert.Equal(t, inviter.Id, rows[0].InviterId)
		assert.EqualValues(t, 40, rows[0].GrantedQuota, "period=%s", period)
	}

	rows, total, err := GetInviterRebateRankings(InviterRebateRankingMetricRebate, InviterRebateRankingPeriodAll, 1, 10, now)
	require.NoError(t, err)
	assert.EqualValues(t, 2, total)
	require.Len(t, rows, 2)
	assert.Equal(t, inviterOld.Id, rows[0].InviterId, "all period keeps the larger old row on top")
	assert.EqualValues(t, 400, rows[0].GrantedQuota)
	assert.EqualValues(t, 40, rows[1].GrantedQuota)
}

// TestInviterRebateRankingsPagination: 分页基于聚合后的邀请人行数。
func TestInviterRebateRankingsPagination(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	inviter2 := createRankingUserForTest(t, "rank-inviter-2", 0)
	inviter3 := createRankingUserForTest(t, "rank-inviter-3", 0)

	now := time.Now()
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 300, InviterRebateStatusReleased, now.Unix())
	insertRebateLedgerRowForTest(t, inviter2.Id, invitee.Id, InviterRebateSourceTopUp, 2, 200, InviterRebateStatusReleased, now.Unix())
	insertRebateLedgerRowForTest(t, inviter3.Id, invitee.Id, InviterRebateSourceTopUp, 3, 100, InviterRebateStatusReleased, now.Unix())

	rows, total, err := GetInviterRebateRankings(InviterRebateRankingMetricRebate, InviterRebateRankingPeriodAll, 1, 2, now)
	require.NoError(t, err)
	assert.EqualValues(t, 3, total)
	require.Len(t, rows, 2)
	assert.Equal(t, inviter.Id, rows[0].InviterId)
	assert.Equal(t, inviter2.Id, rows[1].InviterId)

	rows, total, err = GetInviterRebateRankings(InviterRebateRankingMetricRebate, InviterRebateRankingPeriodAll, 2, 2, now)
	require.NoError(t, err)
	assert.EqualValues(t, 3, total)
	require.Len(t, rows, 1)
	assert.Equal(t, inviter3.Id, rows[0].InviterId)
}

// TestInviterRebateRankingsInviterHardDeleted: 邀请人被硬删后行保留，
// 用户信息为空，管理员仍可按 inviter_id 追账。
func TestInviterRebateRankingsInviterHardDeleted(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)

	now := time.Now()
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 70, InviterRebateStatusReleased, now.Unix())
	require.NoError(t, DB.Unscoped().Delete(&User{}, inviter.Id).Error)

	rows, total, err := GetInviterRebateRankings(InviterRebateRankingMetricRebate, InviterRebateRankingPeriodAll, 1, 10, now)
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	require.Len(t, rows, 1)
	assert.Equal(t, inviter.Id, rows[0].InviterId)
	assert.Empty(t, rows[0].Username)
	assert.Empty(t, rows[0].DisplayName)
	assert.Zero(t, rows[0].AffCount)
	assert.EqualValues(t, 70, rows[0].GrantedQuota)
}

// TestInviterRebateRankingsEmpty: 无台账数据时返回空列表与 0 总数。
func TestInviterRebateRankingsEmpty(t *testing.T) {
	createRebateUsersForTest(t)

	rows, total, err := GetInviterRebateRankings(InviterRebateRankingMetricRebate, InviterRebateRankingPeriodMonth, 1, 10, time.Now())
	require.NoError(t, err)
	assert.Zero(t, total)
	assert.Empty(t, rows)
}

// ---------------------------------------------------------------------------
// P4.1 A 侧钱包看板查询
// ---------------------------------------------------------------------------

// TestInviterRebateSelfSummaryAggregation: 汇总按状态分桶（granted =
// released + locked，voided 单列），带出笔数/被邀请人数与阶梯进度。
func TestInviterRebateSelfSummaryAggregation(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	invitee2 := createRankingUserForTest(t, "self-invitee-2", 0)
	setInviterAffCountForTest(t, inviter.Id, 7)
	setInviterRebateTiersForTest(t, `[{"min_invitees":0,"percent":5},{"min_invitees":6,"percent":10},{"min_invitees":21,"percent":15}]`)

	now := time.Now()
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 100, InviterRebateStatusReleased, now.Unix())
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 2, 60, InviterRebateStatusLocked, now.Unix())
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 3, 30, InviterRebateStatusVoided, now.Unix())
	insertRebateLedgerRowForTest(t, inviter.Id, invitee2.Id, InviterRebateSourceRedemption, 1, 40, InviterRebateStatusLocked, now.Unix())

	summary, err := GetInviterRebateSelfSummary(inviter.Id)
	require.NoError(t, err)
	assert.EqualValues(t, 100, summary.ReleasedQuota)
	assert.EqualValues(t, 100, summary.LockedQuota, "locked = 60 + 40 across two invitees")
	assert.EqualValues(t, 30, summary.VoidedQuota)
	assert.EqualValues(t, 200, summary.GrantedQuota, "granted = released + locked, voided excluded")
	assert.EqualValues(t, 4, summary.RebateCount)
	assert.EqualValues(t, 2, summary.InviteeCount)
	assert.Equal(t, 7, summary.Tier.AffCount)
	assert.Equal(t, 10, summary.Tier.CurrentPercent)
	assert.Equal(t, 21, summary.Tier.NextMinInvitees)
	assert.Equal(t, 15, summary.Tier.NextPercent)
}

// TestInviterRebateSelfSummaryEmpty: 无台账时返回全零汇总（不报错），
// 阶梯关闭时当前比例回退扁平 InviterRebatePercent。
func TestInviterRebateSelfSummaryEmpty(t *testing.T) {
	inviter, _ := createRebateUsersForTest(t)
	setInviterRebateTiersForTest(t, `[]`)
	setInviterRebatePercentForTest(t, 12)
	setInviterAffCountForTest(t, inviter.Id, 3)

	summary, err := GetInviterRebateSelfSummary(inviter.Id)
	require.NoError(t, err)
	assert.Zero(t, summary.ReleasedQuota)
	assert.Zero(t, summary.LockedQuota)
	assert.Zero(t, summary.VoidedQuota)
	assert.Zero(t, summary.GrantedQuota)
	assert.Zero(t, summary.RebateCount)
	assert.Zero(t, summary.InviteeCount)
	assert.Equal(t, 3, summary.Tier.AffCount)
	assert.Equal(t, 12, summary.Tier.CurrentPercent, "no tiers → flat InviterRebatePercent")
	assert.Zero(t, summary.Tier.NextMinInvitees)
	assert.Zero(t, summary.Tier.NextPercent)
}

// TestInviterRebateSelfSummaryInviterHardDeleted: 邀请人被硬删后台账行
// 仍可聚合（管理员视角排查用），aff_count 查询取不到按 0 处理、阶梯落到
// 最低档，不报错。
func TestInviterRebateSelfSummaryInviterHardDeleted(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	setInviterAffCountForTest(t, inviter.Id, 30)
	setInviterRebateTiersForTest(t, `[{"min_invitees":0,"percent":5},{"min_invitees":6,"percent":10}]`)

	now := time.Now()
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 70, InviterRebateStatusReleased, now.Unix())
	require.NoError(t, DB.Unscoped().Delete(&User{}, inviter.Id).Error)

	summary, err := GetInviterRebateSelfSummary(inviter.Id)
	require.NoError(t, err)
	assert.EqualValues(t, 70, summary.GrantedQuota)
	assert.Zero(t, summary.Tier.AffCount, "hard-deleted inviter → aff_count lookup misses, falls back to 0")
	assert.Equal(t, 5, summary.Tier.CurrentPercent)
}

// TestInviterRebateTierProgress: 阶梯进度解析的各分支——无阶梯回退扁平
// 比例、低于最低档当前 0、中间档带下一档、顶档无下一档。
func TestInviterRebateTierProgress(t *testing.T) {
	// 无阶梯：当前比例取扁平 InviterRebatePercent，无下一档。
	setInviterRebateTiersForTest(t, `[]`)
	setInviterRebatePercentForTest(t, 8)
	p := inviterRebateTierProgress(3)
	assert.Equal(t, 3, p.AffCount)
	assert.Equal(t, 8, p.CurrentPercent)
	assert.Zero(t, p.NextMinInvitees)
	assert.Zero(t, p.NextPercent)

	setInviterRebateTiersForTest(t, `[{"min_invitees":2,"percent":5},{"min_invitees":6,"percent":10},{"min_invitees":21,"percent":15}]`)

	// 低于最低档：无档命中，当前比例 0，下一档为最低档。
	p = inviterRebateTierProgress(1)
	assert.Zero(t, p.CurrentPercent)
	assert.Equal(t, 2, p.NextMinInvitees)
	assert.Equal(t, 5, p.NextPercent)

	// 中间档：命中 6–∞ 档，下一档 21。
	p = inviterRebateTierProgress(6)
	assert.Equal(t, 10, p.CurrentPercent)
	assert.Equal(t, 21, p.NextMinInvitees)
	assert.Equal(t, 15, p.NextPercent)

	// 顶档：已到最高档，无下一档。
	p = inviterRebateTierProgress(30)
	assert.Equal(t, 15, p.CurrentPercent)
	assert.Zero(t, p.NextMinInvitees)
	assert.Zero(t, p.NextPercent)
}

// TestInviterRebateInvitees: 下线贡献列表按贡献总额降序、并列按
// invitee_id 升序，用户名脱敏，不混入其他邀请人的行；分页基于去重后的
// 被邀请人数。
func TestInviterRebateInvitees(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	longName := createRankingUserForTest(t, "longusername", 0)
	cjkName := createRankingUserForTest(t, "张三丰", 0)
	shortName := createRankingUserForTest(t, "ab", 0)
	otherInviter := createRankingUserForTest(t, "self-other-inviter", 0)

	now := time.Now()
	// invitee：granted 150（100 released + 50 locked）。
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 100, InviterRebateStatusReleased, now.Unix())
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 2, 50, InviterRebateStatusLocked, now.Unix())
	// longName：granted 80。
	insertRebateLedgerRowForTest(t, inviter.Id, longName.Id, InviterRebateSourceTopUp, 3, 80, InviterRebateStatusReleased, now.Unix())
	// cjkName 与 shortName 并列 granted 60，按 invitee_id 升序（创建顺序
	// cjkName 在 shortName 之前，id 更小）。
	insertRebateLedgerRowForTest(t, inviter.Id, cjkName.Id, InviterRebateSourceTopUp, 4, 60, InviterRebateStatusReleased, now.Unix())
	insertRebateLedgerRowForTest(t, inviter.Id, shortName.Id, InviterRebateSourceTopUp, 5, 60, InviterRebateStatusReleased, now.Unix())
	// 其他邀请人的行不得混入。
	insertRebateLedgerRowForTest(t, otherInviter.Id, invitee.Id, InviterRebateSourceTopUp, 6, 999, InviterRebateStatusReleased, now.Unix())

	rows, total, err := GetInviterRebateInvitees(inviter.Id, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 4, total)
	require.Len(t, rows, 4)

	assert.Equal(t, "re***e", rows[0].InviteeMaskedName, "13-rune username keeps first 2 + last")
	assert.EqualValues(t, 2, rows[0].RebateCount)
	assert.EqualValues(t, 100, rows[0].ReleasedQuota)
	assert.EqualValues(t, 50, rows[0].LockedQuota)
	assert.Zero(t, rows[0].VoidedQuota)
	assert.EqualValues(t, 150, rows[0].GrantedQuota)

	assert.Equal(t, "lo***e", rows[1].InviteeMaskedName)
	assert.EqualValues(t, 80, rows[1].GrantedQuota)

	assert.Equal(t, "张***丰", rows[2].InviteeMaskedName, "CJK username masks by rune, not byte")
	assert.EqualValues(t, 60, rows[2].GrantedQuota)

	assert.Equal(t, "a***", rows[3].InviteeMaskedName, "2-rune username only keeps the first rune")
	assert.EqualValues(t, 60, rows[3].GrantedQuota)

	// 分页：每页 2，第 2 页是并列组的后一名与 shortName。
	rows, total, err = GetInviterRebateInvitees(inviter.Id, 2, 2)
	require.NoError(t, err)
	assert.EqualValues(t, 4, total)
	require.Len(t, rows, 2)
	assert.Equal(t, "张***丰", rows[0].InviteeMaskedName)
	assert.Equal(t, "a***", rows[1].InviteeMaskedName)
}

// TestInviterRebateInviteesHardDeletedInvitee: 被邀请人被硬删后行保留，
// 脱敏名为空（前端显示"已注销用户"），金额照常聚合。
func TestInviterRebateInviteesHardDeletedInvitee(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)

	now := time.Now()
	insertRebateLedgerRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 70, InviterRebateStatusReleased, now.Unix())
	require.NoError(t, DB.Unscoped().Delete(&User{}, invitee.Id).Error)

	rows, total, err := GetInviterRebateInvitees(inviter.Id, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	require.Len(t, rows, 1)
	assert.Empty(t, rows[0].InviteeMaskedName)
	assert.EqualValues(t, 70, rows[0].GrantedQuota)
}

// TestInviterRebateInviteesEmpty: 无台账数据时返回空列表与 0 总数。
func TestInviterRebateInviteesEmpty(t *testing.T) {
	inviter, _ := createRebateUsersForTest(t)

	rows, total, err := GetInviterRebateInvitees(inviter.Id, 1, 10)
	require.NoError(t, err)
	assert.Zero(t, total)
	assert.Empty(t, rows)
}

// TestMaskInviteeUsername: 脱敏函数的边界——空串、极短名只留首字符避免
// 被穷举还原，中文按 rune 切分。
func TestMaskInviteeUsername(t *testing.T) {
	assert.Equal(t, "", maskInviteeUsername(""))
	assert.Equal(t, "a***", maskInviteeUsername("a"))
	assert.Equal(t, "a***", maskInviteeUsername("ab"))
	assert.Equal(t, "a***c", maskInviteeUsername("abc"))
	assert.Equal(t, "a***e", maskInviteeUsername("abcde"))
	assert.Equal(t, "ab***f", maskInviteeUsername("abcdef"))
	assert.Equal(t, "张***", maskInviteeUsername("张三"))
	assert.Equal(t, "张***丰", maskInviteeUsername("张三丰"))
	assert.Equal(t, "王***六", maskInviteeUsername("王小明六"))
}

// insertRebateLedgerReasonRowForTest 与 insertRebateLedgerRowForTest 相同，
// 但允许指定 locked_reason / voided_reason（台账汇总的自邀嫌疑列需要）。
// 返回新行的 id（SQLite AUTOINCREMENT 跨测试单调递增，调用方不能假设
// 绝对 id，只能用返回值断言顺序）。
func insertRebateLedgerReasonRowForTest(t *testing.T, inviterId, inviteeId int, sourceType string, sourceId, quota int, status, lockedReason, voidedReason string, createdAt int64) int {
	t.Helper()
	row := &InviterRebate{
		CreatedAt:    createdAt,
		InviterId:    inviterId,
		InviteeId:    inviteeId,
		SourceType:   sourceType,
		SourceId:     sourceId,
		BaseQuota:    quota * 10,
		Percent:      10,
		Quota:        quota,
		Status:       status,
		LockedReason: lockedReason,
		VoidedReason: voidedReason,
	}
	require.NoError(t, DB.Create(row).Error)
	return row.Id
}

// TestInviterRebateLedgerList: 管理端台账流水按 id 倒序分页，带出邀请双方
// 用户名（硬删后为空串），五种筛选各自生效。
func TestInviterRebateLedgerList(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	inviter2 := createRankingUserForTest(t, "ledger-inviter-2", 0)

	day := int64(86400)
	base := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC).Unix()
	id1 := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 100, InviterRebateStatusReleased, "", "", base)
	id2 := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 2, 50, InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume, "", base+day)
	id3 := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceRedemption, 3, 30, InviterRebateStatusVoided, "", InviterRebateVoidedMonthlyCap, base+2*day)
	// inviter2 的行 + 邀请人已被硬删除的行（inviter id 不存在）。
	insertRebateLedgerReasonRowForTest(t, inviter2.Id, invitee.Id, InviterRebateSourceTopUp, 4, 80, InviterRebateStatusLocked, InviterRebateLockedSelfInviteSuspect, "", base+3*day)
	id5 := insertRebateLedgerReasonRowForTest(t, 999999, invitee.Id, InviterRebateSourceTopUp, 5, 60, InviterRebateStatusReleased, "", "", base+4*day)
	require.Less(t, id1, id5, "ids strictly increasing for ordering assertions")

	// 全量：id 倒序（最新在前），硬删邀请人 username 为空。
	rows, total, err := GetInviterRebateLedger(InviterRebateLedgerFilter{}, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 5, total)
	require.Len(t, rows, 5)
	assert.Equal(t, id5, rows[0].Id)
	assert.Equal(t, "", rows[0].InviterUsername, "hard-deleted inviter leaves empty username")
	assert.Equal(t, "rebate-invitee", rows[0].InviteeUsername)
	assert.Equal(t, id1, rows[4].Id)
	assert.Equal(t, "rebate-inviter", rows[4].InviterUsername)
	assert.Equal(t, InviterRebateStatusReleased, rows[4].Status)
	// 台账全字段带出（管理员可见原因）。
	assert.Equal(t, InviterRebateLockedSelfInviteSuspect, rows[1].LockedReason)
	assert.Equal(t, InviterRebateVoidedMonthlyCap, rows[2].VoidedReason)
	assert.Equal(t, 10, rows[4].Percent)
	assert.Equal(t, 1000, rows[4].BaseQuota)

	// inviter 筛选。
	rows, total, err = GetInviterRebateLedger(InviterRebateLedgerFilter{InviterId: inviter.Id}, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 3, total)
	require.Len(t, rows, 3)
	assert.Equal(t, inviter.Id, rows[0].InviterId)

	// invitee 筛选（所有行同一被邀请人，仍全量）。
	rows, total, err = GetInviterRebateLedger(InviterRebateLedgerFilter{InviteeId: invitee.Id}, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 5, total)

	// status 筛选。
	rows, total, err = GetInviterRebateLedger(InviterRebateLedgerFilter{Status: InviterRebateStatusLocked}, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 2, total)
	require.Len(t, rows, 2)
	assert.Equal(t, InviterRebateStatusLocked, rows[0].Status)
	assert.Equal(t, InviterRebateStatusLocked, rows[1].Status)

	// source_type 筛选。
	rows, total, err = GetInviterRebateLedger(InviterRebateLedgerFilter{SourceType: InviterRebateSourceRedemption}, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	assert.Equal(t, InviterRebateSourceRedemption, rows[0].SourceType)

	// 时间区间（闭区间，只含第 2~3 天的两行）。
	rows, total, err = GetInviterRebateLedger(InviterRebateLedgerFilter{StartTimestamp: base + day, EndTimestamp: base + 2*day}, 1, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 2, total)
	require.Len(t, rows, 2)
	assert.Equal(t, id3, rows[0].Id)
	assert.Equal(t, id2, rows[1].Id)

	// 分页：第 2 页每页 2 条，按倒序取第 3~4 新的行。
	rows, total, err = GetInviterRebateLedger(InviterRebateLedgerFilter{}, 2, 2)
	require.NoError(t, err)
	assert.EqualValues(t, 5, total)
	require.Len(t, rows, 2)
	assert.Equal(t, id3, rows[0].Id)
	assert.Equal(t, id2, rows[1].Id)
}

// TestInviterRebateLedgerSummary: 汇总卡片状态分桶 + 自邀嫌疑单独聚合，
// 筛选条件与流水列表共用；无匹配数据时返回全零。
func TestInviterRebateLedgerSummary(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)
	inviter2 := createRankingUserForTest(t, "ledger-sum-inviter-2", 0)

	day := int64(86400)
	base := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC).Unix()
	insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 100, InviterRebateStatusReleased, "", "", base)
	insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 2, 50, InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume, "", base+day)
	insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 3, 30, InviterRebateStatusVoided, "", InviterRebateVoidedMonthlyCap, base+2*day)
	insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 4, 20, InviterRebateStatusLocked, InviterRebateLockedSelfInviteSuspect, "", base+3*day)
	// inviter2 的行不参与 inviter 筛选口径，但参与全量口径。
	insertRebateLedgerReasonRowForTest(t, inviter2.Id, invitee.Id, InviterRebateSourceTopUp, 5, 80, InviterRebateStatusLocked, InviterRebateLockedSelfInviteSuspect, "", base+4*day)

	// 全量口径：released 100、locked 150、voided 30、granted 250；
	// 自邀嫌疑 2 笔共 100。
	summary, err := GetInviterRebateLedgerSummary(InviterRebateLedgerFilter{})
	require.NoError(t, err)
	assert.EqualValues(t, 5, summary.RebateCount)
	assert.EqualValues(t, 100, summary.ReleasedQuota)
	assert.EqualValues(t, 150, summary.LockedQuota)
	assert.EqualValues(t, 30, summary.VoidedQuota)
	assert.EqualValues(t, 250, summary.GrantedQuota)
	assert.EqualValues(t, 2, summary.SuspectCount)
	assert.EqualValues(t, 100, summary.SuspectLockedQuota)

	// inviter 筛选口径：嫌疑只剩 1 笔 20。
	summary, err = GetInviterRebateLedgerSummary(InviterRebateLedgerFilter{InviterId: inviter.Id})
	require.NoError(t, err)
	assert.EqualValues(t, 4, summary.RebateCount)
	assert.EqualValues(t, 70, summary.LockedQuota)
	assert.EqualValues(t, 1, summary.SuspectCount)
	assert.EqualValues(t, 20, summary.SuspectLockedQuota)

	// status 筛选只看 locked 行的嫌疑。
	summary, err = GetInviterRebateLedgerSummary(InviterRebateLedgerFilter{Status: InviterRebateStatusLocked})
	require.NoError(t, err)
	assert.EqualValues(t, 3, summary.RebateCount)
	assert.EqualValues(t, 150, summary.LockedQuota)
	assert.Zero(t, summary.ReleasedQuota)

	// 无匹配数据：全零不报错。
	summary, err = GetInviterRebateLedgerSummary(InviterRebateLedgerFilter{InviterId: 888888})
	require.NoError(t, err)
	assert.Equal(t, InviterRebateLedgerSummary{}, summary)
}

// setRebateUserAffFieldsForTest 直写邀请人的三个返利账户字段后回读。
func setRebateUserAffFieldsForTest(t *testing.T, userId, affQuota, affHistory, affQuotaLocked int) *User {
	t.Helper()
	require.NoError(t, DB.Model(&User{}).Where("id = ?", userId).Updates(map[string]any{
		"aff_quota":        affQuota,
		"aff_history":      affHistory,
		"aff_quota_locked": affQuotaLocked,
	}).Error)
	return reloadUserForTest(t, userId)
}

// TestInviterRebateAdminVoid: 管理员人工作废冻结返利——locked 行翻
// voided(admin_void) 并等额回落冻结池；邀请人已硬删除时作废照常；released /
// voided / 不存在的行返回状态前置错误。
func TestInviterRebateAdminVoid(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)

	// 正常分支：冻结池等额回落。
	setRebateUserAffFieldsForTest(t, inviter.Id, 0, 0, 100)
	id := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 100, InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume, "", 1000)
	result, err := AdminVoidInviterRebate(id)
	require.NoError(t, err)
	assert.Equal(t, id, result.Row.Id)
	assert.Equal(t, inviter.Id, result.InviterId)
	assert.Equal(t, 100, result.Quota)
	assert.Zero(t, result.Debt)
	assert.Equal(t, InviterRebateStatusVoided, result.Row.Status)
	assert.Equal(t, InviterRebateVoidedAdminVoid, result.Row.VoidedReason)
	assert.Empty(t, result.Row.LockedReason)
	after := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, after.AffQuotaLocked)
	assert.Zero(t, after.AffQuota)
	assert.Zero(t, after.AffHistoryQuota)

	// 幂等边界：再作废同一行 → 状态前置错误（不再动账）。
	_, err = AdminVoidInviterRebate(id)
	require.ErrorIs(t, err, ErrInviterRebateRowNotLocked)
	assert.Equal(t, 0, reloadUserForTest(t, inviter.Id).AffQuotaLocked)

	// 邀请人已硬删除：作废照常，冻结池无行可扣不报错。
	idGone := insertRebateLedgerReasonRowForTest(t, 999999, invitee.Id, InviterRebateSourceTopUp, 2, 60, InviterRebateStatusLocked, InviterRebateLockedSelfInviteSuspect, "", 1000)
	result, err = AdminVoidInviterRebate(idGone)
	require.NoError(t, err)
	assert.Equal(t, InviterRebateStatusVoided, result.Row.Status)
	assert.Equal(t, InviterRebateVoidedAdminVoid, result.Row.VoidedReason)
	assert.Equal(t, 60, result.Quota)

	// 状态前置错误：released / 不存在的行。
	idReleased := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 3, 30, InviterRebateStatusReleased, "", "", 1000)
	_, err = AdminVoidInviterRebate(idReleased)
	require.ErrorIs(t, err, ErrInviterRebateRowNotLocked)
	_, err = AdminVoidInviterRebate(888888)
	require.ErrorIs(t, err, ErrInviterRebateRowNotFound)
}

// TestInviterRebateAdminRelease: 管理员人工放行冻结返利——locked（含
// self_invite_suspect）行翻 released、邀请人 aff_quota/aff_history 入账、
// 冻结池回落；邀请人已硬删除改记 voided(inviter_missing)；released 行拒绝。
func TestInviterRebateAdminRelease(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)

	// 正常分支：自邀嫌疑行放行，资金动作与消费解锁一致。
	setRebateUserAffFieldsForTest(t, inviter.Id, 50, 200, 70)
	id := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 70, InviterRebateStatusLocked, InviterRebateLockedSelfInviteSuspect, "", 1000)
	result, err := AdminReleaseInviterRebate(id)
	require.NoError(t, err)
	assert.Equal(t, inviter.Id, result.InviterId)
	assert.Equal(t, 70, result.Quota)
	assert.Zero(t, result.Debt)
	assert.Equal(t, InviterRebateStatusReleased, result.Row.Status)
	assert.Empty(t, result.Row.LockedReason)
	assert.Positive(t, result.Row.ReleasedAt)
	after := reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 120, after.AffQuota)
	assert.Equal(t, 270, after.AffHistoryQuota)
	assert.Zero(t, after.AffQuotaLocked)

	// 放行后的行不可再放行。
	_, err = AdminReleaseInviterRebate(id)
	require.ErrorIs(t, err, ErrInviterRebateRowNotLocked)

	// 邀请人已硬删除：改记 voided(inviter_missing)，Quota 记 0。
	idGone := insertRebateLedgerReasonRowForTest(t, 999999, invitee.Id, InviterRebateSourceTopUp, 2, 60, InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume, "", 1000)
	result, err = AdminReleaseInviterRebate(idGone)
	require.NoError(t, err)
	assert.Equal(t, InviterRebateStatusVoided, result.Row.Status)
	assert.Equal(t, InviterRebateVoidedInviterMissing, result.Row.VoidedReason)
	assert.Zero(t, result.Quota)
	assert.Empty(t, result.Row.LockedReason)

	// voided 行同样拒绝（走 NotLocked，口径：只有 locked 可放行）。
	idVoided := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 3, 30, InviterRebateStatusVoided, "", InviterRebateVoidedLockExpired, 1000)
	_, err = AdminReleaseInviterRebate(idVoided)
	require.ErrorIs(t, err, ErrInviterRebateRowNotLocked)
	_, err = AdminReleaseInviterRebate(777777)
	require.ErrorIs(t, err, ErrInviterRebateRowNotFound)
}

// TestInviterRebateAdminClawback: 退款回收三分支 + 状态前置错误——locked
// 直接 voided(refund) 回落冻结池；released 且余额充足全额扣回
// aff_quota/aff_history；released 且不足扣到 0 记欠账（不动 aff_history 与
// 余额）；released 且邀请人已硬删除全额欠账；voided 行拒绝回收。
func TestInviterRebateAdminClawback(t *testing.T) {
	inviter, invitee := createRebateUsersForTest(t)

	// 分支一：locked → voided(refund) + 冻结池回落，钱一分没出。
	setRebateUserAffFieldsForTest(t, inviter.Id, 0, 0, 100)
	idLocked := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 1, 100, InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume, "", 1000)
	result, err := AdminClawbackInviterRebate(idLocked)
	require.NoError(t, err)
	assert.Equal(t, InviterRebateStatusVoided, result.Row.Status)
	assert.Equal(t, InviterRebateVoidedRefund, result.Row.VoidedReason)
	assert.Empty(t, result.Row.LockedReason)
	assert.Equal(t, 100, result.Quota)
	assert.Zero(t, result.Debt)
	after := reloadUserForTest(t, inviter.Id)
	assert.Zero(t, after.AffQuotaLocked)
	assert.Zero(t, after.AffQuota)

	// 分支二：released 且 aff_quota ≥ 该笔 → aff_quota/aff_history 全额扣回。
	setRebateUserAffFieldsForTest(t, inviter.Id, 300, 500, 0)
	idRich := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 2, 80, InviterRebateStatusReleased, "", "", 1000)
	result, err = AdminClawbackInviterRebate(idRich)
	require.NoError(t, err)
	assert.Equal(t, InviterRebateVoidedRefund, result.Row.VoidedReason)
	assert.Equal(t, 80, result.Quota)
	assert.Zero(t, result.Debt)
	after = reloadUserForTest(t, inviter.Id)
	assert.Equal(t, 220, after.AffQuota)
	assert.Equal(t, 420, after.AffHistoryQuota)

	// 分支三：released 且不足 → aff_quota 扣到 0，差额欠账，aff_history 不动。
	setRebateUserAffFieldsForTest(t, inviter.Id, 25, 500, 0)
	idPoor := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 3, 80, InviterRebateStatusReleased, "", "", 1000)
	result, err = AdminClawbackInviterRebate(idPoor)
	require.NoError(t, err)
	assert.Equal(t, InviterRebateVoidedRefundUnderfunded, result.Row.VoidedReason)
	assert.Equal(t, 25, result.Quota)
	assert.Equal(t, 55, result.Debt)
	after = reloadUserForTest(t, inviter.Id)
	assert.Zero(t, after.AffQuota)
	assert.Equal(t, 500, after.AffHistoryQuota, "history untouched on underfunded clawback")

	// 分支四：released 且邀请人已硬删除 → voided(refund) + 全额欠账。
	idGone := insertRebateLedgerReasonRowForTest(t, 999999, invitee.Id, InviterRebateSourceTopUp, 4, 60, InviterRebateStatusReleased, "", "", 1000)
	result, err = AdminClawbackInviterRebate(idGone)
	require.NoError(t, err)
	assert.Equal(t, InviterRebateVoidedRefund, result.Row.VoidedReason)
	assert.Zero(t, result.Quota)
	assert.Equal(t, 60, result.Debt)

	// 状态前置错误：voided 行不可回收；不存在的行。
	idVoided := insertRebateLedgerReasonRowForTest(t, inviter.Id, invitee.Id, InviterRebateSourceTopUp, 5, 30, InviterRebateStatusVoided, "", InviterRebateVoidedMonthlyCap, 1000)
	_, err = AdminClawbackInviterRebate(idVoided)
	require.ErrorIs(t, err, ErrInviterRebateRowVoided)
	_, err = AdminClawbackInviterRebate(666666)
	require.ErrorIs(t, err, ErrInviterRebateRowNotFound)
}
