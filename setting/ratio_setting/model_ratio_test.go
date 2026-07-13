package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	InitRatioSettings()
}

func TestFormatMatchingModelName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"gpt-4-gizmo-abc123", "gpt-4-gizmo-*"},
		{"gpt-4-gizmo", "gpt-4-gizmo-*"},
		{"gpt-4o-gizmo-xyz", "gpt-4o-gizmo-*"},
		{"gpt-4o-gizmo", "gpt-4o-gizmo-*"},
		{"gpt-4o", "gpt-4o"},
		{"claude-3-opus-20240229", "claude-3-opus-20240229"},
		{"gemini-2.5-flash-thinking-12345", "gemini-2.5-flash-thinking-*"},
		{"gemini-2.5-pro-thinking-99999", "gemini-2.5-pro-thinking-*"},
		{"gemini-2.5-flash-lite-thinking-abc", "gemini-2.5-flash-lite-thinking-*"},
		{"gemini-2.5-flash-lite-preview-06-17", "gemini-2.5-flash-lite-preview-06-17"},
		{"gemini-2.5-flash-preview-05-20", "gemini-2.5-flash-preview-05-20"},
		{"gemini-2.5-pro-preview-03-25", "gemini-2.5-pro-preview-03-25"},
		{"random-model", "random-model"},
		{"", ""},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, FormatMatchingModelName(tt.input))
		})
	}
}

func TestHandleThinkingBudgetModel(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		prefix   string
		wildcard string
		expected string
	}{
		{
			"matches thinking budget",
			"gemini-2.5-flash-thinking-100k",
			"gemini-2.5-flash",
			"gemini-2.5-flash-thinking-*",
			"gemini-2.5-flash-thinking-*",
		},
		{
			"no thinking keyword",
			"gemini-2.5-flash-preview",
			"gemini-2.5-flash",
			"gemini-2.5-flash-thinking-*",
			"gemini-2.5-flash-preview",
		},
		{
			"wrong prefix",
			"gemini-2.0-flash-thinking-abc",
			"gemini-2.5-flash",
			"gemini-2.5-flash-thinking-*",
			"gemini-2.0-flash-thinking-abc",
		},
		{
			"prefix matches but no thinking",
			"gemini-2.5-flash-lite",
			"gemini-2.5-flash",
			"gemini-2.5-flash-thinking-*",
			"gemini-2.5-flash-lite",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, handleThinkingBudgetModel(tt.input, tt.prefix, tt.wildcard))
		})
	}
}

func TestGetModelRatio_KnownModels(t *testing.T) {
	tests := []struct {
		model         string
		expectedRatio float64
		expectFound   bool
	}{
		{"gpt-4", 15, true},
		{"gpt-4o", 1.25, true},
		{"gpt-4o-mini", 0.075, true},
		{"claude-3-opus-20240229", 7.5, true},
		{"claude-3-5-sonnet-20241022", 1.5, true},
		{"o1", 7.5, true},
		{"o3", 1.0, true},
		{"deepseek-chat", 0.27 / 2, true},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			ratio, found, name := GetModelRatio(tt.model)
			assert.Equal(t, tt.expectFound, found)
			assert.InDelta(t, tt.expectedRatio, ratio, 0.001)
			assert.NotEmpty(t, name)
		})
	}
}

func TestGetModelRatio_GizmoWildcard(t *testing.T) {
	ratio, found, name := GetModelRatio("gpt-4-gizmo-abc123")
	assert.True(t, found)
	assert.InDelta(t, 15.0, ratio, 0.001)
	assert.Equal(t, "gpt-4-gizmo-*", name)
}

func TestGetModelRatio_ThinkingBudgetWildcard(t *testing.T) {
	ratio, found, name := GetModelRatio("gemini-2.5-flash-thinking-budget50k")
	assert.True(t, found)
	assert.InDelta(t, 0.075, ratio, 0.001)
	assert.Equal(t, "gemini-2.5-flash-thinking-*", name)
}

func TestGetModelRatio_UnknownModel(t *testing.T) {
	ratio, found, _ := GetModelRatio("completely-unknown-model-xyz")
	assert.InDelta(t, 37.5, ratio, 0.001)
	assert.False(t, found)
}

