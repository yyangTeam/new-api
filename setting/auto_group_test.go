package setting

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateMaxTokenAutoGroupsAcceptsAnyPositiveInteger(t *testing.T) {
	original := GetMaxTokenAutoGroups()
	t.Cleanup(func() {
		require.NoError(t, UpdateMaxTokenAutoGroups(fmt.Sprintf("%d", original)))
	})

	require.NoError(t, UpdateMaxTokenAutoGroups("123456"))
	assert.Equal(t, 123456, GetMaxTokenAutoGroups())
}

func TestUpdateMaxTokenAutoGroupsRejectsInvalidValuesWithoutChangingState(t *testing.T) {
	original := GetMaxTokenAutoGroups()
	for _, value := range []string{"", "0", "-1", "1.5", "not-a-number"} {
		t.Run(value, func(t *testing.T) {
			assert.Error(t, UpdateMaxTokenAutoGroups(value))
			assert.Equal(t, original, GetMaxTokenAutoGroups())
		})
	}
}

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
