package model

import (
	"encoding/json"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"testing"
)

// --- merged from ability_routing_test.go ---
func TestAddAbilities_CreatesCorrectEntries(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	priority := int64(10)
	weight := uint(5)
	tag := "test-tag"
	ch := &Channel{
		Id:       0,
		Name:     "ability-test",
		Key:      "sk-ability-test",
		Type:     1,
		Status:   common.ChannelStatusEnabled,
		Models:   "gpt-4,claude-3",
		Group:    "default,premium",
		Priority: &priority,
		Weight:   &weight,
		Tag:      &tag,
	}
	require.NoError(t, db.Create(ch).Error)
	require.NotZero(t, ch.Id)

	err := ch.AddAbilities(nil)
	require.NoError(t, err)

	// Should create 2 models * 2 groups = 4 abilities
	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 4)

	// Verify properties
	for _, ab := range abilities {
		assert.True(t, ab.Enabled)
		assert.Equal(t, &priority, ab.Priority)
		assert.Equal(t, uint(5), ab.Weight)
		assert.Equal(t, &tag, ab.Tag)
		assert.Equal(t, ch.Id, ab.ChannelId)
	}

	// Verify that all group+model combinations exist
	combos := make(map[string]bool)
	for _, ab := range abilities {
		combos[ab.Group+"|"+ab.Model] = true
	}
	assert.True(t, combos["default|gpt-4"])
	assert.True(t, combos["default|claude-3"])
	assert.True(t, combos["premium|gpt-4"])
	assert.True(t, combos["premium|claude-3"])
}

func TestAddAbilities_DeduplicatesGroupModel(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "dedup-test",
		Key:    "sk-dedup-test",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,gpt-4", // duplicate model
		Group:  "default,default",
	}
	require.NoError(t, db.Create(ch).Error)

	err := ch.AddAbilities(nil)
	require.NoError(t, err)

	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 1, "duplicate group|model combinations should be deduplicated")
}

func TestAddAbilities_DisabledChannel(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "disabled-test",
		Key:    "sk-disabled-test",
		Type:   1,
		Status: common.ChannelStatusManuallyDisabled,
		Models: "gpt-4",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)

	err := ch.AddAbilities(nil)
	require.NoError(t, err)

	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	require.Len(t, abilities, 1)
	assert.False(t, abilities[0].Enabled, "abilities of disabled channel should be disabled")
}

func TestDeleteAbilities(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "del-ability-test",
		Key:    "sk-del-ability",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,gpt-3.5-turbo",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	var count int64
	db.Model(&Ability{}).Where("channel_id = ?", ch.Id).Count(&count)
	assert.Equal(t, int64(2), count)

	err := ch.DeleteAbilities()
	require.NoError(t, err)

	db.Model(&Ability{}).Where("channel_id = ?", ch.Id).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestUpdateAbilities_ReplacesEntries(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "update-ability",
		Key:    "sk-update-ability",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	// Verify initial state
	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 1)
	assert.Equal(t, "gpt-4", abilities[0].Model)

	// Update models
	ch.Models = "claude-3,gemini-pro"
	err := ch.UpdateAbilities(nil)
	require.NoError(t, err)

	// Verify new state
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 2)
	models := make(map[string]bool)
	for _, ab := range abilities {
		models[ab.Model] = true
	}
	assert.True(t, models["claude-3"])
	assert.True(t, models["gemini-pro"])
	assert.False(t, models["gpt-4"], "old model should be removed")
}

func TestUpdateAbilityStatus(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "status-ability",
		Key:    "sk-status-ability",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,claude-3",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	// Disable
	err := UpdateAbilityStatus(ch.Id, false)
	require.NoError(t, err)

	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	for _, ab := range abilities {
		assert.False(t, ab.Enabled)
	}

	// Re-enable
	err = UpdateAbilityStatus(ch.Id, true)
	require.NoError(t, err)

	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	for _, ab := range abilities {
		assert.True(t, ab.Enabled)
	}
}

