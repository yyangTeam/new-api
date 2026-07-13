package setting

import (
	"fmt"
	"math"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCheckModelRequestRateLimitGroup_Valid(t *testing.T) {
	err := CheckModelRequestRateLimitGroup(`{"default":[100,1000],"vip":[0,500]}`)
	require.NoError(t, err)
}

func TestCheckModelRequestRateLimitGroup_InvalidJSON(t *testing.T) {
	err := CheckModelRequestRateLimitGroup(`not valid json`)
	require.Error(t, err)
}

func TestCheckModelRequestRateLimitGroup_NegativeTotalCount(t *testing.T) {
	err := CheckModelRequestRateLimitGroup(`{"default":[-1,100]}`)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "negative rate limit")
}

func TestCheckModelRequestRateLimitGroup_ZeroSuccessCount(t *testing.T) {
	err := CheckModelRequestRateLimitGroup(`{"default":[10,0]}`)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "negative rate limit")
}

func TestCheckModelRequestRateLimitGroup_ExceedsMaxInt32(t *testing.T) {
	maxPlus := math.MaxInt32 + 1
	jsonStr := fmt.Sprintf(`{"default":[%d,100]}`, maxPlus)
	err := CheckModelRequestRateLimitGroup(jsonStr)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "max rate limits")
}

func TestCheckModelRequestRateLimitGroup_SuccessCountExceedsMaxInt32(t *testing.T) {
	maxPlus := math.MaxInt32 + 1
	jsonStr := fmt.Sprintf(`{"default":[10,%d]}`, maxPlus)
	err := CheckModelRequestRateLimitGroup(jsonStr)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "max rate limits")
}

func TestCheckModelRequestRateLimitGroup_Empty(t *testing.T) {
	err := CheckModelRequestRateLimitGroup(`{}`)
	require.NoError(t, err)
}

func TestUpdateModelRequestRateLimitGroupByJSONString(t *testing.T) {
	err := UpdateModelRequestRateLimitGroupByJSONString(`{"group1":[50,200],"group2":[0,100]}`)
	require.NoError(t, err)

	total, success, found := GetGroupRateLimit("group1")
	assert.True(t, found)
	assert.Equal(t, 50, total)
	assert.Equal(t, 200, success)

	total, success, found = GetGroupRateLimit("group2")
	assert.True(t, found)
	assert.Equal(t, 0, total)
	assert.Equal(t, 100, success)
}

func TestUpdateModelRequestRateLimitGroupByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateModelRequestRateLimitGroupByJSONString(`{invalid}`)
	require.Error(t, err)
}

func TestGetGroupRateLimit_NotFound(t *testing.T) {
	ModelRequestRateLimitMutex.Lock()
	ModelRequestRateLimitGroup = map[string][2]int{"default": {10, 100}}
	ModelRequestRateLimitMutex.Unlock()

	_, _, found := GetGroupRateLimit("nonexistent")
	assert.False(t, found)
}

func TestGetGroupRateLimit_NilMap(t *testing.T) {
	ModelRequestRateLimitMutex.Lock()
	ModelRequestRateLimitGroup = nil
	ModelRequestRateLimitMutex.Unlock()

	_, _, found := GetGroupRateLimit("anything")
	assert.False(t, found)
}

func TestModelRequestRateLimitGroup2JSONString(t *testing.T) {
	ModelRequestRateLimitMutex.Lock()
	ModelRequestRateLimitGroup = map[string][2]int{"default": {10, 100}}
	ModelRequestRateLimitMutex.Unlock()

	s := ModelRequestRateLimitGroup2JSONString()
	assert.Contains(t, s, `"default"`)
	assert.Contains(t, s, "[10,100]")
}
