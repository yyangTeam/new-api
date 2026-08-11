package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateUserToken_EmptyKey(t *testing.T) {
	SetupIntegrationTestDB(t)

	token, err := ValidateUserToken("")
	assert.Nil(t, token)
	assert.ErrorIs(t, err, ErrTokenNotProvided)
}

func TestValidateUserToken_NonExistentKey(t *testing.T) {
	SetupIntegrationTestDB(t)

	token, err := ValidateUserToken("sk-nonexistent-key-1234")
	assert.Nil(t, token)
	assert.ErrorIs(t, err, ErrTokenInvalid)
}

func TestValidateUserToken_ValidToken(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "validator", "pass12345", common.RoleCommonUser)
	SeedTestToken(t, db, user.Id, "valid-token", "sk-valid-key-12345678")

	token, err := ValidateUserToken("sk-valid-key-12345678")
	require.NoError(t, err)
	require.NotNil(t, token)
	assert.Equal(t, "valid-token", token.Name)
	assert.Equal(t, user.Id, token.UserId)
}

func TestValidateUserToken_DisabledToken(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "disuser", "pass12345", common.RoleCommonUser)
	tok := SeedTestToken(t, db, user.Id, "disabled-tok", "sk-disabled-key-1234")
	// Manually disable
	tok.Status = common.TokenStatusDisabled
	require.NoError(t, db.Save(tok).Error)

	token, err := ValidateUserToken("sk-disabled-key-1234")
	assert.NotNil(t, token)
	assert.ErrorIs(t, err, ErrTokenInvalid)
}

func TestValidateUserToken_ExpiredToken(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "expuser", "pass12345", common.RoleCommonUser)
	tok := SeedTestToken(t, db, user.Id, "expired-tok", "sk-expired-key-12345")
	// Set expired time in the past
	tok.ExpiredTime = common.GetTimestamp() - 3600
	tok.UnlimitedQuota = true
	require.NoError(t, db.Save(tok).Error)

	token, err := ValidateUserToken("sk-expired-key-12345")
	assert.NotNil(t, token)
	assert.ErrorIs(t, err, ErrTokenInvalid)
}

func TestValidateUserToken_ExhaustedQuota(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "quotauser", "pass12345", common.RoleCommonUser)
	tok := SeedTestToken(t, db, user.Id, "exhausted-tok", "sk-exhausted-key-1234")
	// Zero quota, not unlimited
	tok.RemainQuota = 0
	tok.UnlimitedQuota = false
	require.NoError(t, db.Save(tok).Error)

	token, err := ValidateUserToken("sk-exhausted-key-1234")
	assert.NotNil(t, token)
	assert.ErrorIs(t, err, ErrTokenInvalid)
}

func TestIncreaseTokenQuota_RejectsNegative(t *testing.T) {
	err := IncreaseTokenQuota(1, "sk-test", -100)
	assert.Error(t, err)
}

func TestDecreaseTokenQuota_RejectsNegative(t *testing.T) {
	err := DecreaseTokenQuota(1, "sk-test", -100)
	assert.Error(t, err)
}

func TestIncreaseDecreaseTokenQuota_DBIntegration(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "quotadbuser", "pass12345", common.RoleCommonUser)
	tok := SeedTestToken(t, db, user.Id, "quota-tok", "sk-quotadb-key-12345")
	tok.RemainQuota = 1000
	tok.UsedQuota = 0
	tok.UnlimitedQuota = false
	require.NoError(t, db.Save(tok).Error)

	// Decrease quota
	err := decreaseTokenQuota(tok.Id, 300)
	require.NoError(t, err)

	// Verify
	var updated Token
	require.NoError(t, db.First(&updated, tok.Id).Error)
	assert.Equal(t, 700, updated.RemainQuota)
	assert.Equal(t, 300, updated.UsedQuota)

	// Increase quota (refund)
	err = increaseTokenQuota(tok.Id, 100)
	require.NoError(t, err)

	require.NoError(t, db.First(&updated, tok.Id).Error)
	assert.Equal(t, 800, updated.RemainQuota)
	assert.Equal(t, 200, updated.UsedQuota)
}

func TestSearchUserTokens_HardLimit(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "searchuser", "pass12345", common.RoleCommonUser)
	// Create 5 tokens
	for i := 0; i < 5; i++ {
		SeedTestToken(t, db, user.Id, "search-tok", "sk-searchuser-key-"+string(rune('a'+i))+"1234")
	}

	// Limit 0 should be capped to searchHardLimit
	tokens, total, err := SearchUserTokens(user.Id, "search-tok", "", 0, 0)
	require.NoError(t, err)
	assert.Equal(t, int64(5), total)
	assert.Len(t, tokens, 5)
}

func TestSearchUserTokens_ExactMatch(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "exactuser", "pass12345", common.RoleCommonUser)
	SeedTestToken(t, db, user.Id, "alpha-token", "sk-exact-alpha-12345")
	SeedTestToken(t, db, user.Id, "beta-token", "sk-exact-beta-123456")

	tokens, total, err := SearchUserTokens(user.Id, "alpha-token", "", 0, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, tokens, 1)
	assert.Equal(t, "alpha-token", tokens[0].Name)
}