func TestGetGroupEnabledModels(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	// Create a channel with multiple models and groups
	ch := &Channel{
		Name:   "enabled-models",
		Key:    "sk-enabled-models",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,claude-3,gemini-pro",
		Group:  "default,premium",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	models := GetGroupEnabledModels("default")
	assert.Len(t, models, 3)
	assert.Contains(t, models, "gpt-4")
	assert.Contains(t, models, "claude-3")
	assert.Contains(t, models, "gemini-pro")

	// Non-existent group returns empty
	models = GetGroupEnabledModels("nonexistent")
	assert.Empty(t, models)
}

func TestGetEnabledModels(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "all-enabled",
		Key:    "sk-all-enabled",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "model-a,model-b",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	models := GetEnabledModels()
	assert.Contains(t, models, "model-a")
	assert.Contains(t, models, "model-b")
}

func TestGetChannel_WeightedSelection(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	priority := int64(100)
	// Create two channels with same model/group but different weights
	ch1 := &Channel{
		Name:     "heavy-channel",
		Key:      "sk-heavy-channel",
		Type:     1,
		Status:   common.ChannelStatusEnabled,
		Models:   "test-model",
		Group:    "default",
		Priority: &priority,
	}
	require.NoError(t, db.Create(ch1).Error)
	require.NoError(t, ch1.AddAbilities(nil))

	ch2 := &Channel{
		Name:     "light-channel",
		Key:      "sk-light-channel",
		Type:     1,
		Status:   common.ChannelStatusEnabled,
		Models:   "test-model",
		Group:    "default",
		Priority: &priority,
	}
	require.NoError(t, db.Create(ch2).Error)
	require.NoError(t, ch2.AddAbilities(nil))

	// GetChannel should return one of them (both are valid)
	channel, err := GetChannel("default", "test-model", 0, "")
	require.NoError(t, err)
	require.NotNil(t, channel)
	assert.Contains(t, []int{ch1.Id, ch2.Id}, channel.Id)
}

func TestGetChannel_ReturnNilForNoAbilities(t *testing.T) {
	SetupIntegrationTestDB(t)

	// No channels/abilities exist
	channel, err := GetChannel("default", "nonexistent-model", 0, "")
	assert.NoError(t, err)
	assert.Nil(t, channel)
}

// --- merged from channel_helpers_test.go ---
func TestGetKeys_EmptyKey(t *testing.T) {
	ch := &Channel{Key: ""}
	keys := ch.GetKeys()
	assert.Empty(t, keys)
}

func TestGetKeys_SingleKey(t *testing.T) {
	ch := &Channel{Key: "sk-abc123"}
	keys := ch.GetKeys()
	assert.Equal(t, []string{"sk-abc123"}, keys)
}

func TestGetKeys_MultipleNewlineSeparated(t *testing.T) {
	ch := &Channel{Key: "key1\nkey2\nkey3"}
	keys := ch.GetKeys()
	assert.Equal(t, []string{"key1", "key2", "key3"}, keys)
}

func TestGetKeys_JSONArray(t *testing.T) {
	ch := &Channel{Key: `["key-a","key-b"]`}
	keys := ch.GetKeys()
	require.Len(t, keys, 2)
	assert.Equal(t, `"key-a"`, keys[0])
	assert.Equal(t, `"key-b"`, keys[1])
}

func TestGetKeys_CachedKeys(t *testing.T) {
	ch := &Channel{Key: "original", Keys: []string{"cached1", "cached2"}}
	keys := ch.GetKeys()
	assert.Equal(t, []string{"cached1", "cached2"}, keys)
}

func TestGetModels_Empty(t *testing.T) {
	ch := &Channel{Models: ""}
	assert.Empty(t, ch.GetModels())
}

func TestGetModels_SingleModel(t *testing.T) {
	ch := &Channel{Models: "gpt-4"}
	assert.Equal(t, []string{"gpt-4"}, ch.GetModels())
}

func TestGetModels_MultipleModels(t *testing.T) {
	ch := &Channel{Models: "gpt-3.5-turbo,gpt-4,claude-3"}
	assert.Equal(t, []string{"gpt-3.5-turbo", "gpt-4", "claude-3"}, ch.GetModels())
}

func TestGetModels_TrimsLeadingTrailingCommas(t *testing.T) {
	ch := &Channel{Models: ",gpt-4,claude-3,"}
	models := ch.GetModels()
	// strings.Trim removes leading/trailing commas
	assert.Equal(t, []string{"gpt-4", "claude-3"}, models)
}

func TestGetGroups_Empty(t *testing.T) {
	ch := &Channel{Group: ""}
	assert.Empty(t, ch.GetGroups())
}

func TestGetGroups_SingleGroup(t *testing.T) {
	ch := &Channel{Group: "default"}
	assert.Equal(t, []string{"default"}, ch.GetGroups())
}

func TestGetGroups_MultipleGroupsWithSpaces(t *testing.T) {
	ch := &Channel{Group: " default , premium , vip "}
	groups := ch.GetGroups()
	assert.Equal(t, []string{"default", "premium", "vip"}, groups)
}

func TestGetPriority_Nil(t *testing.T) {
	ch := &Channel{Priority: nil}
	assert.Equal(t, int64(0), ch.GetPriority())
}

func TestGetPriority_Set(t *testing.T) {
	p := int64(42)
	ch := &Channel{Priority: &p}
	assert.Equal(t, int64(42), ch.GetPriority())
}

func TestGetWeight_Nil(t *testing.T) {
	ch := &Channel{Weight: nil}
	assert.Equal(t, 0, ch.GetWeight())
}

func TestGetWeight_Set(t *testing.T) {
	w := uint(10)
	ch := &Channel{Weight: &w}
	assert.Equal(t, 10, ch.GetWeight())
}

func TestGetBaseURL_Nil(t *testing.T) {
	ch := &Channel{BaseURL: nil, Type: 0}
	assert.Equal(t, "", ch.GetBaseURL())
}

func TestGetBaseURL_Empty_FallsBackToConstant(t *testing.T) {
	empty := ""
	ch := &Channel{BaseURL: &empty, Type: 1} // Type 1 = OpenAI
	assert.Equal(t, constant.ChannelBaseURLs[1], ch.GetBaseURL())
}

func TestGetBaseURL_CustomURL(t *testing.T) {
	url := "https://my-proxy.example.com"
	ch := &Channel{BaseURL: &url, Type: 1}
	assert.Equal(t, "https://my-proxy.example.com", ch.GetBaseURL())
}

func TestGetTag_Nil(t *testing.T) {
	ch := &Channel{Tag: nil}
	assert.Equal(t, "", ch.GetTag())
}

func TestGetTag_Set(t *testing.T) {
	tag := "production"
	ch := &Channel{Tag: &tag}
	assert.Equal(t, "production", ch.GetTag())
}

func TestGetAutoBan_Nil(t *testing.T) {
	ch := &Channel{AutoBan: nil}
	assert.False(t, ch.GetAutoBan())
}

func TestGetAutoBan_Enabled(t *testing.T) {
	v := 1
	ch := &Channel{AutoBan: &v}
	assert.True(t, ch.GetAutoBan())
}

func TestGetAutoBan_Disabled(t *testing.T) {
	v := 0
	ch := &Channel{AutoBan: &v}
	assert.False(t, ch.GetAutoBan())
}

func TestNormalizeChannelGroupFilter(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"empty", "", ""},
		{"whitespace", "   ", ""},
		{"all_lowercase", "all", ""},
		{"All_mixed_case", "All", ""},
		{"ALL_uppercase", "ALL", ""},
		{"null_string", "null", ""},
		{"NULL_uppercase", "NULL", ""},
		{"valid_group", "premium", "premium"},
		{"trimmed", "  vip  ", "vip"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, NormalizeChannelGroupFilter(tt.input))
		})
	}
}

