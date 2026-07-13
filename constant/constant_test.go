package constant

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetChannelTypeName_KnownTypes(t *testing.T) {
	tests := []struct {
		channelType int
		expected    string
	}{
		{ChannelTypeUnknown, "Unknown"},
		{ChannelTypeOpenAI, "OpenAI"},
		{ChannelTypeAzure, "Azure"},
		{ChannelTypeAnthropic, "Anthropic"},
		{ChannelTypeGemini, "Gemini"},
		{ChannelTypeDeepSeek, "DeepSeek"},
		{ChannelTypeAws, "AWS"},
		{ChannelTypeXai, "xAI"},
		{ChannelTypeOllama, "Ollama"},
		{ChannelTypeCustom, "Custom"},
		{ChannelTypeMidjourney, "Midjourney"},
		{ChannelTypeCohere, "Cohere"},
		{ChannelTypeSiliconFlow, "SiliconFlow"},
		{ChannelTypeKling, "Kling"},
		{ChannelTypeReplicate, "Replicate"},
		{ChannelTypeCodex, "ChatGPT Subscription (Codex)"},
		{ChannelTypeAdvancedCustom, "Advanced Custom"},
	}
	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			assert.Equal(t, tt.expected, GetChannelTypeName(tt.channelType))
		})
	}
}

func TestGetChannelTypeName_UnknownType(t *testing.T) {
	assert.Equal(t, "Unknown", GetChannelTypeName(-1))
	assert.Equal(t, "Unknown", GetChannelTypeName(99999))
}

func TestChannelTypeNames_CompleteCoverage(t *testing.T) {
	for channelType, name := range ChannelTypeNames {
		assert.NotEmpty(t, name, "channel type %d has empty name", channelType)
		assert.Equal(t, name, GetChannelTypeName(channelType))
	}
}

func TestChannelBaseURLs_LengthCoversAllChannelTypes(t *testing.T) {
	assert.GreaterOrEqual(t, len(ChannelBaseURLs), ChannelTypeDummy,
		"ChannelBaseURLs must have at least ChannelTypeDummy entries to cover all channel types")
}

func TestSunoModel2Action(t *testing.T) {
	action, ok := SunoModel2Action["suno_music"]
	assert.True(t, ok)
	assert.Equal(t, SunoActionMusic, action)

	action, ok = SunoModel2Action["suno_lyrics"]
	assert.True(t, ok)
	assert.Equal(t, SunoActionLyrics, action)

	_, ok = SunoModel2Action["nonexistent"]
	assert.False(t, ok)
}

func TestDefaultWaffoPayMethods(t *testing.T) {
	assert.Len(t, DefaultWaffoPayMethods, 3)
	assert.Equal(t, "Card", DefaultWaffoPayMethods[0].Name)
	assert.Equal(t, "Apple Pay", DefaultWaffoPayMethods[1].Name)
	assert.Equal(t, "Google Pay", DefaultWaffoPayMethods[2].Name)
}

func TestEndpointTypeValues(t *testing.T) {
	assert.Equal(t, EndpointType("openai"), EndpointTypeOpenAI)
	assert.Equal(t, EndpointType("anthropic"), EndpointTypeAnthropic)
	assert.Equal(t, EndpointType("gemini"), EndpointTypeGemini)
	assert.Equal(t, EndpointType("openai-response"), EndpointTypeOpenAIResponse)
	assert.Equal(t, EndpointType("openai-response-compact"), EndpointTypeOpenAIResponseCompact)
}

func TestMultiKeyModeValues(t *testing.T) {
	assert.Equal(t, MultiKeyMode("random"), MultiKeyModeRandom)
	assert.Equal(t, MultiKeyMode("polling"), MultiKeyModePolling)
}

func TestTaskPlatformValues(t *testing.T) {
	assert.Equal(t, TaskPlatform("suno"), TaskPlatformSuno)
	assert.Equal(t, "mj", TaskPlatformMidjourney)
}

func TestChannelSpecialBases(t *testing.T) {
	entry, ok := ChannelSpecialBases["glm-coding-plan"]
	assert.True(t, ok)
	assert.NotEmpty(t, entry.ClaudeBaseURL)
	assert.NotEmpty(t, entry.OpenAIBaseURL)

	entry, ok = ChannelSpecialBases["kimi-coding-plan"]
	assert.True(t, ok)
	assert.Contains(t, entry.ClaudeBaseURL, "kimi.com")

	_, ok = ChannelSpecialBases["nonexistent"]
	assert.False(t, ok)
}