func TestGetModelPrice_KnownModels(t *testing.T) {
	tests := []struct {
		model    string
		expected float64
	}{
		{"dall-e-3", 0.04},
		{"suno_music", 0.1},
		{"suno_lyrics", 0.01},
		{"mj_imagine", 0.1},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			price, ok := GetModelPrice(tt.model, false)
			require.True(t, ok)
			assert.InDelta(t, tt.expected, price, 0.001)
		})
	}
}

func TestGetModelPrice_UnknownModel(t *testing.T) {
	price, ok := GetModelPrice("nonexistent-price-model", false)
	assert.False(t, ok)
	assert.InDelta(t, -1.0, price, 0.001)
}

func TestGetModelRatioOrPrice_PriceModel(t *testing.T) {
	value, usePrice, exist := GetModelRatioOrPrice("dall-e-3")
	assert.True(t, usePrice)
	assert.True(t, exist)
	assert.InDelta(t, 0.04, value, 0.001)
}

func TestGetModelRatioOrPrice_RatioModel(t *testing.T) {
	value, usePrice, exist := GetModelRatioOrPrice("gpt-4o")
	assert.False(t, usePrice)
	assert.True(t, exist)
	assert.InDelta(t, 1.25, value, 0.001)
}

func TestGetModelRatioOrPrice_UnknownModel(t *testing.T) {
	value, usePrice, exist := GetModelRatioOrPrice("nonexistent-model-zzzz")
	assert.False(t, usePrice)
	assert.False(t, exist)
	assert.InDelta(t, 37.5, value, 0.001)
}

func TestGetCompletionRatio_HardcodedModels(t *testing.T) {
	tests := []struct {
		model    string
		expected float64
	}{
		{"gpt-4o-2024-05-13", 3},
		{"gpt-4o", 4},
		{"gpt-4o-mini", 4},
		{"gpt-4-turbo", 3},
		{"gpt-4", 2},
		{"gpt-4-all", 2},
		{"gpt-3.5-turbo", 2},
		{"gpt-3.5-turbo-0125", 2},
		{"gpt-3.5-turbo-1106", 2},
		{"gpt-3.5-turbo-16k", 2},
		{"claude-3-opus-20240229", 5},
		{"claude-3-5-sonnet-20241022", 5},
		{"claude-sonnet-4-20250514", 5},
		{"claude-opus-4-20250514", 5},
		{"o1", 4},
		{"o3-mini", 4},
		{"chatgpt-4o-latest", 3},
		{"gemini-1.5-pro-latest", 4},
		{"gemini-2.0-flash", 4},
		{"command-r", 3},
		{"command-r-plus", 5},
		{"command-r-08-2024", 4},
		{"command-r-plus-08-2024", 4},
		{"mistral-large-latest", 3},
		{"llama2-70b-4096", 0.8 / 0.64},
		{"llama3-8b-8192", 2},
		{"llama3-70b-8192", 0.79 / 0.59},
		{"ERNIE-Speed-8K", 2},
		{"ERNIE-Lite-8K-0922", 2},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			assert.InDelta(t, tt.expected, GetCompletionRatio(tt.model), 0.01)
		})
	}
}

func TestGetCompletionRatio_GeminiVariants(t *testing.T) {
	tests := []struct {
		model    string
		expected float64
	}{
		{"gemini-2.5-pro", 8},
		{"gemini-2.5-pro-preview-03-25", 8},
		{"gemini-2.5-flash-preview-04-17", 3.5 / 0.15},
		{"gemini-2.5-flash-preview-04-17-nothinking", 4},
		{"gemini-2.5-flash-lite-preview-06-17", 4},
		{"gemini-2.5-flash", 2.5 / 0.3},
		{"gemini-robotics-er-1.5-preview", 2.5 / 0.3},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			assert.InDelta(t, tt.expected, GetCompletionRatio(tt.model), 0.01)
		})
	}
}

func TestGetCompletionRatio_Gpt5Variants(t *testing.T) {
	tests := []struct {
		model    string
		expected float64
	}{
		{"gpt-5", 8},
		{"gpt-5-mini", 8},
		{"gpt-5-nano", 8},
		{"gpt-4.5-preview", 2},
		{"gpt-4.5-preview-2025-02-27", 2},
	}
	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			assert.InDelta(t, tt.expected, GetCompletionRatio(tt.model), 0.01)
		})
	}
}

