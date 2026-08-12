package model_setting

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// claude.go
// ---------------------------------------------------------------------------

func TestGetClaudeSettings_EnsuresDefaultMaxTokensKey(t *testing.T) {
	orig := claudeSettings
	t.Cleanup(func() { claudeSettings = orig })

	// When the admin removes the "default" key, GetClaudeSettings must restore
	// it so GetDefaultMaxTokens always has a deterministic fallback.
	claudeSettings = ClaudeSettings{
		HeadersSettings:        map[string]map[string][]string{},
		DefaultMaxTokens:       map[string]int{},
		ThinkingAdapterEnabled: true,
		ThinkingAdapterBudgetTokensPercentage: 0.8,
	}
	s := GetClaudeSettings()
	require.NotNil(t, s)
	_, ok := s.DefaultMaxTokens["default"]
	require.True(t, ok, "GetClaudeSettings must guarantee a default max_tokens key")
	assert.Equal(t, 8192, s.DefaultMaxTokens["default"])
}

func TestGetDefaultMaxTokens_ModelOverrideThenFallback(t *testing.T) {
	orig := claudeSettings
	t.Cleanup(func() { claudeSettings = orig })

	claudeSettings = ClaudeSettings{
		DefaultMaxTokens: map[string]int{
			"default":    8192,
			"claude-opus": 4096,
		},
	}
	c := GetClaudeSettings()
	assert.Equal(t, 4096, c.GetDefaultMaxTokens("claude-opus"))
	// Unknown model falls back to the default key.
	assert.Equal(t, 8192, c.GetDefaultMaxTokens("claude-unknown-variant"))
	assert.Equal(t, 8192, c.GetDefaultMaxTokens(""))
}

func TestClaudeSettings_WriteHeaders_NoConfigForModelLeavesHeadersUntouched(t *testing.T) {
	// Cover the early-return branch when the model has no configured headers.
	settings := &ClaudeSettings{
		HeadersSettings: map[string]map[string][]string{
			"some-other-model": {"x-foo": {"bar"}},
		},
	}
	headers := http.Header{}
	headers.Set("x-keep", "v")
	settings.WriteHeaders("claude-3-5-sonnet", &headers)
	assert.Equal(t, "v", headers.Get("x-keep"))
	_, hasXFoo := headers["x-foo"]
	assert.False(t, hasXFoo)
}

func TestClaudeSettings_WriteHeaders_EmptyMergedValuesSkipsHeader(t *testing.T) {
	// If merging yields no values (e.g. only empty/whitespace tokens), the
	// header key is skipped rather than set to an empty string.
	settings := &ClaudeSettings{
		HeadersSettings: map[string]map[string][]string{
			"m": {"x-empty": {",,  ,"}},
		},
	}
	headers := http.Header{}
	settings.WriteHeaders("m", &headers)
	_, hasKey := headers["x-empty"]
	assert.False(t, hasKey)
}

// ---------------------------------------------------------------------------
// gemini.go
// ---------------------------------------------------------------------------

func TestGetGeminiSettings_ReturnsSingleton(t *testing.T) {
	require.NotNil(t, GetGeminiSettings())
}

func TestGetGeminiVersionSetting_ModelOverrideThenDefault(t *testing.T) {
	orig := geminiSettings.VersionSettings
	t.Cleanup(func() { geminiSettings.VersionSettings = orig })

	geminiSettings.VersionSettings = map[string]string{
		"default":        "v1beta",
		"gemini-1.0-pro": "v1",
	}
	// Explicit model override.
	assert.Equal(t, "v1", GetGeminiVersionSetting("gemini-1.0-pro"))
	// Unknown model falls back to the default version.
	assert.Equal(t, "v1beta", GetGeminiVersionSetting("gemini-9.9-pro"))
	assert.Equal(t, "v1beta", GetGeminiVersionSetting(""))
}

func TestIsGeminiModelSupportImagine_ListedAndUnlisted(t *testing.T) {
	orig := geminiSettings.SupportedImagineModels
	t.Cleanup(func() { geminiSettings.SupportedImagineModels = orig })

	geminiSettings.SupportedImagineModels = []string{
		"gemini-2.0-flash-exp-image-generation",
		"gemini-3-pro-image",
	}
	assert.True(t, IsGeminiModelSupportImagine("gemini-2.0-flash-exp-image-generation"))
	assert.True(t, IsGeminiModelSupportImagine("gemini-3-pro-image"))
	assert.False(t, IsGeminiModelSupportImagine("gemini-1.5-pro"))
	assert.False(t, IsGeminiModelSupportImagine(""))
}

