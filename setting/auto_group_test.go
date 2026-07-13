package setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContainsAutoGroup(t *testing.T) {
	autoGroups = []string{"default", "vip"}
	assert.True(t, ContainsAutoGroup("default"))
	assert.True(t, ContainsAutoGroup("vip"))
	assert.False(t, ContainsAutoGroup("premium"))
	assert.False(t, ContainsAutoGroup(""))
}

func TestUpdateAutoGroupsByJsonString(t *testing.T) {
	err := UpdateAutoGroupsByJsonString(`["alpha","beta","gamma"]`)
	require.NoError(t, err)
	assert.Equal(t, []string{"alpha", "beta", "gamma"}, GetAutoGroups())
	assert.True(t, ContainsAutoGroup("alpha"))
	assert.False(t, ContainsAutoGroup("default"))
}

func TestUpdateAutoGroupsByJsonString_InvalidJSON(t *testing.T) {
	autoGroups = []string{"default"}
	err := UpdateAutoGroupsByJsonString("not valid json")
	require.Error(t, err)
}

func TestUpdateAutoGroupsByJsonString_EmptyArray(t *testing.T) {
	err := UpdateAutoGroupsByJsonString(`[]`)
	require.NoError(t, err)
	assert.Empty(t, GetAutoGroups())
	assert.False(t, ContainsAutoGroup("default"))
}

func TestAutoGroups2JsonString(t *testing.T) {
	autoGroups = []string{"a", "b"}
	s := AutoGroups2JsonString()
	assert.Equal(t, `["a","b"]`, s)
}

func TestAutoGroups2JsonString_Empty(t *testing.T) {
	autoGroups = []string{}
	s := AutoGroups2JsonString()
	assert.Equal(t, `[]`, s)
}

func TestGetAutoGroups(t *testing.T) {
	autoGroups = []string{"x", "y", "z"}
	result := GetAutoGroups()
	assert.Equal(t, []string{"x", "y", "z"}, result)
}
