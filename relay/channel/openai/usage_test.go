package openai

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- extractCachedTokensFromBody ---

func TestExtractCachedTokensFromBody(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		want    int
		wantOk  bool
	}{
		{
			name:   "empty body",
			body:   "",
			want:   0,
			wantOk: false,
		},
		{
			name:   "standard prompt_tokens_details.cached_tokens",
			body:   `{"usage":{"prompt_tokens_details":{"cached_tokens":42}}}`,
			want:   42,
			wantOk: true,
		},
		{
			name:   "non-standard usage.cached_tokens",
			body:   `{"usage":{"cached_tokens":99}}`,
			want:   99,
			wantOk: true,
		},
		{
			name:   "non-standard usage.prompt_cache_hit_tokens",
			body:   `{"usage":{"prompt_cache_hit_tokens":77}}`,
			want:   77,
			wantOk: true,
		},
		{
			name:   "prompt_tokens_details takes priority over cached_tokens",
			body:   `{"usage":{"prompt_tokens_details":{"cached_tokens":10},"cached_tokens":20}}`,
			want:   10,
			wantOk: true,
		},
		{
			name:   "no cached tokens at all",
			body:   `{"usage":{"prompt_tokens":100}}`,
			want:   0,
			wantOk: false,
		},
		{
			name:   "invalid JSON",
			body:   `{broken}`,
			want:   0,
			wantOk: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := extractCachedTokensFromBody([]byte(tt.body))
			assert.Equal(t, tt.wantOk, ok)
			assert.Equal(t, tt.want, got)
		})
	}
}

// --- extractMoonshotCachedTokensFromBody ---

func TestExtractMoonshotCachedTokensFromBody(t *testing.T) {
	tests := []struct {
		name   string
		body   string
		want   int
		wantOk bool
	}{
		{
			name:   "empty body",
			body:   "",
			want:   0,
			wantOk: false,
		},
		{
			name:   "cached_tokens in first choice",
			body:   `{"choices":[{"usage":{"cached_tokens":55}}]}`,
			want:   55,
			wantOk: true,
		},
		{
			name:   "cached_tokens in second choice",
			body:   `{"choices":[{"usage":{}},{"usage":{"cached_tokens":33}}]}`,
			want:   33,
			wantOk: true,
		},
		{
			name:   "zero cached_tokens returns false",
			body:   `{"choices":[{"usage":{"cached_tokens":0}}]}`,
			want:   0,
			wantOk: false,
		},
		{
			name:   "no choices",
			body:   `{"choices":[]}`,
			want:   0,
			wantOk: false,
		},
		{
			name:   "invalid JSON",
			body:   `not json`,
			want:   0,
			wantOk: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := extractMoonshotCachedTokensFromBody([]byte(tt.body))
			assert.Equal(t, tt.wantOk, ok)
			assert.Equal(t, tt.want, got)
		})
	}
}

// --- extractLlamaCachedTokensFromBody ---

func TestExtractLlamaCachedTokensFromBody(t *testing.T) {
	tests := []struct {
		name   string
		body   string
		want   int
		wantOk bool
	}{
		{
			name:   "empty body",
			body:   "",
			want:   0,
			wantOk: false,
		},
		{
			name:   "timings.cache_n present",
			body:   `{"timings":{"cache_n":128}}`,
			want:   128,
			wantOk: true,
		},
		{
			name:   "timings present but no cache_n",
			body:   `{"timings":{"prompt_ms":100}}`,
			want:   0,
			wantOk: false,
		},
		{
			name:   "invalid JSON",
			body:   `{bad`,
			want:   0,
			wantOk: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := extractLlamaCachedTokensFromBody([]byte(tt.body))
			assert.Equal(t, tt.wantOk, ok)
			assert.Equal(t, tt.want, got)
		})
	}
}

// --- applyUsagePostProcessing ---