func TestChannelGroupFilterPattern(t *testing.T) {
	tests := []struct {
		name     string
		group    string
		expected string
	}{
		{"simple", "default", "%,default,%"},
		{"with_percent", "a%b", "%,a!%b,%"},
		{"with_underscore", "a_b", "%,a!_b,%"},
		{"with_exclamation", "a!b", "%,a!!b,%"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, channelGroupFilterPattern(tt.group))
		})
	}
}

func TestNewChannelSortOptions(t *testing.T) {
	tests := []struct {
		name          string
		sortBy        string
		sortOrder     string
		idSort        bool
		wantSortBy    string
		wantSortOrder string
	}{
		{"valid_id_asc", "id", "asc", false, "id", "asc"},
		{"valid_name_desc", "name", "desc", false, "name", "desc"},
		{"invalid_sortBy_resets", "invalid_col", "asc", false, "", ""},
		{"default_order_is_desc", "priority", "xyz", false, "priority", "desc"},
		{"case_insensitive_sortBy", "PRIORITY", "ASC", false, "priority", "asc"},
		{"whitespace_trimmed", " balance ", " desc ", false, "balance", "desc"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := NewChannelSortOptions(tt.sortBy, tt.sortOrder, tt.idSort)
			assert.Equal(t, tt.wantSortBy, opts.SortBy)
			assert.Equal(t, tt.wantSortOrder, opts.SortOrder)
			assert.Equal(t, tt.idSort, opts.IDSort)
		})
	}
}

func TestHasEnabledMultiKey(t *testing.T) {
	tests := []struct {
		name       string
		keys       []string
		statusList map[int]int
		expected   bool
	}{
		{"nil_status_list_all_enabled", []string{"k1", "k2"}, nil, true},
		{"all_disabled", []string{"k1", "k2"}, map[int]int{0: common.ChannelStatusAutoDisabled, 1: common.ChannelStatusManuallyDisabled}, false},
		{"first_enabled_explicitly", []string{"k1", "k2"}, map[int]int{0: common.ChannelStatusEnabled, 1: common.ChannelStatusAutoDisabled}, true},
		{"second_enabled_by_default", []string{"k1", "k2"}, map[int]int{0: common.ChannelStatusAutoDisabled}, true},
		{"empty_keys", []string{}, nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, hasEnabledMultiKey(tt.keys, tt.statusList))
		})
	}
}

