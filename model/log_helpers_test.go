package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFormatUserLogs_StripsAdminInfo(t *testing.T) {
	other := `{"admin_info":{"operator":"admin1"},"user_data":"visible"}`
	logs := []*Log{
		{Id: 1, Other: other, ChannelName: "should-clear"},
	}
	formatUserLogs(logs, 0)

	assert.Equal(t, "", logs[0].ChannelName, "channel name should be cleared for user logs")
	// admin_info should be stripped
	assert.NotContains(t, logs[0].Other, "admin_info")
	assert.Contains(t, logs[0].Other, "user_data")
}

func TestFormatUserLogs_StripsAuditInfo(t *testing.T) {
	other := `{"audit_info":{"route":"/admin/action"},"public":"data"}`
	logs := []*Log{
		{Id: 1, Other: other},
	}
	formatUserLogs(logs, 0)

	assert.NotContains(t, logs[0].Other, "audit_info")
	assert.Contains(t, logs[0].Other, "public")
}

func TestFormatUserLogs_AssignsDisplayIds(t *testing.T) {
	logs := []*Log{
		{Id: 100, Other: ""},
		{Id: 200, Other: ""},
		{Id: 300, Other: ""},
	}
	formatUserLogs(logs, 10) // startIdx=10

	assert.Equal(t, 11, logs[0].Id)
	assert.Equal(t, 12, logs[1].Id)
	assert.Equal(t, 13, logs[2].Id)
}

func TestAssignDisplayLogIds_FromOffset(t *testing.T) {
	logs := []*Log{
		{Id: 0},
		{Id: 0},
	}
	assignDisplayLogIds(logs, 5)
	assert.Equal(t, 6, logs[0].Id)
	assert.Equal(t, 7, logs[1].Id)
}

func TestBuildOpField(t *testing.T) {
	op := buildOpField("user_delete", map[string]interface{}{"target_id": 42})

	assert.Equal(t, "user_delete", op["action"])
	params, ok := op["params"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, 42, params["target_id"])
}

func TestBuildOpField_NilParams(t *testing.T) {
	op := buildOpField("login", nil)
	assert.Equal(t, "login", op["action"])
	_, hasParams := op["params"]
	assert.False(t, hasParams, "params key should not exist when nil")
}

func TestBuildOpField_EmptyParams(t *testing.T) {
	op := buildOpField("logout", map[string]interface{}{})
	assert.Equal(t, "logout", op["action"])
	_, hasParams := op["params"]
	assert.False(t, hasParams, "params key should not exist when empty")
}

func TestEnsureLogRequestId_BackfillsEmpty(t *testing.T) {
	log := &Log{RequestId: ""}
	ensureLogRequestId(log)
	assert.NotEmpty(t, log.RequestId, "empty RequestId should be populated")
}

func TestEnsureLogRequestId_KeepsExisting(t *testing.T) {
	log := &Log{RequestId: "existing-id-123"}
	ensureLogRequestId(log)
	assert.Equal(t, "existing-id-123", log.RequestId, "existing RequestId should not be overwritten")
}

func TestClickHouseLogOrder_WithPrefix(t *testing.T) {
	result := clickHouseLogOrder("logs.")
	assert.Equal(t, "logs.created_at desc, logs.request_id desc", result)

	result = clickHouseLogOrder("")
	assert.Equal(t, "created_at desc, request_id desc", result)
}

func TestCreateLog_DBIntegration(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "loguser", "pass12345", common.RoleCommonUser)

	log := &Log{
		UserId:    user.Id,
		Username:  "loguser",
		CreatedAt: common.GetTimestamp(),
		Type:      LogTypeManage,
		Content:   "test operation",
	}
	err := createLog(log)
	require.NoError(t, err)
	assert.NotEmpty(t, log.RequestId, "RequestId should be auto-generated")

	// Verify in DB
	var fetched Log
	require.NoError(t, db.First(&fetched, "request_id = ?", log.RequestId).Error)
	assert.Equal(t, "loguser", fetched.Username)
	assert.Equal(t, LogTypeManage, fetched.Type)
	assert.Equal(t, "test operation", fetched.Content)
}

func TestLogTypeConstants(t *testing.T) {
	// Lock down log type values — these are stored in DB and must not change
	assert.Equal(t, 0, LogTypeUnknown)
	assert.Equal(t, 1, LogTypeTopup)
	assert.Equal(t, 2, LogTypeConsume)
	assert.Equal(t, 3, LogTypeManage)
	assert.Equal(t, 4, LogTypeSystem)
	assert.Equal(t, 5, LogTypeError)
	assert.Equal(t, 6, LogTypeRefund)
	assert.Equal(t, 7, LogTypeLogin)
}
