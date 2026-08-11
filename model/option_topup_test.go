package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func initOptionMapForTest(t *testing.T) {
	t.Helper()
	common.OptionMapRWMutex.Lock()
	if common.OptionMap == nil {
		common.OptionMap = make(map[string]string)
	}
	common.OptionMapRWMutex.Unlock()
}

func TestOptionUpdateAndRetrieve(t *testing.T) {
	SetupIntegrationTestDB(t)
	initOptionMapForTest(t)

	err := UpdateOption("TestKey", "TestValue")
	require.NoError(t, err)

	// Verify it's in the database
	options, err := AllOption()
	require.NoError(t, err)

	found := false
	for _, opt := range options {
		if opt.Key == "TestKey" {
			assert.Equal(t, "TestValue", opt.Value)
			found = true
			break
		}
	}
	assert.True(t, found, "option should be stored in database")

	// Verify it's also in the OptionMap
	common.OptionMapRWMutex.RLock()
	val := common.OptionMap["TestKey"]
	common.OptionMapRWMutex.RUnlock()
	assert.Equal(t, "TestValue", val)
}

func TestOptionUpdate_OverwritesExisting(t *testing.T) {
	SetupIntegrationTestDB(t)
	initOptionMapForTest(t)

	require.NoError(t, UpdateOption("OverwriteKey", "first"))
	require.NoError(t, UpdateOption("OverwriteKey", "second"))

	common.OptionMapRWMutex.RLock()
	val := common.OptionMap["OverwriteKey"]
	common.OptionMapRWMutex.RUnlock()
	assert.Equal(t, "second", val)
}

func TestUpdateOptionsBulk(t *testing.T) {
	SetupIntegrationTestDB(t)
	initOptionMapForTest(t)

	values := map[string]string{
		"BulkKeyA": "ValueA",
		"BulkKeyB": "ValueB",
		"BulkKeyC": "ValueC",
	}
	err := UpdateOptionsBulk(values)
	require.NoError(t, err)

	// Verify all are in DB
	options, err := AllOption()
	require.NoError(t, err)
	optMap := make(map[string]string)
	for _, opt := range options {
		optMap[opt.Key] = opt.Value
	}
	assert.Equal(t, "ValueA", optMap["BulkKeyA"])
	assert.Equal(t, "ValueB", optMap["BulkKeyB"])
	assert.Equal(t, "ValueC", optMap["BulkKeyC"])
}

func TestUpdateOptionsBulk_EmptyMap(t *testing.T) {
	SetupIntegrationTestDB(t)
	initOptionMapForTest(t)

	err := UpdateOptionsBulk(map[string]string{})
	assert.NoError(t, err)
}

func TestTopUpInsertAndRetrieve(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	topUp := &TopUp{
		UserId:          1,
		Amount:          100,
		Money:           10.5,
		TradeNo:         "trade-test-001",
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, topUp.Insert())
	require.NotZero(t, topUp.Id)

	// Retrieve by trade no
	fetched := GetTopUpByTradeNo("trade-test-001")
	require.NotNil(t, fetched)
	assert.Equal(t, int64(100), fetched.Amount)
	assert.Equal(t, 10.5, fetched.Money)
	assert.Equal(t, PaymentMethodStripe, fetched.PaymentMethod)
	assert.Equal(t, common.TopUpStatusPending, fetched.Status)

	// Retrieve by ID
	fetchedById := GetTopUpById(topUp.Id)
	require.NotNil(t, fetchedById)
	assert.Equal(t, "trade-test-001", fetchedById.TradeNo)

	// Non-existent trade no
	assert.Nil(t, GetTopUpByTradeNo("nonexistent"))
	// Non-existent ID
	assert.Nil(t, GetTopUpById(99999))

	_ = db // keep compiler happy
}

func TestUpdatePendingTopUpStatus_Success(t *testing.T) {
	SetupIntegrationTestDB(t)

	topUp := &TopUp{
		UserId:          1,
		Amount:          50,
		Money:           5.0,
		TradeNo:         "trade-status-001",
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, topUp.Insert())

	err := UpdatePendingTopUpStatus("trade-status-001", PaymentProviderStripe, common.TopUpStatusSuccess)
	require.NoError(t, err)

	// Verify status changed
	fetched := GetTopUpByTradeNo("trade-status-001")
	require.NotNil(t, fetched)
	assert.Equal(t, common.TopUpStatusSuccess, fetched.Status)
}