func TestGetChannelPollingLock_SameId(t *testing.T) {
	lock1 := GetChannelPollingLock(999)
	lock2 := GetChannelPollingLock(999)
	assert.Same(t, lock1, lock2, "same channel ID must return same lock instance")
}

func TestGetChannelPollingLock_DifferentId(t *testing.T) {
	lock1 := GetChannelPollingLock(1000)
	lock2 := GetChannelPollingLock(1001)
	assert.NotSame(t, lock1, lock2, "different channel IDs must return different locks")
}

func TestGetModelMapping_Nil(t *testing.T) {
	ch := &Channel{ModelMapping: nil}
	assert.Equal(t, "", ch.GetModelMapping())
}

func TestGetModelMapping_Set(t *testing.T) {
	m := `{"gpt-4": "gpt-4-turbo"}`
	ch := &Channel{ModelMapping: &m}
	assert.Equal(t, `{"gpt-4": "gpt-4-turbo"}`, ch.GetModelMapping())
}

func TestGetStatusCodeMapping_Nil(t *testing.T) {
	ch := &Channel{StatusCodeMapping: nil}
	assert.Equal(t, "", ch.GetStatusCodeMapping())
}

func TestGetStatusCodeMapping_Set(t *testing.T) {
	m := `{"429": "503"}`
	ch := &Channel{StatusCodeMapping: &m}
	assert.Equal(t, `{"429": "503"}`, ch.GetStatusCodeMapping())
}

func TestHandlerMultiKeyUpdate_DisablesSingleKey(t *testing.T) {
	ch := &Channel{
		Key:    "key0\nkey1\nkey2",
		Status: common.ChannelStatusEnabled,
		ChannelInfo: ChannelInfo{
			IsMultiKey:   true,
			MultiKeySize: 3,
		},
	}

	handlerMultiKeyUpdate(ch, "key1", common.ChannelStatusAutoDisabled, "rate limited")

	// key1 (index=1) should be disabled
	assert.Equal(t, common.ChannelStatusAutoDisabled, ch.ChannelInfo.MultiKeyStatusList[1])
	assert.Equal(t, "rate limited", ch.ChannelInfo.MultiKeyDisabledReason[1])
	// Channel still enabled because other keys are still available
	assert.Equal(t, common.ChannelStatusEnabled, ch.Status)
}

func TestHandlerMultiKeyUpdate_AllKeysDisabled(t *testing.T) {
	ch := &Channel{
		Key:    "key0\nkey1",
		Status: common.ChannelStatusEnabled,
		ChannelInfo: ChannelInfo{
			IsMultiKey:         true,
			MultiKeySize:       2,
			MultiKeyStatusList: map[int]int{0: common.ChannelStatusAutoDisabled},
		},
	}

	// Disable the last remaining key
	handlerMultiKeyUpdate(ch, "key1", common.ChannelStatusAutoDisabled, "rate limited")

	// Channel should be auto-disabled when all keys are disabled
	assert.Equal(t, common.ChannelStatusAutoDisabled, ch.Status)
}

func TestHandlerMultiKeyUpdate_ReEnableKey(t *testing.T) {
	ch := &Channel{
		Key:    "key0\nkey1",
		Status: common.ChannelStatusAutoDisabled,
		ChannelInfo: ChannelInfo{
			IsMultiKey:             true,
			MultiKeySize:           2,
			MultiKeyStatusList:     map[int]int{0: common.ChannelStatusAutoDisabled, 1: common.ChannelStatusAutoDisabled},
			MultiKeyDisabledReason: map[int]string{0: "reason0", 1: "reason1"},
			MultiKeyDisabledTime:   map[int]int64{0: 100, 1: 200},
		},
	}

	// Re-enable key0
	handlerMultiKeyUpdate(ch, "key0", common.ChannelStatusEnabled, "")

	// key0 should be removed from status list (enabled keys are deleted from map)
	_, exists := ch.ChannelInfo.MultiKeyStatusList[0]
	assert.False(t, exists)
	// Channel should be re-enabled
	assert.Equal(t, common.ChannelStatusEnabled, ch.Status)
}

// --- merged from log_helpers_test.go ---
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

// --- merged from option_topup_test.go ---
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

// --- merged from task_db_test.go ---
func TestTaskInsertAndRetrieve(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "taskuser", "pass12345", common.RoleCommonUser)

	task := &Task{
		TaskID:     "task_test123abc",
		Platform:   "suno",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusNotStart,
		Progress:   "0%",
		SubmitTime: common.GetTimestamp(),
		Action:     "song",
		Properties: Properties{Input: "a happy song"},
	}
	require.NoError(t, task.Insert())
	require.NotZero(t, task.ID)

	// Retrieve
	fetched, exists, err := GetByTaskId(user.Id, "task_test123abc")
	require.NoError(t, err)
	assert.True(t, exists)
	require.NotNil(t, fetched)
	assert.Equal(t, "task_test123abc", fetched.TaskID)
	assert.Equal(t, TaskStatusNotStart, fetched.Status)
	assert.Equal(t, "0%", fetched.Progress)
	assert.Equal(t, "suno", string(fetched.Platform))
}

