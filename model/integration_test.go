package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserInsertAndValidateAndFill(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "testlogin", "password123", common.RoleCommonUser)
	require.NotZero(t, user.Id)

	// ValidateAndFill should succeed with correct credentials
	loginUser := User{
		Username: "testlogin",
		Password: "password123",
	}
	err := loginUser.ValidateAndFill()
	require.NoError(t, err)
	assert.Equal(t, user.Id, loginUser.Id)
	assert.Equal(t, common.RoleCommonUser, loginUser.Role)
	assert.Equal(t, common.UserStatusEnabled, loginUser.Status)
}

func TestUserValidateAndFillWrongPassword(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	SeedTestUser(t, db, "wrongpw", "correctpassword", common.RoleCommonUser)

	loginUser := User{
		Username: "wrongpw",
		Password: "wrongpassword",
	}
	err := loginUser.ValidateAndFill()
	assert.Error(t, err)
}

func TestUserValidateAndFillNonExistentUser(t *testing.T) {
	SetupIntegrationTestDB(t)

	loginUser := User{
		Username: "nonexistent",
		Password: "anything",
	}
	err := loginUser.ValidateAndFill()
	assert.Error(t, err)
}

func TestTokenInsertAndRetrieve(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "tokenowner", "pass12345", common.RoleCommonUser)
	token := SeedTestToken(t, db, user.Id, "my-token", "sk-test-key-12345678")

	// Retrieve by ID
	fetched, err := GetTokenByIds(token.Id, user.Id)
	require.NoError(t, err)
	assert.Equal(t, "my-token", fetched.Name)
	assert.Equal(t, "sk-test-key-12345678", fetched.Key)
	assert.Equal(t, int64(-1), fetched.ExpiredTime)
	assert.True(t, fetched.UnlimitedQuota)
}

func TestTokenGetByIds_WrongUser(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "tokenuser1", "pass12345", common.RoleCommonUser)
	token := SeedTestToken(t, db, user.Id, "private-token", "sk-private-key-1234")

	// Try to access with a different user ID
	_, err := GetTokenByIds(token.Id, user.Id+999)
	assert.Error(t, err, "should not be able to access another user's token")
}

func TestTokenDelete(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "deluser", "pass12345", common.RoleCommonUser)
	token := SeedTestToken(t, db, user.Id, "to-delete", "sk-delete-me-12345")

	err := DeleteTokenById(token.Id, user.Id)
	require.NoError(t, err)

	// Verify it's soft-deleted
	_, err = GetTokenByIds(token.Id, user.Id)
	assert.Error(t, err)
}

func TestTokenDelete_WrongUser(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "deluser2", "pass12345", common.RoleCommonUser)
	token := SeedTestToken(t, db, user.Id, "cannot-delete", "sk-nodelete-12345")

	err := DeleteTokenById(token.Id, user.Id+999)
	assert.Error(t, err, "should not be able to delete another user's token")
}

func TestChannelInsertAndRetrieve(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	channel := SeedTestChannel(t, db, "test-openai", "sk-provider-key", 1)
	require.NotZero(t, channel.Id)

	fetched, err := GetChannelById(channel.Id, true)
	require.NoError(t, err)
	assert.Equal(t, "test-openai", fetched.Name)
	assert.Equal(t, 1, fetched.Type)
	assert.Equal(t, "gpt-3.5-turbo,gpt-4", fetched.Models)
	assert.Equal(t, "default", fetched.Group)
}

func TestGetAllUserTokens_Pagination(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "pageuser", "pass12345", common.RoleCommonUser)
	for i := 0; i < 5; i++ {
		SeedTestToken(t, db, user.Id, "token-"+string(rune('A'+i)), "sk-page-"+string(rune('a'+i))+"1234567")
	}

	// Get first page (3 items)
	tokens, err := GetAllUserTokens(user.Id, 0, 3)
	require.NoError(t, err)
	assert.Len(t, tokens, 3)

	// Get second page (2 items)
	tokens, err = GetAllUserTokens(user.Id, 3, 3)
	require.NoError(t, err)
	assert.Len(t, tokens, 2)
}

func TestTokenAutoGroups(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "autogrp", "pass12345", common.RoleCommonUser)
	token := SeedTestToken(t, db, user.Id, "auto-token", "sk-autogrp-12345678")

	// Set auto groups
	err := token.SetAutoGroups([]string{"group-a", "group-b"})
	require.NoError(t, err)
	require.NoError(t, db.Save(token).Error)

	// Retrieve and verify
	fetched, err := GetTokenByIds(token.Id, user.Id)
	require.NoError(t, err)

	groups, err := fetched.GetAutoGroups()
	require.NoError(t, err)
	assert.Equal(t, []string{"group-a", "group-b"}, groups)
}

func TestTokenAutoGroups_Empty(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "emptygrp", "pass12345", common.RoleCommonUser)
	token := SeedTestToken(t, db, user.Id, "no-groups", "sk-nogroups-1234567")

	groups, err := token.GetAutoGroups()
	require.NoError(t, err)
	assert.Nil(t, groups)
}

func TestValidateAccessToken(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	pat := "abcdef1234567890abcdef1234567890"
	SeedTestUserWithAccessToken(t, db, "patuser", "pass12345", common.RoleAdminUser, pat)

	// Should find user by access token
	user, err := ValidateAccessToken(pat)
	require.NoError(t, err)
	require.NotNil(t, user)
	assert.Equal(t, "patuser", user.Username)
	assert.Equal(t, common.RoleAdminUser, user.Role)
}

func TestValidateAccessToken_Invalid(t *testing.T) {
	SetupIntegrationTestDB(t)

	user, err := ValidateAccessToken("nonexistent-token")
	require.NoError(t, err)
	assert.Nil(t, user, "non-existent token should return nil user")
}

func TestValidateAccessToken_Empty(t *testing.T) {
	SetupIntegrationTestDB(t)

	user, err := ValidateAccessToken("")
	require.NoError(t, err)
	assert.Nil(t, user)
}

func TestGetUserById(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	created := SeedTestUser(t, db, "getbyid", "pass12345", common.RoleRootUser)

	user, err := GetUserById(created.Id, false)
	require.NoError(t, err)
	assert.Equal(t, "getbyid", user.Username)
	assert.Equal(t, common.RoleRootUser, user.Role)
}

func TestGetUserById_NotFound(t *testing.T) {
	SetupIntegrationTestDB(t)

	_, err := GetUserById(99999, false)
	assert.Error(t, err)
}

func TestCountUserTokens(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "countuser", "pass12345", common.RoleCommonUser)
	SeedTestToken(t, db, user.Id, "count-1", "sk-count-1-12345678")
	SeedTestToken(t, db, user.Id, "count-2", "sk-count-2-12345678")
	SeedTestToken(t, db, user.Id, "count-3", "sk-count-3-12345678")

	count, err := CountUserTokens(user.Id)
	require.NoError(t, err)
	assert.Equal(t, int64(3), count)
}

func TestMaskTokenKey(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "empty", input: "", expected: ""},
		{name: "short_4chars", input: "abcd", expected: "****"},
		{name: "medium_8chars", input: "abcdefgh", expected: "ab****gh"},
		{name: "long_key", input: "sk-abcdefgh12345678", expected: "sk-a**********5678"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := MaskTokenKey(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