func TestUpdatePendingTopUpStatus_PaymentMethodMismatch(t *testing.T) {
	SetupIntegrationTestDB(t)

	topUp := &TopUp{
		UserId:          1,
		Amount:          50,
		Money:           5.0,
		TradeNo:         "trade-mismatch-001",
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, topUp.Insert())

	err := UpdatePendingTopUpStatus("trade-mismatch-001", PaymentProviderCreem, common.TopUpStatusSuccess)
	assert.ErrorIs(t, err, ErrPaymentMethodMismatch)
}

func TestUpdatePendingTopUpStatus_AlreadyCompleted(t *testing.T) {
	SetupIntegrationTestDB(t)

	topUp := &TopUp{
		UserId:          1,
		Amount:          50,
		Money:           5.0,
		TradeNo:         "trade-completed-001",
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusSuccess,
	}
	require.NoError(t, topUp.Insert())

	err := UpdatePendingTopUpStatus("trade-completed-001", PaymentProviderStripe, common.TopUpStatusSuccess)
	assert.ErrorIs(t, err, ErrTopUpStatusInvalid)
}

func TestUpdatePendingTopUpStatus_NotFound(t *testing.T) {
	SetupIntegrationTestDB(t)

	err := UpdatePendingTopUpStatus("nonexistent-trade", "", common.TopUpStatusSuccess)
	assert.ErrorIs(t, err, ErrTopUpNotFound)
}

func TestUpdatePendingTopUpStatus_EmptyTradeNo(t *testing.T) {
	SetupIntegrationTestDB(t)

	err := UpdatePendingTopUpStatus("", "", common.TopUpStatusSuccess)
	assert.Error(t, err)
}

func TestRecharge_Stripe_Success(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "rechargeuser", "pass12345", common.RoleCommonUser)
	// Set initial user quota
	require.NoError(t, db.Model(&User{}).Where("id = ?", user.Id).Update("quota", 0).Error)

	topUp := &TopUp{
		UserId:          user.Id,
		Amount:          100,
		Money:           2.0,
		TradeNo:         "stripe-recharge-001",
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, topUp.Insert())

	err := Recharge("stripe-recharge-001", "cus_test123", "127.0.0.1")
	require.NoError(t, err)

	// Verify topup status
	fetched := GetTopUpByTradeNo("stripe-recharge-001")
	require.NotNil(t, fetched)
	assert.Equal(t, common.TopUpStatusSuccess, fetched.Status)
	assert.NotZero(t, fetched.CompleteTime)

	// Verify user quota increased: Money * QuotaPerUnit = 2.0 * 500000 = 1000000
	var updatedUser User
	require.NoError(t, db.First(&updatedUser, user.Id).Error)
	expectedQuota := int(2.0 * common.QuotaPerUnit)
	assert.Equal(t, expectedQuota, updatedUser.Quota)
}

func TestRecharge_EmptyReferenceId(t *testing.T) {
	SetupIntegrationTestDB(t)

	err := Recharge("", "cus_test", "127.0.0.1")
	assert.Error(t, err)
}

func TestRecharge_NonStripeProvider(t *testing.T) {
	SetupIntegrationTestDB(t)

	topUp := &TopUp{
		UserId:          1,
		Amount:          100,
		Money:           10.0,
		TradeNo:         "non-stripe-001",
		PaymentMethod:   PaymentMethodCreem,
		PaymentProvider: PaymentProviderCreem,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, topUp.Insert())

	err := Recharge("non-stripe-001", "cus_test", "127.0.0.1")
	assert.Error(t, err, "Recharge should reject non-Stripe provider")
}

func TestRecharge_Idempotent_AlreadySuccess(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "idempotent-user", "pass12345", common.RoleCommonUser)

	topUp := &TopUp{
		UserId:          user.Id,
		Amount:          100,
		Money:           10.0,
		TradeNo:         "already-success-001",
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusSuccess,
	}
	require.NoError(t, topUp.Insert())

	err := Recharge("already-success-001", "cus_test", "127.0.0.1")
	assert.Error(t, err, "recharge on already-completed order should fail")
}