func TestApplyUsagePostProcessing(t *testing.T) {
	t.Run("nil info does not panic", func(t *testing.T) {
		usage := &dto.Usage{PromptTokens: 100}
		require.NotPanics(t, func() {
			applyUsagePostProcessing(nil, usage, nil)
		})
	})

	t.Run("nil usage does not panic", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI},
		}
		require.NotPanics(t, func() {
			applyUsagePostProcessing(info, nil, nil)
		})
	})

	t.Run("DeepSeek copies PromptCacheHitTokens to CachedTokens", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeDeepSeek},
		}
		usage := &dto.Usage{
			PromptCacheHitTokens: 200,
		}
		applyUsagePostProcessing(info, usage, nil)
		assert.Equal(t, 200, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("DeepSeek does not overwrite existing CachedTokens", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeDeepSeek},
		}
		usage := &dto.Usage{
			PromptCacheHitTokens: 200,
			PromptTokensDetails:  dto.InputTokenDetails{CachedTokens: 100},
		}
		applyUsagePostProcessing(info, usage, nil)
		assert.Equal(t, 100, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("ZhipuV4 extracts from InputTokensDetails", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeZhipu_v4},
		}
		usage := &dto.Usage{
			InputTokensDetails: &dto.InputTokenDetails{CachedTokens: 150},
		}
		applyUsagePostProcessing(info, usage, nil)
		assert.Equal(t, 150, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("ZhipuV4 extracts from response body", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeZhipu_v4},
		}
		usage := &dto.Usage{}
		body := []byte(`{"usage":{"prompt_tokens_details":{"cached_tokens":88}}}`)
		applyUsagePostProcessing(info, usage, body)
		assert.Equal(t, 88, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("ZhipuV4 falls back to PromptCacheHitTokens", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeZhipu_v4},
		}
		usage := &dto.Usage{
			PromptCacheHitTokens: 60,
		}
		applyUsagePostProcessing(info, usage, nil)
		assert.Equal(t, 60, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("Moonshot extracts from choices[].usage.cached_tokens", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeMoonshot},
		}
		usage := &dto.Usage{}
		body := []byte(`{"choices":[{"usage":{"cached_tokens":111}}]}`)
		applyUsagePostProcessing(info, usage, body)
		assert.Equal(t, 111, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("Moonshot prefers InputTokensDetails over body extraction", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeMoonshot},
		}
		usage := &dto.Usage{
			InputTokensDetails: &dto.InputTokenDetails{CachedTokens: 77},
		}
		body := []byte(`{"choices":[{"usage":{"cached_tokens":111}}]}`)
		applyUsagePostProcessing(info, usage, body)
		assert.Equal(t, 77, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("OpenAI extracts llama cache_n from timings", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI},
		}
		usage := &dto.Usage{}
		body := []byte(`{"timings":{"cache_n":256}}`)
		applyUsagePostProcessing(info, usage, body)
		assert.Equal(t, 256, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("OpenAI does not overwrite existing CachedTokens", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI},
		}
		usage := &dto.Usage{
			PromptTokensDetails: dto.InputTokenDetails{CachedTokens: 50},
		}
		body := []byte(`{"timings":{"cache_n":256}}`)
		applyUsagePostProcessing(info, usage, body)
		assert.Equal(t, 50, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("Moonshot falls back to standard body extraction", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeMoonshot},
		}
		usage := &dto.Usage{}
		// No choices[].usage.cached_tokens, but usage.prompt_tokens_details.cached_tokens present
		body := []byte(`{"usage":{"prompt_tokens_details":{"cached_tokens":55}}}`)
		applyUsagePostProcessing(info, usage, body)
		assert.Equal(t, 55, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("Moonshot falls back to PromptCacheHitTokens", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeMoonshot},
		}
		usage := &dto.Usage{
			PromptCacheHitTokens: 88,
		}
		applyUsagePostProcessing(info, usage, nil)
		assert.Equal(t, 88, usage.PromptTokensDetails.CachedTokens)
	})

	t.Run("unrecognized channel type does nothing", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: 9999},
		}
		usage := &dto.Usage{PromptTokens: 100}
		applyUsagePostProcessing(info, usage, nil)
		assert.Equal(t, 0, usage.PromptTokensDetails.CachedTokens)
	})
}

// --- common.GetPointer utility used in existing tests ---
// Verify that common.GetPointer is usable (sanity check for test infrastructure)
func TestGetPointerHelper(t *testing.T) {
	ptr := common.GetPointer(true)
	require.NotNil(t, ptr)
	assert.True(t, *ptr)
}
