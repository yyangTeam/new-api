package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetCacheRatio_KnownModels(t *testing.T) {
	tests := []struct {
		model    string
		expected float64
	}{
		{"gpt-4", 0.5},
		{"gpt-4o", 0.5},
		{"gpt-4o-mini", 0.5},
		{"gpt-4.1", 0.25},
		{"gpt-4.1-mini", 0.25},
		{"gpt-4.1-nano", 0.25},
		{"claude-3-opus-20240229", 0.1},
		{"claude-3-5-sonnet-20241022", 0.1},
		{"claude-sonnet-4-20250514", 0.1},
		{"deepseek-chat", 0.25},
		{"deepseek-reasoner", 0.25},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			ratio, ok := GetCacheRatio(tt.model)
			assert.True(t, ok)
			assert.InDelta(t, tt.expected, ratio, 0.001)
		})
	}
}

func TestGetCacheRatio_UnknownModel(t *testing.T) {
	ratio, ok := GetCacheRatio("completely-unknown-model")
	assert.False(t, ok)
	assert.InDelta(t, 1.0, ratio, 0.001)
}

func TestGetCreateCacheRatio_KnownModels(t *testing.T) {
	tests := []struct {
		model    string
		expected float64
	}{
		{"claude-3-opus-20240229", 1.25},
		{"claude-3-5-sonnet-20241022", 1.25},
		{"claude-sonnet-4-20250514", 1.25},
		{"claude-opus-4-6", 1.25},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			ratio, ok := GetCreateCacheRatio(tt.model)
			assert.True(t, ok)
			assert.InDelta(t, tt.expected, ratio, 0.001)
		})
	}
}

func TestGetCreateCacheRatio_UnknownModel(t *testing.T) {
	ratio, ok := GetCreateCacheRatio("unknown-model")
	assert.False(t, ok)
	assert.InDelta(t, 1.25, ratio, 0.001)
}

func TestUpdateCacheRatioByJSONString(t *testing.T) {
	err := UpdateCacheRatioByJSONString(`{"test-cache-model": 0.33}`)
	require.NoError(t, err)
	ratio, ok := GetCacheRatio("test-cache-model")
	assert.True(t, ok)
	assert.InDelta(t, 0.33, ratio, 0.001)
}

func TestUpdateCacheRatioByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateCacheRatioByJSONString(`{bad}`)
	assert.Error(t, err)
}

func TestUpdateCreateCacheRatioByJSONString(t *testing.T) {
	err := UpdateCreateCacheRatioByJSONString(`{"test-create-cache": 2.0}`)
	require.NoError(t, err)
	ratio, ok := GetCreateCacheRatio("test-create-cache")
	assert.True(t, ok)
	assert.InDelta(t, 2.0, ratio, 0.001)
}

func TestUpdateCreateCacheRatioByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateCreateCacheRatioByJSONString(`invalid`)
	assert.Error(t, err)
}

func TestCacheRatio2JSONString(t *testing.T) {
	s := CacheRatio2JSONString()
	assert.Contains(t, s, "{")
}

func TestCreateCacheRatio2JSONString(t *testing.T) {
	s := CreateCacheRatio2JSONString()
	assert.Contains(t, s, "{")
}

func TestGetCacheRatioMap(t *testing.T) {
	m := GetCacheRatioMap()
	assert.NotNil(t, m)
}

func TestGetCacheRatioCopy_IsolatedFromMutations(t *testing.T) {
	m := GetCacheRatioCopy()
	assert.NotNil(t, m)
	m["mutation-key"] = 999
	m2 := GetCacheRatioCopy()
	_, found := m2["mutation-key"]
	assert.False(t, found)
}

func TestGetCreateCacheRatioCopy(t *testing.T) {
	m := GetCreateCacheRatioCopy()
	assert.NotNil(t, m)
}
