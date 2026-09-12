package reasoning

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/model_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTrimEffortSuffix(t *testing.T) {
	tests := []struct {
		name          string
		modelName     string
		wantBase      string
		wantLevel     string
		wantFound     bool
	}{
		{"max suffix", "gpt-4o-max", "gpt-4o", "max", true},
		{"xhigh suffix", "gpt-4o-xhigh", "gpt-4o", "xhigh", true},
		{"high suffix", "gpt-4o-high", "gpt-4o", "high", true},
		{"medium suffix", "gpt-4o-medium", "gpt-4o", "medium", true},
		{"low suffix", "gpt-4o-low", "gpt-4o", "low", true},
		{"minimal suffix", "gpt-4o-minimal", "gpt-4o", "minimal", true},
		{"no suffix", "gpt-4o", "gpt-4o", "", false},
		{"unsupported suffix", "gpt-4o-turbo", "gpt-4o-turbo", "", false},
		{"empty string", "", "", "", false},
		{"suffix only", "-max", "", "max", true},
		{"multiple dashes", "my-model-name-low", "my-model-name", "low", true},
		{"none not in default list", "gpt-4o-none", "gpt-4o-none", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			base, level, found := TrimEffortSuffix(tt.modelName)
			assert.Equal(t, tt.wantBase, base)
			assert.Equal(t, tt.wantLevel, level)
			assert.Equal(t, tt.wantFound, found)
		})
	}
}

func TestTrimEffortSuffixWithSuffixes(t *testing.T) {
	customSuffixes := []string{"-alpha", "-beta"}

	tests := []struct {
		name      string
		modelName string
		wantBase  string
		wantLevel string
		wantFound bool
	}{
		{"alpha suffix", "model-alpha", "model", "alpha", true},
		{"beta suffix", "model-beta", "model", "beta", true},
		{"no match", "model-gamma", "model-gamma", "", false},
		{"empty model", "", "", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			base, level, found := TrimEffortSuffixWithSuffixes(tt.modelName, customSuffixes)
			assert.Equal(t, tt.wantBase, base)
			assert.Equal(t, tt.wantLevel, level)
			assert.Equal(t, tt.wantFound, found)
		})
	}
}

func TestTrimEffortSuffixFirstMatchWins(t *testing.T) {
	base, level, found := TrimEffortSuffix("model-xhigh")
	require.True(t, found)
	assert.Equal(t, "model", base)
	assert.Equal(t, "xhigh", level)
}

func TestParseOpenAIReasoningEffortFromModelSuffix(t *testing.T) {
	tests := []struct {
		name       string
		modelName  string
		wantEffort string
		wantBase   string
	}{
		{"high effort", "o3-high", "high", "o3"},
		{"low effort", "o3-low", "low", "o3"},
		{"medium effort", "o3-medium", "medium", "o3"},
		{"minimal effort", "o3-minimal", "minimal", "o3"},
		{"none effort", "o3-none", "none", "o3"},
		{"xhigh effort", "o3-xhigh", "xhigh", "o3"},
		{"no suffix", "o3", "", "o3"},
		{"unsupported suffix", "o3-turbo", "", "o3-turbo"},
		{"empty", "", "", ""},
		{"multi-dash model", "gpt-4o-mini-high", "high", "gpt-4o-mini"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			effort, base := ParseOpenAIReasoningEffortFromModelSuffix(tt.modelName)
			assert.Equal(t, tt.wantEffort, effort)
			assert.Equal(t, tt.wantBase, base)
		})
	}
}

func TestParseDeepSeekV4ThinkingSuffix(t *testing.T) {
	tests := []struct {
		name             string
		modelName        string
		wantBase         string
		wantThinkingType string
		wantEffort       string
		wantOk           bool
	}{
		{
			"none suffix disables thinking",
			"deepseek-v4-0324-none",
			"deepseek-v4-0324",
			"disabled",
			"",
			true,
		},
		{
			"max suffix enables thinking",
			"deepseek-v4-0324-max",
			"deepseek-v4-0324",
			"enabled",
			"max",
			true,
		},
		{
			"no suffix",
			"deepseek-v4-0324",
			"deepseek-v4-0324",
			"",
			"",
			false,
		},
		{
			"non-v4 model with valid suffix",
			"deepseek-v3-0324-none",
			"deepseek-v3-0324-none",
			"",
			"",
			false,
		},
		{
			"non-deepseek model",
			"gpt-4o-none",
			"gpt-4o-none",
			"",
			"",
			false,
		},
		{
			"empty string",
			"",
			"",
			"",
			"",
			false,
		},
		{
			"deepseek-v4 prefix only",
			"deepseek-v4-",
			"deepseek-v4-",
			"",
			"",
			false,
		},
		{
			"deepseek-v4 with unsupported suffix",
			"deepseek-v4-0324-high",
			"deepseek-v4-0324-high",
			"",
			"",
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			base, thinkingType, effort, ok := ParseDeepSeekV4ThinkingSuffix(tt.modelName)
			assert.Equal(t, tt.wantBase, base)
			assert.Equal(t, tt.wantThinkingType, thinkingType)
			assert.Equal(t, tt.wantEffort, effort)
			assert.Equal(t, tt.wantOk, ok)
		})
	}
}