func TestGetByTaskId_NotFound(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "taskuser2", "pass12345", common.RoleCommonUser)

	_, exists, err := GetByTaskId(user.Id, "task_nonexistent")
	require.NoError(t, err)
	assert.False(t, exists)
}

func TestGetByTaskId_EmptyTaskId(t *testing.T) {
	SetupIntegrationTestDB(t)

	task, exists, err := GetByTaskId(1, "")
	require.NoError(t, err)
	assert.False(t, exists)
	assert.Nil(t, task)
}

func TestGetByTaskIds(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "taskuser3", "pass12345", common.RoleCommonUser)

	for i := 0; i < 3; i++ {
		task := &Task{
			TaskID:     GenerateTaskID(),
			Platform:   "suno",
			UserId:     user.Id,
			Group:      "default",
			ChannelId:  1,
			Status:     TaskStatusQueued,
			Progress:   "0%",
			SubmitTime: common.GetTimestamp(),
		}
		require.NoError(t, task.Insert())
	}

	// Get all tasks
	var allTasks []*Task
	require.NoError(t, db.Where("user_id = ?", user.Id).Find(&allTasks).Error)
	require.Len(t, allTasks, 3)

	// Get by IDs
	taskIds := []any{allTasks[0].TaskID, allTasks[1].TaskID}
	fetched, err := GetByTaskIds(user.Id, taskIds)
	require.NoError(t, err)
	assert.Len(t, fetched, 2)
}

func TestGetByTaskIds_EmptyList(t *testing.T) {
	SetupIntegrationTestDB(t)

	result, err := GetByTaskIds(1, []any{})
	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestTaskUpdateWithStatus_CAS(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "casuser", "pass12345", common.RoleCommonUser)

	task := &Task{
		TaskID:     "task_cas_test",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusQueued,
		Progress:   "0%",
		SubmitTime: common.GetTimestamp(),
	}
	require.NoError(t, task.Insert())

	// Update from QUEUED to IN_PROGRESS
	task.Status = TaskStatusInProgress
	task.Progress = "50%"
	won, err := task.UpdateWithStatus(TaskStatusQueued)
	require.NoError(t, err)
	assert.True(t, won, "CAS update should succeed when status matches")

	// Verify
	var updated Task
	require.NoError(t, db.First(&updated, task.ID).Error)
	assert.Equal(t, TaskStatus(TaskStatusInProgress), updated.Status)
	assert.Equal(t, "50%", updated.Progress)

	// Try again from QUEUED - should fail (status is now IN_PROGRESS)
	task.Status = TaskStatusSuccess
	won, err = task.UpdateWithStatus(TaskStatusQueued)
	require.NoError(t, err)
	assert.False(t, won, "CAS update should fail when status doesn't match")
}

func TestTaskGetAllUserTask_Filtering(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "filteruser", "pass12345", common.RoleCommonUser)

	// Create tasks with different statuses and actions
	tasks := []struct {
		taskID   string
		action   string
		status   TaskStatus
		platform string
	}{
		{"task_f1", "song", TaskStatusQueued, "suno"},
		{"task_f2", "song", TaskStatusSuccess, "suno"},
		{"task_f3", "lyrics", TaskStatusQueued, "suno"},
		{"task_f4", "video", TaskStatusInProgress, "kling"},
	}
	for _, tc := range tasks {
		task := &Task{
			TaskID:     tc.taskID,
			Platform:   "suno",
			UserId:     user.Id,
			Group:      "default",
			ChannelId:  1,
			Status:     tc.status,
			Progress:   "0%",
			SubmitTime: common.GetTimestamp(),
			Action:     tc.action,
		}
		if tc.platform == "kling" {
			task.Platform = "kling"
		}
		require.NoError(t, task.Insert())
	}

	// Filter by action
	result := TaskGetAllUserTask(user.Id, 0, 10, SyncTaskQueryParams{Action: "song"})
	assert.Len(t, result, 2)

	// Filter by status
	result = TaskGetAllUserTask(user.Id, 0, 10, SyncTaskQueryParams{Status: string(TaskStatusQueued)})
	assert.Len(t, result, 2)

	// Filter by platform
	result = TaskGetAllUserTask(user.Id, 0, 10, SyncTaskQueryParams{Platform: "kling"})
	assert.Len(t, result, 1)
	assert.Equal(t, "task_f4", result[0].TaskID)
}

