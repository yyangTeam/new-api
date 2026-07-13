package reasoning

import (
	"testing"

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
