package setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateUserUsableGroupsByJSONString(t *testing.T) {
	err := UpdateUserUsableGroupsByJSONString(`{"premium":"Premium Group","basic":"Basic Group"}`)
	require.NoError(t, err)

	groups := GetUserUsableGroupsCopy()
	assert.Equal(t, "Premium Group", groups["premium"])
	assert.Equal(t, "Basic Group", groups["basic"])
	assert.Len(t, groups, 2)
}

func TestUpdateUserUsableGroupsByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateUserUsableGroupsByJSONString(`not json`)
	require.Error(t, err)
}

func TestGetUserUsableGroupsCopy_ReturnsCopy(t *testing.T) {
	_ = UpdateUserUsableGroupsByJSONString(`{"a":"A","b":"B"}`)

	copy1 := GetUserUsableGroupsCopy()
	copy1["c"] = "C"

	copy2 := GetUserUsableGroupsCopy()
	_, hasC := copy2["c"]
	assert.False(t, hasC)
}

func TestUserUsableGroups2JSONString(t *testing.T) {
	_ = UpdateUserUsableGroupsByJSONString(`{"default":"Default"}`)
	s := UserUsableGroups2JSONString()
	assert.Contains(t, s, `"default"`)
	assert.Contains(t, s, `"Default"`)
}

func TestGetUsableGroupDescription_Found(t *testing.T) {
	_ = UpdateUserUsableGroupsByJSONString(`{"vip":"VIP Members"}`)
	assert.Equal(t, "VIP Members", GetUsableGroupDescription("vip"))
}

func TestGetUsableGroupDescription_NotFound(t *testing.T) {
	_ = UpdateUserUsableGroupsByJSONString(`{"vip":"VIP Members"}`)
	assert.Equal(t, "unknown", GetUsableGroupDescription("unknown"))
}