func TestTaskCountAllUserTask(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "countuser2", "pass12345", common.RoleCommonUser)

	for i := 0; i < 5; i++ {
		task := &Task{
			TaskID:     GenerateTaskID(),
			Platform:   "suno",
			UserId:     user.Id,
			Group:      "default",
			ChannelId:  1,
			Status:     TaskStatusQueued,
			Progress:   "0%",
			SubmitTime: common.GetTimestamp(),
			Action:     "song",
		}
		require.NoError(t, task.Insert())
	}

	count := TaskCountAllUserTask(user.Id, SyncTaskQueryParams{})
	assert.Equal(t, int64(5), count)

	count = TaskCountAllUserTask(user.Id, SyncTaskQueryParams{Action: "nonexistent"})
	assert.Equal(t, int64(0), count)
}

func TestGetTimedOutUnfinishedTasks(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "timeoutuser", "pass12345", common.RoleCommonUser)

	now := common.GetTimestamp()

	// Create a timed-out task (submitted 2 hours ago)
	oldTask := &Task{
		TaskID:     "task_old",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusInProgress,
		Progress:   "50%",
		SubmitTime: now - 7200,
	}
	require.NoError(t, oldTask.Insert())

	// Create a recent task (submitted 1 min ago)
	recentTask := &Task{
		TaskID:     "task_recent",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusInProgress,
		Progress:   "10%",
		SubmitTime: now - 60,
	}
	require.NoError(t, recentTask.Insert())

	// Create a completed task (should not be returned)
	doneTask := &Task{
		TaskID:     "task_done",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		SubmitTime: now - 7200,
	}
	require.NoError(t, doneTask.Insert())

	// Cutoff: 1 hour ago — only oldTask should be returned
	cutoff := now - 3600
	tasks := GetTimedOutUnfinishedTasks(cutoff, 100)
	require.Len(t, tasks, 1)
	assert.Equal(t, "task_old", tasks[0].TaskID)
}

func TestHasUnfinishedSyncTasks(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "unfinished", "pass12345", common.RoleCommonUser)

	// Initially no tasks
	assert.False(t, HasUnfinishedSyncTasks())

	// Add an in-progress task
	task := &Task{
		TaskID:     "task_unfinished",
		Platform:   "suno",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusInProgress,
		Progress:   "50%",
		SubmitTime: common.GetTimestamp(),
	}
	require.NoError(t, task.Insert())
	assert.True(t, HasUnfinishedSyncTasks())

	// Mark as success
	task.Status = TaskStatusSuccess
	task.Progress = "100%"
	require.NoError(t, task.Update())
	assert.False(t, HasUnfinishedSyncTasks())
}

// --- merged from task_helpers_test.go ---
func TestTaskStatusToVideoStatus(t *testing.T) {
	tests := []struct {
		name     string
		status   TaskStatus
		expected string
	}{
		{"queued", TaskStatusQueued, dto.VideoStatusQueued},
		{"submitted", TaskStatusSubmitted, dto.VideoStatusQueued},
		{"in_progress", TaskStatusInProgress, dto.VideoStatusInProgress},
		{"success", TaskStatusSuccess, dto.VideoStatusCompleted},
		{"failure", TaskStatusFailure, dto.VideoStatusFailed},
		{"not_start", TaskStatusNotStart, dto.VideoStatusUnknown},
		{"unknown", TaskStatusUnknown, dto.VideoStatusUnknown},
		{"arbitrary", TaskStatus("WHATEVER"), dto.VideoStatusUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.status.ToVideoStatus())
		})
	}
}

func TestGenerateTaskID_Format(t *testing.T) {
	id := GenerateTaskID()
	assert.True(t, len(id) > 5, "task ID should be longer than prefix")
	assert.Equal(t, "task_", id[:5], "task ID must start with 'task_'")
}

func TestGenerateTaskID_Unique(t *testing.T) {
	ids := make(map[string]bool)
	for i := 0; i < 100; i++ {
		id := GenerateTaskID()
		assert.False(t, ids[id], "task IDs must be unique")
		ids[id] = true
	}
}

func TestGetUpstreamTaskID_WithPrivateData(t *testing.T) {
	task := &Task{
		TaskID:      "task_public123",
		PrivateData: TaskPrivateData{UpstreamTaskID: "upstream_456"},
	}
	assert.Equal(t, "upstream_456", task.GetUpstreamTaskID())
}

func TestGetUpstreamTaskID_FallbackToTaskID(t *testing.T) {
	task := &Task{
		TaskID:      "task_public123",
		PrivateData: TaskPrivateData{},
	}
	assert.Equal(t, "task_public123", task.GetUpstreamTaskID())
}

