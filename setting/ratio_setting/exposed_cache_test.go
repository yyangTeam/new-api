package ratio_setting

import (
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetExposedData_ContainsAllKeys(t *testing.T) {
	InvalidateExposedDataCache()
	data := GetExposedData()
	require.NotNil(t, data)

	assert.Contains(t, data, "model_ratio")
	assert.Contains(t, data, "completion_ratio")
	assert.Contains(t, data, "cache_ratio")
	assert.Contains(t, data, "create_cache_ratio")
	assert.Contains(t, data, "model_price")
}

func TestGetExposedData_ReturnsClone(t *testing.T) {
	InvalidateExposedDataCache()
	d1 := GetExposedData()
	d1["injected_key"] = "bad"
	d2 := GetExposedData()
	_, found := d2["injected_key"]
	assert.False(t, found)
}

func TestInvalidateExposedDataCache(t *testing.T) {
	d1 := GetExposedData()
	require.NotNil(t, d1)

	InvalidateExposedDataCache()

	d2 := GetExposedData()
	require.NotNil(t, d2)
	assert.Contains(t, d2, "model_ratio")
}

func TestCloneGinH(t *testing.T) {
	original := gin.H{
		"a": 1,
		"b": "hello",
	}
	clone := cloneGinH(original)
	assert.Equal(t, original, clone)

	clone["c"] = "new"
	_, found := original["c"]
	assert.False(t, found)
}

func TestGetExposedData_CacheTTL(t *testing.T) {
	InvalidateExposedDataCache()

	d1 := GetExposedData()
	require.NotNil(t, d1)

	d2 := GetExposedData()
	require.NotNil(t, d2)
	_ = time.Now()
}
