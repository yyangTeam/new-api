package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetGroupRatio_DefaultGroups(t *testing.T) {
	tests := []struct {
		group    string
		expected float64
	}{
		{"default", 1},
		{"vip", 1},
		{"svip", 1},
	}
	for _, tt := range tests {
		t.Run(tt.group, func(t *testing.T) {
			assert.InDelta(t, tt.expected, GetGroupRatio(tt.group), 0.001)
		})
	}
}

func TestGetGroupRatio_UnknownGroup(t *testing.T) {
	ratio := GetGroupRatio("nonexistent-group-xyz")
	assert.InDelta(t, 1.0, ratio, 0.001)
}

func TestContainsGroupRatio(t *testing.T) {
	assert.True(t, ContainsGroupRatio("default"))
	assert.True(t, ContainsGroupRatio("vip"))
	assert.False(t, ContainsGroupRatio("nonexistent-group"))
}

func TestUpdateGroupRatioByJSONString(t *testing.T) {
	err := UpdateGroupRatioByJSONString(`{"test_group": 2.5, "default": 1.0}`)
	require.NoError(t, err)
	assert.InDelta(t, 2.5, GetGroupRatio("test_group"), 0.001)
	assert.InDelta(t, 1.0, GetGroupRatio("default"), 0.001)
}

func TestUpdateGroupRatioByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateGroupRatioByJSONString(`{broken`)
	assert.Error(t, err)
}

func TestCheckGroupRatio_Valid(t *testing.T) {
	err := CheckGroupRatio(`{"default": 1.0, "vip": 0.5, "free": 0}`)
	assert.NoError(t, err)
}

func TestCheckGroupRatio_NegativeValue(t *testing.T) {
	err := CheckGroupRatio(`{"bad_group": -0.5}`)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "bad_group")
}

func TestCheckGroupRatio_InvalidJSON(t *testing.T) {
	err := CheckGroupRatio(`not json`)
	assert.Error(t, err)
}

func TestCheckGroupRatio_EmptyMap(t *testing.T) {
	err := CheckGroupRatio(`{}`)
	assert.NoError(t, err)
}

func TestGroupRatio2JSONString(t *testing.T) {
	s := GroupRatio2JSONString()
	assert.Contains(t, s, "{")
}

func TestGetGroupRatioCopy_IsolatedFromMutations(t *testing.T) {
	m := GetGroupRatioCopy()
	assert.NotNil(t, m)
	m["mutation-test"] = 999
	m2 := GetGroupRatioCopy()
	_, found := m2["mutation-test"]
	assert.False(t, found)
}

func TestGetGroupGroupRatio_Exists(t *testing.T) {
	ratio, ok := GetGroupGroupRatio("vip", "edit_this")
	assert.True(t, ok)
	assert.InDelta(t, 0.9, ratio, 0.001)
}

func TestGetGroupGroupRatio_UserGroupNotFound(t *testing.T) {
	ratio, ok := GetGroupGroupRatio("nonexistent", "edit_this")
	assert.False(t, ok)
	assert.InDelta(t, -1.0, ratio, 0.001)
}

func TestGetGroupGroupRatio_UsingGroupNotFound(t *testing.T) {
	ratio, ok := GetGroupGroupRatio("vip", "nonexistent_group")
	assert.False(t, ok)
	assert.InDelta(t, -1.0, ratio, 0.001)
}

func TestUpdateGroupGroupRatioByJSONString(t *testing.T) {
	err := UpdateGroupGroupRatioByJSONString(`{"test_user_group": {"grp_a": 0.7, "grp_b": 1.2}}`)
	require.NoError(t, err)
	ratio, ok := GetGroupGroupRatio("test_user_group", "grp_a")
	assert.True(t, ok)
	assert.InDelta(t, 0.7, ratio, 0.001)
	ratio, ok = GetGroupGroupRatio("test_user_group", "grp_b")
	assert.True(t, ok)
	assert.InDelta(t, 1.2, ratio, 0.001)
}

func TestUpdateGroupGroupRatioByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateGroupGroupRatioByJSONString(`invalid`)
	assert.Error(t, err)
}

func TestGroupGroupRatio2JSONString(t *testing.T) {
	s := GroupGroupRatio2JSONString()
	assert.Contains(t, s, "{")
}

func TestGetGroupRatioSetting(t *testing.T) {
	s := GetGroupRatioSetting()
	require.NotNil(t, s)
	require.NotNil(t, s.GroupRatio)
	require.NotNil(t, s.GroupGroupRatio)
	require.NotNil(t, s.GroupSpecialUsableGroup)
}