func TestGetResultURL_WithPrivateData(t *testing.T) {
	task := &Task{
		FailReason:  "legacy_url",
		PrivateData: TaskPrivateData{ResultURL: "https://cdn.example.com/video.mp4"},
	}
	assert.Equal(t, "https://cdn.example.com/video.mp4", task.GetResultURL())
}

func TestGetResultURL_FallbackToFailReason(t *testing.T) {
	task := &Task{
		FailReason:  "https://old-cdn.example.com/video.mp4",
		PrivateData: TaskPrivateData{},
	}
	assert.Equal(t, "https://old-cdn.example.com/video.mp4", task.GetResultURL())
}

func TestTaskSnapshot_Equal(t *testing.T) {
	s1 := taskSnapshot{
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		StartTime:  1000,
		FinishTime: 2000,
		FailReason: "",
		ResultURL:  "https://example.com/video.mp4",
		Data:       json.RawMessage(`{"key":"value"}`),
	}
	s2 := taskSnapshot{
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		StartTime:  1000,
		FinishTime: 2000,
		FailReason: "",
		ResultURL:  "https://example.com/video.mp4",
		Data:       json.RawMessage(`{"key":"value"}`),
	}
	assert.True(t, s1.Equal(s2))
}

func TestTaskSnapshot_NotEqual(t *testing.T) {
	base := taskSnapshot{
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		StartTime:  1000,
		FinishTime: 2000,
		FailReason: "",
		ResultURL:  "https://example.com/video.mp4",
		Data:       json.RawMessage(`{"key":"value"}`),
	}

	tests := []struct {
		name   string
		modify func(s *taskSnapshot)
	}{
		{"status", func(s *taskSnapshot) { s.Status = TaskStatusFailure }},
		{"progress", func(s *taskSnapshot) { s.Progress = "50%" }},
		{"start_time", func(s *taskSnapshot) { s.StartTime = 999 }},
		{"finish_time", func(s *taskSnapshot) { s.FinishTime = 3000 }},
		{"fail_reason", func(s *taskSnapshot) { s.FailReason = "error" }},
		{"result_url", func(s *taskSnapshot) { s.ResultURL = "different" }},
		{"data", func(s *taskSnapshot) { s.Data = json.RawMessage(`{"other":"data"}`) }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			modified := base
			tt.modify(&modified)
			assert.False(t, base.Equal(modified))
		})
	}
}

func TestTaskSetAndGetData(t *testing.T) {
	task := &Task{}
	input := map[string]string{"video_url": "https://example.com/v.mp4"}
	task.SetData(input)

	var output map[string]string
	err := task.GetData(&output)
	require.NoError(t, err)
	assert.Equal(t, input, output)
}

func TestPropertiesScanValue_RoundTrip(t *testing.T) {
	props := Properties{
		Input:             "test input",
		UpstreamModelName: "gpt-4",
		OriginModelName:   "gpt-4-turbo",
	}

	val, err := props.Value()
	require.NoError(t, err)

	var scanned Properties
	err = scanned.Scan(val)
	require.NoError(t, err)
	assert.Equal(t, props, scanned)
}

func TestPropertiesScan_EmptyBytes(t *testing.T) {
	var props Properties
	err := props.Scan([]byte{})
	require.NoError(t, err)
	assert.Equal(t, Properties{}, props)
}

func TestPropertiesValue_ZeroValue(t *testing.T) {
	props := Properties{}
	val, err := props.Value()
	require.NoError(t, err)
	assert.Nil(t, val)
}

func TestTaskPrivateDataScanValue_RoundTrip(t *testing.T) {
	pd := TaskPrivateData{
		Key:            "sk-test",
		UpstreamTaskID: "upstream_123",
		ResultURL:      "https://cdn.example.com/result.mp4",
		BillingSource:  "wallet",
		TokenId:        42,
		NodeName:       "node-1",
	}

	val, err := pd.Value()
	require.NoError(t, err)

	var scanned TaskPrivateData
	err = scanned.Scan(val)
	require.NoError(t, err)
	assert.Equal(t, pd, scanned)
}

func TestTaskPrivateDataScan_EmptyBytes(t *testing.T) {
	var pd TaskPrivateData
	err := pd.Scan([]byte{})
	require.NoError(t, err)
	assert.Equal(t, TaskPrivateData{}, pd)
}

func TestTaskPrivateDataValue_ZeroValue(t *testing.T) {
	pd := TaskPrivateData{}
	val, err := pd.Value()
	require.NoError(t, err)
	assert.Nil(t, val)
}

func TestTaskRefundLegacyCutoff_IsReasonable(t *testing.T) {
	// The cutoff is 2026-02-22 00:00:00 UTC
	assert.Equal(t, int64(1771718400), TaskRefundLegacyCutoff)
	// Verify it's a non-zero positive timestamp
	assert.Greater(t, TaskRefundLegacyCutoff, int64(0))
}

