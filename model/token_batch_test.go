package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func seedBatchToken(t *testing.T, userID int, name string) *Token {
	t.Helper()
	tok := &Token{
		UserId:         userID,
		Name:           name,
		Key:            name + "_key_padding_000",
		Status:         common.TokenStatusEnabled,
		CreatedTime:    1,
		AccessedTime:   1,
		ExpiredTime:    -1,
		RemainQuota:    100,
		UnlimitedQuota: true,
		Group:          "default",
	}
	require.NoError(t, DB.Create(tok).Error)
	return tok
}

func TestBatchUpdateTokens_EmptyIdsReturnsError(t *testing.T) {
	truncateTables(t)

	_, err := BatchUpdateTokens([]int{}, 1, map[string]interface{}{"group": "vip"})
	require.Error(t, err, "empty ids should return error")
}

func TestBatchUpdateTokens_EmptyFieldsReturnsError(t *testing.T) {
	truncateTables(t)
	tok := seedBatchToken(t, 1, "empty_fields_tok")

	_, err := BatchUpdateTokens([]int{tok.Id}, 1, map[string]interface{}{})
	require.Error(t, err, "empty fields should return error")
}

func TestBatchUpdateTokens_UpdatesOwnedTokens(t *testing.T) {
	truncateTables(t)
	t1 := seedBatchToken(t, 1, "batch_upd_t1")
	t2 := seedBatchToken(t, 1, "batch_upd_t2")

	count, err := BatchUpdateTokens([]int{t1.Id, t2.Id}, 1, map[string]interface{}{"group": "premium"})
	require.NoError(t, err)
	require.Equal(t, 2, count)

	var tokens []Token
	require.NoError(t, DB.Where("id IN (?)", []int{t1.Id, t2.Id}).Find(&tokens).Error)
	for _, tok := range tokens {
		require.Equal(t, "premium", tok.Group, "token %d should have group 'premium'", tok.Id)
	}
}

func TestBatchUpdateTokens_SkipsOtherUsersTokens(t *testing.T) {
	truncateTables(t)
	mine := seedBatchToken(t, 1, "batch_mine_tok")
	theirs := seedBatchToken(t, 2, "batch_theirs_tok")

	count, err := BatchUpdateTokens([]int{mine.Id, theirs.Id}, 1, map[string]interface{}{"group": "hacked"})
	require.NoError(t, err)
	require.Equal(t, 1, count, "should only update the token owned by user 1")

	var theirsAfter Token
	require.NoError(t, DB.First(&theirsAfter, theirs.Id).Error)
	require.NotEqual(t, "hacked", theirsAfter.Group, "must not update another user's token")
}

func TestBatchUpdateTokens_ReturnsZeroWhenNoMatchingTokens(t *testing.T) {
	truncateTables(t)

	count, err := BatchUpdateTokens([]int{99999, 99998}, 1, map[string]interface{}{"group": "vip"})
	require.NoError(t, err)
	require.Equal(t, 0, count)
}

func TestBatchUpdateTokens_UpdatesMultipleFields(t *testing.T) {
	truncateTables(t)
	tok := seedBatchToken(t, 1, "batch_multi_tok")

	const newExpiry int64 = 9999999999
	count, err := BatchUpdateTokens([]int{tok.Id}, 1, map[string]interface{}{
		"expired_time":        newExpiry,
		"unlimited_quota":     false,
		"remain_quota":        200,
		"cross_group_retry":   true,
	})
	require.NoError(t, err)
	require.Equal(t, 1, count)

	var updated Token
	require.NoError(t, DB.First(&updated, tok.Id).Error)
	require.Equal(t, newExpiry, updated.ExpiredTime)
	require.False(t, updated.UnlimitedQuota)
	require.Equal(t, 200, updated.RemainQuota)
	require.True(t, updated.CrossGroupRetry)
}

func TestBatchUpdateTokens_UpdatesPartialSubsetOfIds(t *testing.T) {
	truncateTables(t)
	mine := seedBatchToken(t, 1, "batch_partial_mine")
	other := seedBatchToken(t, 2, "batch_partial_other")

	// pass both ids but only one belongs to user 1
	count, err := BatchUpdateTokens([]int{mine.Id, other.Id}, 1, map[string]interface{}{"allow_ips": "127.0.0.1"})
	require.NoError(t, err)
	require.Equal(t, 1, count)

	var mineAfter Token
	require.NoError(t, DB.First(&mineAfter, mine.Id).Error)
	require.NotNil(t, mineAfter.AllowIps)
	require.Equal(t, "127.0.0.1", *mineAfter.AllowIps)
}