func TestGetCompletionRatio_DefaultFallback(t *testing.T) {
	ratio := GetCompletionRatio("some-unknown-model-xyz")
	assert.InDelta(t, 1.0, ratio, 0.001)
}

func TestGetCompletionRatio_MapOverridesDefault(t *testing.T) {
	ratio := GetCompletionRatio("gpt-4-gizmo-*")
	assert.InDelta(t, 2.0, ratio, 0.001)
}

func TestGetCompletionRatio_SlashModel(t *testing.T) {
	err := UpdateCompletionRatioByJSONString(`{"test/slash-model": 7.5}`)
	require.NoError(t, err)
	ratio := GetCompletionRatio("test/slash-model")
	assert.InDelta(t, 7.5, ratio, 0.001)
}

func TestGetCompletionRatioInfo_Locked(t *testing.T) {
	info := GetCompletionRatioInfo("gpt-4o-2024-05-13")
	assert.InDelta(t, 3.0, info.Ratio, 0.001)
	assert.True(t, info.Locked)
}

func TestGetCompletionRatioInfo_Unlocked(t *testing.T) {
	info := GetCompletionRatioInfo("gpt-4-all")
	assert.InDelta(t, 2.0, info.Ratio, 0.001)
	assert.False(t, info.Locked)
}

func TestGetCompletionRatioInfo_FromMap(t *testing.T) {
	err := UpdateCompletionRatioByJSONString(`{"test-info-model": 9.0}`)
	require.NoError(t, err)
	info := GetCompletionRatioInfo("test-info-model")
	assert.InDelta(t, 9.0, info.Ratio, 0.001)
	assert.False(t, info.Locked)
}

func TestUpdateModelRatioByJSONString(t *testing.T) {
	err := UpdateModelRatioByJSONString(`{"test-update-model": 99.9}`)
	require.NoError(t, err)
	ratio, found, _ := GetModelRatio("test-update-model")
	assert.True(t, found)
	assert.InDelta(t, 99.9, ratio, 0.001)
}

func TestUpdateModelRatioByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateModelRatioByJSONString(`{invalid json}`)
	assert.Error(t, err)
}

func TestUpdateModelPriceByJSONString(t *testing.T) {
	err := UpdateModelPriceByJSONString(`{"test-price-model": 0.55}`)
	require.NoError(t, err)
	price, ok := GetModelPrice("test-price-model", false)
	assert.True(t, ok)
	assert.InDelta(t, 0.55, price, 0.001)
}

func TestUpdateCompletionRatioByJSONString(t *testing.T) {
	err := UpdateCompletionRatioByJSONString(`{"test-cr-model": 3.5}`)
	require.NoError(t, err)
	ratio := GetCompletionRatio("test-cr-model")
	assert.InDelta(t, 3.5, ratio, 0.001)
}

func TestUpdateCompletionRatioByJSONString_InvalidJSON(t *testing.T) {
	err := UpdateCompletionRatioByJSONString(`not json`)
	assert.Error(t, err)
}

func TestGetAudioRatio_Known(t *testing.T) {
	ratio := GetAudioRatio("gpt-4o-audio-preview")
	assert.InDelta(t, 16.0, ratio, 0.001)
}

func TestGetAudioRatio_Unknown(t *testing.T) {
	ratio := GetAudioRatio("unknown-audio-model")
	assert.InDelta(t, 1.0, ratio, 0.001)
}

func TestGetAudioCompletionRatio_Known(t *testing.T) {
	ratio := GetAudioCompletionRatio("gpt-4o-realtime")
	assert.InDelta(t, 2.0, ratio, 0.001)
}

func TestGetAudioCompletionRatio_Unknown(t *testing.T) {
	ratio := GetAudioCompletionRatio("unknown-audio-completion")
	assert.InDelta(t, 1.0, ratio, 0.001)
}

func TestContainsAudioRatio(t *testing.T) {
	assert.True(t, ContainsAudioRatio("gpt-4o-audio-preview"))
	assert.False(t, ContainsAudioRatio("nonexistent-audio"))
}

func TestContainsAudioCompletionRatio(t *testing.T) {
	assert.True(t, ContainsAudioCompletionRatio("gpt-4o-realtime"))
	assert.False(t, ContainsAudioCompletionRatio("nonexistent-audio-completion"))
}