// ---------------------------------------------------------------------------
// global.go — ChatCompletionsToResponses policy + thinking suffix
// ---------------------------------------------------------------------------

func TestIsChannelEnabled_DisabledPolicyNeverEnables(t *testing.T) {
	p := ChatCompletionsToResponsesPolicy{
		Enabled:     false,
		AllChannels: true,
	}
	assert.False(t, p.IsChannelEnabled(1, 1))
}

func TestIsChannelEnabled_AllChannelsEnablesEveryChannel(t *testing.T) {
	p := ChatCompletionsToResponsesPolicy{
		Enabled:     true,
		AllChannels: true,
	}
	assert.True(t, p.IsChannelEnabled(0, 0))
	assert.True(t, p.IsChannelEnabled(42, 7))
}

func TestIsChannelEnabled_ChannelIDAndTypeMatching(t *testing.T) {
	p := ChatCompletionsToResponsesPolicy{
		Enabled:      true,
		AllChannels:  false,
		ChannelIDs:   []int{10, 20},
		ChannelTypes: []int{3, 5},
	}
	// ID match.
	assert.True(t, p.IsChannelEnabled(10, 0))
	// Type match.
	assert.True(t, p.IsChannelEnabled(0, 5))
	// Neither matches.
	assert.False(t, p.IsChannelEnabled(99, 99))
	// Zero/zero inputs with AllChannels=false and populated lists: no match.
	assert.False(t, p.IsChannelEnabled(0, 0))
}

func TestShouldPreserveThinkingSuffix_BlacklistMembership(t *testing.T) {
	orig := globalSettings.ThinkingModelBlacklist
	t.Cleanup(func() { globalSettings.ThinkingModelBlacklist = orig })

	globalSettings.ThinkingModelBlacklist = []string{
		"  kimi-k2-thinking  ",
		"moonshotai/kimi-k2-thinking",
	}
	cases := []struct {
		model string
		want  bool
	}{
		// Trimmed match (whitespace around the entry is trimmed at lookup).
		{"kimi-k2-thinking", true},
		// Exact entry match.
		{"moonshotai/kimi-k2-thinking", true},
		// Non-blacklisted model.
		{"gpt-4o", false},
		// Empty input.
		{"", false},
		// Whitespace-only input.
		{"   ", false},
	}
	for _, c := range cases {
		t.Run(c.model, func(t *testing.T) {
			assert.Equal(t, c.want, ShouldPreserveThinkingSuffix(c.model))
		})
	}
}

func TestGetGlobalSettings_ReturnsSingleton(t *testing.T) {
	require.NotNil(t, GetGlobalSettings())
}

// ---------------------------------------------------------------------------
// grok.go + qwen.go
// ---------------------------------------------------------------------------

func TestGetGrokSettings_Defaults(t *testing.T) {
	orig := grokSettings
	t.Cleanup(func() { grokSettings = orig })

	grokSettings = defaultGrokSettings
	s := GetGrokSettings()
	require.NotNil(t, s)
	assert.True(t, s.ViolationDeductionEnabled)
	assert.InDelta(t, 0.05, s.ViolationDeductionAmount, 0.0001)
}

func TestGetQwenSettings_ReturnsSingleton(t *testing.T) {
	require.NotNil(t, GetQwenSettings())
}

func TestIsSyncImageModel_SubstringMatch(t *testing.T) {
	orig := qwenSettings.SyncImageModels
	t.Cleanup(func() { qwenSettings.SyncImageModels = orig })

	qwenSettings.SyncImageModels = []string{"z-image", "qwen-image-edit"}
	// Substring containment: a longer model name containing a listed token matches.
	assert.True(t, IsSyncImageModel("z-image"))
	assert.True(t, IsSyncImageModel("prefix-z-image-suffix"))
	assert.True(t, IsSyncImageModel("qwen-image-edit-max-2026-01-16"))
	// No substring overlap.
	assert.False(t, IsSyncImageModel("wan2.5"))
	assert.False(t, IsSyncImageModel(""))
}