// --- merged from token_helpers_test.go ---
func TestGetIpLimits_NilAllowIps(t *testing.T) {
	token := &Token{AllowIps: nil}
	assert.Empty(t, token.GetIpLimits())
}

func TestGetIpLimits_EmptyString(t *testing.T) {
	empty := ""
	token := &Token{AllowIps: &empty}
	assert.Empty(t, token.GetIpLimits())
}

func TestGetIpLimits_SingleIP(t *testing.T) {
	ips := "192.168.1.1"
	token := &Token{AllowIps: &ips}
	assert.Equal(t, []string{"192.168.1.1"}, token.GetIpLimits())
}

func TestGetIpLimits_MultipleIPs(t *testing.T) {
	ips := "192.168.1.1\n10.0.0.1\n172.16.0.1"
	token := &Token{AllowIps: &ips}
	result := token.GetIpLimits()
	assert.Equal(t, []string{"192.168.1.1", "10.0.0.1", "172.16.0.1"}, result)
}

func TestGetIpLimits_TrimsSpacesAndCommas(t *testing.T) {
	ips := " 192.168.1.1 , \n 10.0.0.1,\n"
	token := &Token{AllowIps: &ips}
	result := token.GetIpLimits()
	assert.Equal(t, []string{"192.168.1.1", "10.0.0.1"}, result)
}

func TestGetIpLimits_IgnoresEmptyLines(t *testing.T) {
	ips := "192.168.1.1\n\n\n10.0.0.1"
	token := &Token{AllowIps: &ips}
	result := token.GetIpLimits()
	assert.Equal(t, []string{"192.168.1.1", "10.0.0.1"}, result)
}

func TestGetModelLimits_Empty(t *testing.T) {
	token := &Token{ModelLimits: ""}
	assert.Empty(t, token.GetModelLimits())
}

func TestGetModelLimits_SingleModel(t *testing.T) {
	token := &Token{ModelLimits: "gpt-4"}
	assert.Equal(t, []string{"gpt-4"}, token.GetModelLimits())
}

func TestGetModelLimits_MultipleModels(t *testing.T) {
	token := &Token{ModelLimits: "gpt-4,claude-3,gemini-pro"}
	assert.Equal(t, []string{"gpt-4", "claude-3", "gemini-pro"}, token.GetModelLimits())
}

func TestGetModelLimitsMap(t *testing.T) {
	token := &Token{ModelLimits: "gpt-4,claude-3"}
	limitsMap := token.GetModelLimitsMap()
	assert.True(t, limitsMap["gpt-4"])
	assert.True(t, limitsMap["claude-3"])
	assert.False(t, limitsMap["gpt-3.5-turbo"])
}

func TestIsModelLimitsEnabled(t *testing.T) {
	assert.True(t, (&Token{ModelLimitsEnabled: true}).IsModelLimitsEnabled())
	assert.False(t, (&Token{ModelLimitsEnabled: false}).IsModelLimitsEnabled())
}

func TestSanitizeLikePattern(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{"plain_text", "hello", "hello", false},
		{"escapes_exclamation", "a!b", "a!!b", false},
		{"escapes_underscore", "a_b", "a!_b", false},
		{"preserves_single_percent", "%hello%", "%hello%", false},
		{"escapes_both", "a!_b", "a!!!_b", false},
		{"rejects_consecutive_percent", "%%hello", "", true},
		{"rejects_too_many_percent", "%a%b%c", "", true},
		{"rejects_short_keyword_with_percent", "%a%", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := sanitizeLikePattern(tt.input)
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.want, got)
			}
		})
	}
}

func TestValidateLikePattern(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"valid_no_percent", "hello", false},
		{"valid_two_percent", "%hello%", false},
		{"valid_prefix", "%hello", false},
		{"valid_suffix", "hello%", false},
		{"invalid_consecutive", "%%test", true},
		{"invalid_three_percent", "%a%b%", true},
		{"invalid_short_keyword", "%a", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateLikePattern(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestTokenClean(t *testing.T) {
	token := &Token{Key: "sk-secret-key-12345678"}
	token.Clean()
	assert.Equal(t, "", token.Key)
}

func TestTokenGetMaskedKey(t *testing.T) {
	token := &Token{Key: "sk-abcdefgh12345678"}
	masked := token.GetMaskedKey()
	assert.Equal(t, MaskTokenKey("sk-abcdefgh12345678"), masked)
	// Verify that original key characters are partially hidden
	assert.NotEqual(t, token.Key, masked)
	assert.Contains(t, masked, "****")
}

func TestTokenGetFullKey(t *testing.T) {
	token := &Token{Key: "sk-full-key-12345"}
	assert.Equal(t, "sk-full-key-12345", token.GetFullKey())
}

// --- merged from token_validate_test.go ---
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