func TestGetImageRatio_Known(t *testing.T) {
	ratio, ok := GetImageRatio("gpt-image-1")
	assert.True(t, ok)
	assert.InDelta(t, 2.0, ratio, 0.001)
}

func TestGetImageRatio_Unknown(t *testing.T) {
	ratio, ok := GetImageRatio("nonexistent-image")
	assert.False(t, ok)
	assert.InDelta(t, 1.0, ratio, 0.001)
}

func TestUpdateImageRatioByJSONString(t *testing.T) {
	err := UpdateImageRatioByJSONString(`{"test-image-model": 5.0}`)
	require.NoError(t, err)
	ratio, ok := GetImageRatio("test-image-model")
	assert.True(t, ok)
	assert.InDelta(t, 5.0, ratio, 0.001)
}

func TestUpdateAudioRatioByJSONString(t *testing.T) {
	err := UpdateAudioRatioByJSONString(`{"test-audio": 12.0}`)
	require.NoError(t, err)
	ratio := GetAudioRatio("test-audio")
	assert.InDelta(t, 12.0, ratio, 0.001)
}

func TestUpdateAudioCompletionRatioByJSONString(t *testing.T) {
	err := UpdateAudioCompletionRatioByJSONString(`{"test-audio-comp": 3.0}`)
	require.NoError(t, err)
	ratio := GetAudioCompletionRatio("test-audio-comp")
	assert.InDelta(t, 3.0, ratio, 0.001)
}

func TestModelRatio2JSONString(t *testing.T) {
	s := ModelRatio2JSONString()
	assert.Contains(t, s, "{")
}

func TestCompletionRatio2JSONString(t *testing.T) {
	s := CompletionRatio2JSONString()
	assert.Contains(t, s, "{")
}

func TestModelPrice2JSONString(t *testing.T) {
	s := ModelPrice2JSONString()
	assert.Contains(t, s, "{")
}

func TestDefaultModelRatio2JSONString(t *testing.T) {
	s := DefaultModelRatio2JSONString()
	assert.Contains(t, s, "gpt-4")
	assert.Contains(t, s, "{")
}

func TestGetDefaultModelRatioMap(t *testing.T) {
	m := GetDefaultModelRatioMap()
	assert.NotEmpty(t, m)
	assert.Contains(t, m, "gpt-4")
}

func TestGetDefaultModelPriceMap(t *testing.T) {
	m := GetDefaultModelPriceMap()
	assert.NotEmpty(t, m)
	assert.Contains(t, m, "dall-e-3")
}

func TestGetModelRatioCopy(t *testing.T) {
	m := GetModelRatioCopy()
	assert.NotNil(t, m)
	m["mutation-test-key"] = 999
	m2 := GetModelRatioCopy()
	_, found := m2["mutation-test-key"]
	assert.False(t, found)
}

func TestGetModelPriceCopy(t *testing.T) {
	m := GetModelPriceCopy()
	assert.NotEmpty(t, m)
}

func TestGetCompletionRatioCopy(t *testing.T) {
	m := GetCompletionRatioCopy()
	assert.NotNil(t, m)
}

func TestGetImageRatioCopy(t *testing.T) {
	m := GetImageRatioCopy()
	assert.NotNil(t, m)
}

func TestGetAudioRatioCopy(t *testing.T) {
	m := GetAudioRatioCopy()
	assert.NotNil(t, m)
}

func TestGetAudioCompletionRatioCopy(t *testing.T) {
	m := GetAudioCompletionRatioCopy()
	assert.NotNil(t, m)
}

func TestGetModelPrice_CompactSuffix(t *testing.T) {
	err := UpdateModelPriceByJSONString(`{"*-openai-compact": 0.77}`)
	require.NoError(t, err)

	price, ok := GetModelPrice("some-model-openai-compact", false)
	assert.True(t, ok)
	assert.InDelta(t, 0.77, price, 0.001)
}

func TestGetModelRatio_CompactSuffix_WithWildcard(t *testing.T) {
	err := UpdateModelRatioByJSONString(`{"*-openai-compact": 42.0}`)
	require.NoError(t, err)

	ratio, found, name := GetModelRatio("any-model-openai-compact")
	assert.True(t, found)
	assert.InDelta(t, 42.0, ratio, 0.001)
	assert.Equal(t, "any-model-openai-compact", name)
}