func TestCanonicalBillingModelNames(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []string
	}{
		{
			name: "thinking on",
			in:   "qwen3-max@thinking:on",
			want: []string{"qwen3-max@thinking:on"},
		},
		{
			name: "shuffled temperature and thinking",
			in:   "qwen3-max@temperature:0.2@thinking:on",
			want: []string{"qwen3-max@thinking:on"},
		},
		{
			name: "thinking first then temperature",
			in:   "qwen3-max@thinking:on@temperature:0.2",
			want: []string{"qwen3-max@thinking:on"},
		},
		{
			name: "budget normalizes to on",
			in:   "qwen3-max@thinking:8192",
			want: []string{"qwen3-max@thinking:on"},
		},
		{
			name: "minus one normalizes to on",
			in:   "qwen3-max@thinking:-1",
			want: []string{"qwen3-max@thinking:on"},
		},
		{
			name: "adaptive normalizes to on",
			in:   "qwen3-max@thinking:adaptive",
			want: []string{"qwen3-max@thinking:on"},
		},
		{
			name: "thinking off",
			in:   "qwen3-max@thinking:off",
			want: []string{"qwen3-max@thinking:off"},
		},
		{
			name: "effort none becomes thinking off",
			in:   "qwen3-max@effort:none",
			want: []string{"qwen3-max@thinking:off"},
		},
		{
			name: "effort high implies thinking on",
			in:   "qwen3-max@effort:high",
			want: []string{"qwen3-max@effort:high@thinking:on", "qwen3-max@thinking:on"},
		},
		{
			name: "effort and thinking keys sorted",
			in:   "qwen3-max@thinking:on@effort:high@temperature:0.2",
			want: []string{"qwen3-max@effort:high@thinking:on", "qwen3-max@thinking:on"},
		},
		{
			name: "duplicate last wins then normalize",
			in:   "qwen3-max@thinking:off@thinking:on@effort:low@effort:high",
			want: []string{"qwen3-max@effort:high@thinking:on", "qwen3-max@thinking:on"},
		},
		{
			name: "legacy thinking alias",
			in:   "claude-3-7-sonnet-thinking",
			want: []string{"claude-3-7-sonnet@thinking:on"},
		},
		{
			name: "legacy thinking budget matches explicit budget",
			in:   "gemini-2.5-flash-thinking-8192",
			want: []string{"gemini-2.5-flash@thinking:on"},
		},
		{
			name: "legacy nothinking",
			in:   "claude-3-7-sonnet-nothinking",
			want: []string{"claude-3-7-sonnet@thinking:off"},
		},
		{
			name: "temperature only has no reasoning state",
			in:   "qwen3-max@temperature:0.7",
			want: nil,
		},
	}

	geminiSettings := model_setting.GetGeminiSettings()
	oldGemini := geminiSettings.ThinkingAdapterEnabled
	geminiSettings.ThinkingAdapterEnabled = true
	t.Cleanup(func() { geminiSettings.ThinkingAdapterEnabled = oldGemini })

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, CanonicalBillingModelNames(tt.in))
		})
	}

	assert.Equal(t,
		CanonicalBillingModelNames("gemini-2.5-flash@thinking:8192"),
		CanonicalBillingModelNames("gemini-2.5-flash-thinking-8192"),
	)
	assert.Equal(t, "gpt-5.1-codex-max", BaseModelName("gpt-5.1-codex-max"))
	assert.Empty(t, CanonicalBillingModelNames("gpt-5.1-codex-max"))
}

func TestParseOpenAIReasoningEffortPreservesCodexMax(t *testing.T) {
	effort, base := ParseOpenAIReasoningEffortFromModelSuffix("gpt-5.1-codex-max")
	assert.Empty(t, effort)
	assert.Equal(t, "gpt-5.1-codex-max", base)
}

func TestBaseModelNameStripsModifiers(t *testing.T) {
	require.Equal(t, "qwen3-max", BaseModelName("qwen3-max@thinking:on@temperature:0.2"))
}

func TestExemptAtNameIsOpaqueForBillingIdentity(t *testing.T) {
	settings := model_setting.GetGlobalSettings()
	original := append([]string(nil), settings.ThinkingModelBlacklist...)
	t.Cleanup(func() { settings.ThinkingModelBlacklist = original })
	settings.ThinkingModelBlacklist = append(original, "re:.*@sha256:.*")

	const model = "opaque@sha256:deadbeef"
	assert.Equal(t, model, BaseModelName(model))
	assert.Empty(t, CanonicalBillingModelNames(model))
	assert.Equal(t, "kimi-k2-thinking", BaseModelName("kimi-k2-thinking"))
	assert.Empty(t, CanonicalBillingModelNames("kimi-k2-thinking"))
}
