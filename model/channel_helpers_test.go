package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
