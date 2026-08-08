package model

import (
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func seedBatchUser(t *testing.T, id int, quota int, usedQuota int, requestCount int) *User {
	t.Helper()
	u := &User{
		Username:     fmt.Sprintf("batchuser_%s_%d", t.Name(), id),
		DisplayName:  "Batch User",
		Role:         1,
		Status:       1,
		Quota:        quota,
		UsedQuota:    usedQuota,
		RequestCount: requestCount,
		AffCode:      common.GetRandomString(8),
	}
	require.NoError(t, DB.Create(u).Error)
	return u
}

// --- updateUserQuotaUsedQuotaAndRequestCount ---

func TestUpdateUserQuotaUsedQuotaAndRequestCount_AllZeroIsNoop(t *testing.T) {
	truncateTables(t)
	u := seedBatchUser(t, 1, 1000, 200, 5)

	updateUserQuotaUsedQuotaAndRequestCount(u.Id, 0, 0, 0)

	var after User
	require.NoError(t, DB.First(&after, u.Id).Error)
	require.Equal(t, 1000, after.Quota)
	require.Equal(t, 200, after.UsedQuota)
	require.Equal(t, 5, after.RequestCount)
}

func TestUpdateUserQuotaUsedQuotaAndRequestCount_IncreasesAll(t *testing.T) {
	truncateTables(t)
	u := seedBatchUser(t, 1, 1000, 200, 5)

	updateUserQuotaUsedQuotaAndRequestCount(u.Id, 500, 300, 10)

	var after User
	require.NoError(t, DB.First(&after, u.Id).Error)
	require.Equal(t, 1500, after.Quota)
	require.Equal(t, 500, after.UsedQuota)
	require.Equal(t, 15, after.RequestCount)
}

func TestUpdateUserQuotaUsedQuotaAndRequestCount_OnlyQuotaChanged(t *testing.T) {
	truncateTables(t)
	u := seedBatchUser(t, 1, 1000, 200, 5)

	updateUserQuotaUsedQuotaAndRequestCount(u.Id, -100, 0, 0)

	var after User
	require.NoError(t, DB.First(&after, u.Id).Error)
	require.Equal(t, 900, after.Quota)
	require.Equal(t, 200, after.UsedQuota)
	require.Equal(t, 5, after.RequestCount)
}

func TestUpdateUserQuotaUsedQuotaAndRequestCount_OnlyUsedQuotaChanged(t *testing.T) {
	truncateTables(t)
	u := seedBatchUser(t, 1, 1000, 0, 0)

	updateUserQuotaUsedQuotaAndRequestCount(u.Id, 0, 50, 0)

	var after User
	require.NoError(t, DB.First(&after, u.Id).Error)
	require.Equal(t, 1000, after.Quota)
	require.Equal(t, 50, after.UsedQuota)
	require.Equal(t, 0, after.RequestCount)
}

// --- batchUpdate merge logic ---

func TestBatchUpdate_MergesMultipleAddNewRecordCallsForSameUser(t *testing.T) {
	truncateTables(t)

	// reset stores to a clean state
	for i := 0; i < BatchUpdateTypeCount; i++ {
		batchUpdateLocks[i].Lock()
		batchUpdateStores[i] = make(map[int]int)
		batchUpdateLocks[i].Unlock()
	}

	u := seedBatchUser(t, 1, 1000, 0, 0)

	// simulate three relay requests consuming quota from the same user
	addNewRecord(BatchUpdateTypeUserQuota, u.Id, -100)
	addNewRecord(BatchUpdateTypeUserQuota, u.Id, -200)
	addNewRecord(BatchUpdateTypeUsedQuota, u.Id, 100)
	addNewRecord(BatchUpdateTypeUsedQuota, u.Id, 200)
	addNewRecord(BatchUpdateTypeRequestCount, u.Id, 1)
	addNewRecord(BatchUpdateTypeRequestCount, u.Id, 1)

	batchUpdate()

	var after User
	require.NoError(t, DB.First(&after, u.Id).Error)
	require.Equal(t, 700, after.Quota)        // 1000 - 300
	require.Equal(t, 300, after.UsedQuota)    // 0 + 300
	require.Equal(t, 2, after.RequestCount)   // 0 + 2
}

func TestBatchUpdate_UpdatesMultipleUsersInOnePass(t *testing.T) {
	truncateTables(t)

	for i := 0; i < BatchUpdateTypeCount; i++ {
		batchUpdateLocks[i].Lock()
		batchUpdateStores[i] = make(map[int]int)
		batchUpdateLocks[i].Unlock()
	}

	u1 := seedBatchUser(t, 1, 1000, 0, 0)
	u2 := seedBatchUser(t, 2, 2000, 0, 0)

	addNewRecord(BatchUpdateTypeUserQuota, u1.Id, -100)
	addNewRecord(BatchUpdateTypeUsedQuota, u1.Id, 100)
	addNewRecord(BatchUpdateTypeRequestCount, u1.Id, 1)

	addNewRecord(BatchUpdateTypeUserQuota, u2.Id, -500)
	addNewRecord(BatchUpdateTypeUsedQuota, u2.Id, 500)
	addNewRecord(BatchUpdateTypeRequestCount, u2.Id, 3)

	batchUpdate()

	var a1, a2 User
	require.NoError(t, DB.First(&a1, u1.Id).Error)
	require.NoError(t, DB.First(&a2, u2.Id).Error)

	require.Equal(t, 900, a1.Quota)
	require.Equal(t, 100, a1.UsedQuota)
	require.Equal(t, 1, a1.RequestCount)

	require.Equal(t, 1500, a2.Quota)
	require.Equal(t, 500, a2.UsedQuota)
	require.Equal(t, 3, a2.RequestCount)
}

func TestBatchUpdate_SkipsWhenNoData(t *testing.T) {
	truncateTables(t)

	for i := 0; i < BatchUpdateTypeCount; i++ {
		batchUpdateLocks[i].Lock()
		batchUpdateStores[i] = make(map[int]int)
		batchUpdateLocks[i].Unlock()
	}

	u := seedBatchUser(t, 1, 1000, 0, 0)
	// call batchUpdate with empty stores — should be a no-op
	batchUpdate()

	var after User
	require.NoError(t, DB.First(&after, u.Id).Error)
	require.Equal(t, 1000, after.Quota)
	require.Equal(t, 0, after.UsedQuota)
	require.Equal(t, 0, after.RequestCount)
}
