// Fork-added coverage tests for the controller package. Appended here per
// the fork-aware convention (one coverage_test.go per package).
package controller

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	taskdto "github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// channel.go pure helpers
// ---------------------------------------------------------------------------

func TestParseStatusFilter(t *testing.T) {
	cases := []struct {
		in   string
		want int
	}{
		{"enabled", common.ChannelStatusEnabled},
		{"ENABLED", common.ChannelStatusEnabled},
		{"1", common.ChannelStatusEnabled},
		{"disabled", 0},
		{"0", 0},
		{"DISABLED", 0},
		{"", -1},
		{"garbage", -1},
		{"2", -1},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			assert.Equal(t, tc.want, parseStatusFilter(tc.in))
		})
	}
}

func TestEqualStringPtr(t *testing.T) {
	s1, s2 := "a", "a"
	cases := []struct {
		name string
		a, b *string
		want bool
	}{
		{"both nil", nil, nil, true},
		{"a nil", nil, &s1, false},
		{"b nil", &s1, nil, false},
		{"equal", &s1, &s2, true},
		{"unequal", &s1, lo.ToPtr("b"), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, equalStringPtr(tc.a, tc.b))
		})
	}
}

func TestMultiKeyActionRequiresSensitiveWrite(t *testing.T) {
	assert.True(t, multiKeyActionRequiresSensitiveWrite("delete_key"))
	assert.True(t, multiKeyActionRequiresSensitiveWrite("delete_disabled_keys"))
	assert.False(t, multiKeyActionRequiresSensitiveWrite("disable_key"))
	assert.False(t, multiKeyActionRequiresSensitiveWrite("enable_key"))
	assert.False(t, multiKeyActionRequiresSensitiveWrite("enable_all_keys"))
	assert.False(t, multiKeyActionRequiresSensitiveWrite("disable_all_keys"))
	assert.False(t, multiKeyActionRequiresSensitiveWrite("get_key_status"))
	assert.False(t, multiKeyActionRequiresSensitiveWrite(""))
}

func TestClearChannelInfo(t *testing.T) {
	t.Run("multi_key channel clears disabled metadata", func(t *testing.T) {
		reason := "boom"
		ts := int64(123)
		ch := &model.Channel{}
		ch.ChannelInfo.IsMultiKey = true
		ch.ChannelInfo.MultiKeyDisabledReason = map[int]string{0: reason}
		ch.ChannelInfo.MultiKeyDisabledTime = map[int]int64{0: ts}

		clearChannelInfo(ch)

		assert.Nil(t, ch.ChannelInfo.MultiKeyDisabledReason)
		assert.Nil(t, ch.ChannelInfo.MultiKeyDisabledTime)
	})

	t.Run("non multi_key channel is a no-op", func(t *testing.T) {
		reason := "boom"
		ch := &model.Channel{}
		ch.ChannelInfo.IsMultiKey = false
		ch.ChannelInfo.MultiKeyDisabledReason = map[int]string{0: reason}

		clearChannelInfo(ch)

		// unchanged because the guard short-circuits when IsMultiKey is false
		assert.Equal(t, reason, ch.ChannelInfo.MultiKeyDisabledReason[0])
	})
}

func TestGetVertexArrayKeys(t *testing.T) {
	t.Run("empty input returns nil nil", func(t *testing.T) {
		keys, err := getVertexArrayKeys("")
		require.NoError(t, err)
		assert.Nil(t, keys)
	})

	t.Run("string array is trimmed and empties dropped", func(t *testing.T) {
		keys, err := getVertexArrayKeys(`["  k1  ", "", "k2"]`)
		require.NoError(t, err)
		assert.Equal(t, []string{"k1", "k2"}, keys)
	})

	t.Run("object array is JSON-encoded back to a string", func(t *testing.T) {
		keys, err := getVertexArrayKeys(`[{"k":"v"}, {"k":"v2"}]`)
		require.NoError(t, err)
		require.Len(t, keys, 2)
		assert.Contains(t, keys[0], `"k":"v"`)
		assert.Contains(t, keys[1], `"k":"v2"`)
	})

	t.Run("invalid JSON returns error", func(t *testing.T) {
		_, err := getVertexArrayKeys(`[not json`)
		assert.Error(t, err)
	})

	t.Run("all-empty array returns error", func(t *testing.T) {
		_, err := getVertexArrayKeys(`["", "  "]`)
		assert.Error(t, err)
	})
}

// TestValidateChannel locks in the contract of the unified channel validator:
// every provider-specific branch must reject invalid input and accept valid
// input without depending on an HTTP context.
func TestValidateChannel(t *testing.T) {
	t.Run("nil channel errors", func(t *testing.T) {
		require.Error(t, validateChannel(nil, true))
	})

	t.Run("NewAPI channel requires base URL", func(t *testing.T) {
		ch := &model.Channel{Type: constant.ChannelTypeNewAPI}
		err := validateChannel(ch, false)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "base URL")
	})

	t.Run("add without key errors", func(t *testing.T) {
		ch := &model.Channel{Type: 1}
		err := validateChannel(ch, true)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "channel cannot be empty")
	})

	t.Run("add with oversized model name errors", func(t *testing.T) {
		huge := strings.Repeat("a", 256)
		ch := &model.Channel{
			Type:   1,
			Key:    "sk-key",
			Models: "gpt-4," + huge,
		}
		err := validateChannel(ch, true)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "模型名称过长")
	})

	t.Run("VertexAI requires Other region JSON with default", func(t *testing.T) {
		ch := &model.Channel{Type: constant.ChannelTypeVertexAi, Key: "k"}
		err := validateChannel(ch, false)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "部署地区不能为空")

		// missing default field
		ch.Other = `{"region2": "us-east1"}`
		err = validateChannel(ch, false)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "default")

		// malformed JSON
		ch.Other = `not json`
		err = validateChannel(ch, false)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Json格式")

		// valid
		ch.Other = `{"default": "us-central1"}`
		assert.NoError(t, validateChannel(ch, false))
	})

	t.Run("Codex key must be JSON object with access_token and account_id", func(t *testing.T) {
		ch := &model.Channel{Type: constant.ChannelTypeCodex}

		// add path: empty key is rejected by the generic "key required" guard
		// before the Codex-specific JSON check, so use a non-JSON key here.
		err := validateChannel(ch, true)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "channel cannot be empty")

		// add path: non-JSON non-empty key is rejected by the Codex JSON check
		ch.Key = "raw-key"
		err = validateChannel(ch, true)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "JSON object")

		// add path: JSON missing access_token
		ch.Key = `{"account_id":"abc"}`
		err = validateChannel(ch, true)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "access_token")

		// add path: JSON missing account_id
		ch.Key = `{"access_token":"tok"}`
		err = validateChannel(ch, true)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "account_id")

		// add path: valid
		ch.Key = `{"access_token":"tok","account_id":"abc"}`
		assert.NoError(t, validateChannel(ch, true))

		// update path: empty key is allowed (skipped)
		ch.Key = ""
		assert.NoError(t, validateChannel(ch, false))

		// update path: whitespace-only key is allowed
		ch.Key = "   "
		assert.NoError(t, validateChannel(ch, false))

		// update path: non-JSON non-empty key is rejected
		ch.Key = "raw-key"
		err = validateChannel(ch, false)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "JSON object")
	})

	t.Run("plain OpenAI channel add with key and short models passes", func(t *testing.T) {
		ch := &model.Channel{Type: 1, Key: "sk-key", Models: "gpt-4,gpt-3.5-turbo"}
		assert.NoError(t, validateChannel(ch, true))
	})
}

// ---------------------------------------------------------------------------
// channel-test.go pure helpers
// ---------------------------------------------------------------------------

func TestNormalizeChannelTestEndpoint(t *testing.T) {
	t.Run("explicit endpoint is trimmed but otherwise preserved", func(t *testing.T) {
		assert.Equal(t, "openai", normalizeChannelTestEndpoint(&model.Channel{}, "model", "openai"))
		// leading/trailing whitespace is trimmed by normalizeChannelTestEndpoint
		assert.Equal(t, "anthropic", normalizeChannelTestEndpoint(&model.Channel{}, "model", "  anthropic "))
	})

	t.Run("compact model suffix yields compact endpoint", func(t *testing.T) {
		got := normalizeChannelTestEndpoint(&model.Channel{}, "gpt-4"+ratio_setting.CompactModelSuffix, "")
		assert.Equal(t, string(constant.EndpointTypeOpenAIResponseCompact), got)
	})

	t.Run("Codex channel yields responses endpoint", func(t *testing.T) {
		ch := &model.Channel{Type: constant.ChannelTypeCodex}
		got := normalizeChannelTestEndpoint(ch, "codex-1", "")
		assert.Equal(t, string(constant.EndpointTypeOpenAIResponse), got)
	})

	t.Run("non-Codex channel with no suffix yields empty", func(t *testing.T) {
		ch := &model.Channel{Type: 1}
		assert.Equal(t, "", normalizeChannelTestEndpoint(ch, "gpt-4", ""))
	})

	t.Run("nil channel with plain model yields empty", func(t *testing.T) {
		assert.Equal(t, "", normalizeChannelTestEndpoint(nil, "gpt-4", ""))
	})
}

func TestShouldUseStreamForAutomaticChannelTest(t *testing.T) {
	assert.True(t, shouldUseStreamForAutomaticChannelTest(&model.Channel{Type: constant.ChannelTypeCodex}))
	assert.False(t, shouldUseStreamForAutomaticChannelTest(&model.Channel{Type: 1}))
	assert.False(t, shouldUseStreamForAutomaticChannelTest(nil))
}

func TestDetectErrorMessageFromJSONBytes(t *testing.T) {
	cases := []struct {
		name string
		in   []byte
		want string
	}{
		{"empty", nil, ""},
		{"not json", []byte("plain text"), ""},
		{"no error field", []byte(`{"foo":"bar"}`), ""},
		{"error.message", []byte(`{"error":{"message":"boom"}}`), "boom"},
		{"error.error.message nested", []byte(`{"error":{"error":{"message":"deep"}}}`), "deep"},
		{"error string value", []byte(`{"error":"str-msg"}`), "str-msg"},
		{"error null", []byte(`{"error":null}`), ""},
		{"error object without message falls back to raw", []byte(`{"error":{"x":1}}`), `{"x":1}`},
		{"error empty object yields generic", []byte(`{}`), ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, detectErrorMessageFromJSONBytes(tc.in))
		})
	}
}

func TestDetectErrorFromTestResponseBody(t *testing.T) {
	t.Run("empty body no error", func(t *testing.T) {
		assert.NoError(t, detectErrorFromTestResponseBody(nil))
	})

	t.Run("json error surfaced", func(t *testing.T) {
		err := detectErrorFromTestResponseBody([]byte(`{"error":{"message":"bad"}}`))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "bad")
	})

	t.Run("stream data line error surfaced", func(t *testing.T) {
		body := []byte("data: {\"error\":{\"message\":\"stream-fail\"}}\n\ndata: [DONE]\n\n")
		err := detectErrorFromTestResponseBody(body)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "stream-fail")
	})

	t.Run("non-error json body no error", func(t *testing.T) {
		assert.NoError(t, detectErrorFromTestResponseBody([]byte(`{"choices":[]}`)))
	})
}

func TestValidateStreamTestResponseBody(t *testing.T) {
	t.Run("empty errors", func(t *testing.T) {
		err := validateStreamTestResponseBody(nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "empty")
	})

	t.Run("valid first event passes", func(t *testing.T) {
		body := []byte("data: {\"id\":\"x\"}\n\ndata: [DONE]\n\n")
		assert.NoError(t, validateStreamTestResponseBody(body))
	})

	t.Run("only done marker errors", func(t *testing.T) {
		err := validateStreamTestResponseBody([]byte("data: [DONE]\n\n"))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "does not contain")
	})

	t.Run("non-data lines errors", func(t *testing.T) {
		err := validateStreamTestResponseBody([]byte(": comment\n\nsome text"))
		require.Error(t, err)
	})
}

func TestValidateTestResponseBody(t *testing.T) {
	t.Run("non-stream with error returns error", func(t *testing.T) {
		err := validateTestResponseBody([]byte(`{"error":{"message":"x"}}`), false)
		require.Error(t, err)
	})

	t.Run("non-stream clean body passes", func(t *testing.T) {
		assert.NoError(t, validateTestResponseBody([]byte(`{"ok":true}`), false))
	})

	t.Run("stream delegates to stream validator", func(t *testing.T) {
		err := validateTestResponseBody(nil, true)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "empty")
	})
}

func TestCoerceTestUsage(t *testing.T) {
	t.Run("nil non-stream errors", func(t *testing.T) {
		_, err := coerceTestUsage(nil, false, 0)
		assert.Error(t, err)
	})

	t.Run("nil stream falls back to estimate", func(t *testing.T) {
		u, err := coerceTestUsage(nil, true, 42)
		require.NoError(t, err)
		require.NotNil(t, u)
		assert.Equal(t, 42, u.PromptTokens)
		assert.Equal(t, 42, u.TotalTokens)
	})

	t.Run("default type stream falls back to estimate", func(t *testing.T) {
		u, err := coerceTestUsage("not a usage", true, 7)
		require.NoError(t, err)
		require.NotNil(t, u)
		assert.Equal(t, 7, u.PromptTokens)
	})

	t.Run("default type non-stream errors", func(t *testing.T) {
		_, err := coerceTestUsage("not a usage", false, 0)
		assert.Error(t, err)
	})

	t.Run("pointer usage returned directly", func(t *testing.T) {
		in := &dto.Usage{PromptTokens: 5}
		u, err := coerceTestUsage(in, false, 0)
		require.NoError(t, err)
		assert.Same(t, in, u)
	})

	t.Run("value usage returns copy pointer", func(t *testing.T) {
		in := dto.Usage{PromptTokens: 9, CompletionTokens: 3}
		u, err := coerceTestUsage(in, false, 0)
		require.NoError(t, err)
		require.NotNil(t, u)
		assert.Equal(t, 9, u.PromptTokens)
		assert.Equal(t, 3, u.CompletionTokens)
	})
}

func TestReadTestResponseBody(t *testing.T) {
	t.Run("non-stream reads everything", func(t *testing.T) {
		body := io.NopCloser(bytes.NewReader([]byte("hello world")))
		out, err := readTestResponseBody(body, false)
		require.NoError(t, err)
		assert.Equal(t, "hello world", string(out))
	})

	t.Run("stream is capped at 8KiB", func(t *testing.T) {
		big := bytes.Repeat([]byte("a"), 10*1024)
		body := io.NopCloser(bytes.NewReader(big))
		out, err := readTestResponseBody(body, true)
		require.NoError(t, err)
		assert.Equal(t, 8<<10, len(out))
	})
}

func TestBuildTestRequest(t *testing.T) {
	t.Run("rerank auto-detected from model name", func(t *testing.T) {
		req, ok := buildTestRequest("bge-rerank-v2", "", &model.Channel{Type: 1}, false).(*dto.RerankRequest)
		require.True(t, ok)
		assert.Equal(t, "bge-rerank-v2", req.Model)
	})

	t.Run("embedding auto-detected from model name", func(t *testing.T) {
		req, ok := buildTestRequest("text-embedding-3", "", &model.Channel{Type: 1}, false).(*dto.EmbeddingRequest)
		require.True(t, ok)
		assert.Equal(t, "text-embedding-3", req.Model)
	})

	t.Run("m3e prefix triggers embedding", func(t *testing.T) {
		_, ok := buildTestRequest("m3e-base", "", &model.Channel{Type: 1}, false).(*dto.EmbeddingRequest)
		assert.True(t, ok)
	})

	t.Run("bge substring triggers embedding", func(t *testing.T) {
		_, ok := buildTestRequest("my-bge-model", "", &model.Channel{Type: 1}, false).(*dto.EmbeddingRequest)
		assert.True(t, ok)
	})

	t.Run("compact suffix triggers compaction request", func(t *testing.T) {
		modelName := "gpt-4" + ratio_setting.CompactModelSuffix
		_, ok := buildTestRequest(modelName, "", &model.Channel{Type: 1}, false).(*dto.OpenAIResponsesCompactionRequest)
		assert.True(t, ok)
	})

	t.Run("codex in name triggers responses request", func(t *testing.T) {
		req, ok := buildTestRequest("codex-1", "", &model.Channel{Type: 1}, false).(*dto.OpenAIResponsesRequest)
		require.True(t, ok)
		assert.Equal(t, "codex-1", req.Model)
	})

	t.Run("explicit embeddings endpoint type", func(t *testing.T) {
		req, ok := buildTestRequest("m", string(constant.EndpointTypeEmbeddings), &model.Channel{Type: 1}, false).(*dto.EmbeddingRequest)
		require.True(t, ok)
		assert.Equal(t, "m", req.Model)
	})

	t.Run("explicit image generation endpoint type", func(t *testing.T) {
		req, ok := buildTestRequest("dall-e-3", string(constant.EndpointTypeImageGeneration), &model.Channel{Type: 1}, false).(*dto.ImageRequest)
		require.True(t, ok)
		assert.Equal(t, "dall-e-3", req.Model)
		assert.Equal(t, "1024x1024", req.Size)
	})

	t.Run("explicit rerank endpoint type", func(t *testing.T) {
		_, ok := buildTestRequest("r", string(constant.EndpointTypeJinaRerank), &model.Channel{Type: 1}, false).(*dto.RerankRequest)
		assert.True(t, ok)
	})

	t.Run("explicit openai-response endpoint type", func(t *testing.T) {
		req, ok := buildTestRequest("resp", string(constant.EndpointTypeOpenAIResponse), &model.Channel{Type: 1}, true).(*dto.OpenAIResponsesRequest)
		require.True(t, ok)
		require.True(t, *req.Stream)
	})

	t.Run("explicit compact endpoint type", func(t *testing.T) {
		_, ok := buildTestRequest("resp", string(constant.EndpointTypeOpenAIResponseCompact), &model.Channel{Type: 1}, false).(*dto.OpenAIResponsesCompactionRequest)
		assert.True(t, ok)
	})

	t.Run("explicit anthropic endpoint type", func(t *testing.T) {
		req, ok := buildTestRequest("claude-3", string(constant.EndpointTypeAnthropic), &model.Channel{Type: 1}, false).(*dto.ClaudeRequest)
		require.True(t, ok)
		assert.Equal(t, "claude-3", req.Model)
	})

	t.Run("explicit gemini endpoint type", func(t *testing.T) {
		req, ok := buildTestRequest("gemini-1.5", string(constant.EndpointTypeGemini), &model.Channel{Type: 1}, false).(*dto.GeminiChatRequest)
		require.True(t, ok)
		require.Len(t, req.Contents, 1)
	})

	t.Run("explicit openai endpoint type non-stream omits stream options", func(t *testing.T) {
		req, ok := buildTestRequest("gpt-4", string(constant.EndpointTypeOpenAI), &model.Channel{Type: 1}, false).(*dto.GeneralOpenAIRequest)
		require.True(t, ok)
		require.False(t, *req.Stream)
		assert.Nil(t, req.StreamOptions)
	})

	t.Run("explicit openai endpoint type stream sets include usage", func(t *testing.T) {
		req, ok := buildTestRequest("gpt-4", string(constant.EndpointTypeOpenAI), &model.Channel{Type: 1}, true).(*dto.GeneralOpenAIRequest)
		require.True(t, ok)
		require.True(t, *req.Stream)
		require.NotNil(t, req.StreamOptions)
		assert.True(t, req.StreamOptions.IncludeUsage)
	})

	t.Run("default chat request for reasoning-o model uses max_completion_tokens", func(t *testing.T) {
		req, ok := buildTestRequest("o1-preview", "", &model.Channel{Type: 1}, false).(*dto.GeneralOpenAIRequest)
		require.True(t, ok)
		require.NotNil(t, req.MaxCompletionTokens)
		assert.Nil(t, req.MaxTokens)
	})

	t.Run("default chat request for thinking non-claude model caps max_tokens", func(t *testing.T) {
		req, ok := buildTestRequest("deepseek-thinking", "", &model.Channel{Type: 1}, false).(*dto.GeneralOpenAIRequest)
		require.True(t, ok)
		require.NotNil(t, req.MaxTokens)
		assert.Equal(t, uint(50), *req.MaxTokens)
	})

	t.Run("default chat request for gemini model caps max_tokens at 3000", func(t *testing.T) {
		req, ok := buildTestRequest("gemini-1.5-pro", "", &model.Channel{Type: 1}, false).(*dto.GeneralOpenAIRequest)
		require.True(t, ok)
		require.NotNil(t, req.MaxTokens)
		assert.Equal(t, uint(3000), *req.MaxTokens)
	})

	t.Run("default chat request for plain model caps max_tokens at 16", func(t *testing.T) {
		req, ok := buildTestRequest("gpt-4o", "", &model.Channel{Type: 1}, true).(*dto.GeneralOpenAIRequest)
		require.True(t, ok)
		require.NotNil(t, req.MaxTokens)
		assert.Equal(t, uint(16), *req.MaxTokens)
		require.True(t, *req.Stream)
		require.NotNil(t, req.StreamOptions)
	})

	t.Run("thinking claude model leaves max_tokens nil", func(t *testing.T) {
		req, ok := buildTestRequest("claude-thinking-1", "", &model.Channel{Type: 1}, false).(*dto.GeneralOpenAIRequest)
		require.True(t, ok)
		assert.Nil(t, req.MaxTokens)
	})
}

// ---------------------------------------------------------------------------
// system_update.go pure helpers
// ---------------------------------------------------------------------------

func TestFindAssetURL(t *testing.T) {
	assets := []releaseAsset{
		{Name: "wrong", BrowserDownloadURL: "https://example.com/wrong"},
		{Name: "new-api-v1.2.3", BrowserDownloadURL: "https://example.com/right"},
	}
	assert.Equal(t, "https://example.com/right", findAssetURL(assets, "new-api-v1.2.3"))
	assert.Equal(t, "", findAssetURL(assets, "missing"))
	assert.Equal(t, "", findAssetURL(nil, "anything"))
}

func TestBuildReleasesURL(t *testing.T) {
	oldBase := common.UpdateCheckApiBase
	oldRepo := common.UpdateCheckRepo
	t.Cleanup(func() {
		common.UpdateCheckApiBase = oldBase
		common.UpdateCheckRepo = oldRepo
	})

	common.UpdateCheckApiBase = "https://api.github.com"
	common.UpdateCheckRepo = "org/repo"
	assert.Equal(t, "https://api.github.com/repos/org/repo/releases/latest", buildReleasesURL("/releases/latest"))

	// trailing slash on base is trimmed
	common.UpdateCheckApiBase = "https://api.github.com/"
	assert.Equal(t, "https://api.github.com/repos/org/repo/releases/tags/v1", buildReleasesURL("/releases/tags/v1"))
}

func TestPickAssetName(t *testing.T) {
	// The asset name embeds the running platform and tag; assert the observable
	// contract for each supported platform so the release-workflow naming stays
	// stable. The tag is always present.
	name := pickAssetName("v0.0.1")
	assert.Contains(t, name, "v0.0.1")

	switch {
	case runtime.GOOS == "linux" && runtime.GOARCH == "amd64":
		assert.Equal(t, "new-api-v0.0.1", name)
	case runtime.GOOS == "linux" && runtime.GOARCH == "arm64":
		assert.Equal(t, "new-api-arm64-v0.0.1", name)
	case runtime.GOOS == "darwin" && runtime.GOARCH == "amd64":
		assert.Equal(t, "new-api-darwin-amd64-v0.0.1", name)
	case runtime.GOOS == "darwin" && runtime.GOARCH == "arm64":
		assert.Equal(t, "new-api-darwin-arm64-v0.0.1", name)
	case runtime.GOOS == "windows" && runtime.GOARCH == "amd64":
		assert.Equal(t, "new-api-windows-amd64-v0.0.1.exe", name)
	default:
		assert.Equal(t, "new-api-"+runtime.GOOS+"-"+runtime.GOARCH+"-v0.0.1", name)
	}
}

// ---------------------------------------------------------------------------
// oauth.go pure helpers
// ---------------------------------------------------------------------------

func TestProviderParams(t *testing.T) {
	p := providerParams("GitHub")
	assert.Equal(t, "GitHub", p["Provider"])
	assert.Len(t, p, 1)
}

func TestOAuthErrorTypesMessages(t *testing.T) {
	assert.Equal(t, "user has been deleted", (&OAuthUserDeletedError{}).Error())
	assert.Equal(t, "registration is disabled", (&OAuthRegistrationDisabledError{}).Error())
	assert.Equal(t, "email is already in use", (&OAuthEmailAlreadyTakenError{}).Error())
}

// ---------------------------------------------------------------------------
// relay.go pure helpers
// ---------------------------------------------------------------------------

func TestAddUsedChannelAppendsAndStores(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("use_channel", []string{"1"})

	addUsedChannel(c, 7)

	got, ok := c.Get("use_channel")
	require.True(t, ok)
	sl, ok := got.([]string)
	require.True(t, ok)
	assert.Equal(t, []string{"1", "7"}, sl)
}

func TestFastTokenCountMetaForPricing(t *testing.T) {
	t.Run("nil request returns empty meta", func(t *testing.T) {
		meta := fastTokenCountMetaForPricing(nil)
		require.NotNil(t, meta)
	})

	t.Run("general request picks larger of max_tokens and max_completion_tokens", func(t *testing.T) {
		// max_completion_tokens wins
		req := &dto.GeneralOpenAIRequest{
			MaxTokens:           lo.ToPtr(uint(10)),
			MaxCompletionTokens: lo.ToPtr(uint(20)),
		}
		meta := fastTokenCountMetaForPricing(req)
		require.NotNil(t, meta)
		assert.Equal(t, 20, meta.MaxTokens)

		// max_tokens wins when larger
		req2 := &dto.GeneralOpenAIRequest{
			MaxTokens:           lo.ToPtr(uint(30)),
			MaxCompletionTokens: lo.ToPtr(uint(20)),
		}
		meta2 := fastTokenCountMetaForPricing(req2)
		assert.Equal(t, 30, meta2.MaxTokens)
	})

	t.Run("general request with nil token fields yields zero", func(t *testing.T) {
		meta := fastTokenCountMetaForPricing(&dto.GeneralOpenAIRequest{})
		require.NotNil(t, meta)
		assert.Equal(t, 0, meta.MaxTokens)
	})

	t.Run("responses request uses max_output_tokens", func(t *testing.T) {
		req := &dto.OpenAIResponsesRequest{MaxOutputTokens: lo.ToPtr(uint(40))}
		meta := fastTokenCountMetaForPricing(req)
		require.NotNil(t, meta)
		assert.Equal(t, 40, meta.MaxTokens)
	})

	t.Run("claude request uses max_tokens", func(t *testing.T) {
		req := &dto.ClaudeRequest{MaxTokens: lo.ToPtr(uint(50))}
		meta := fastTokenCountMetaForPricing(req)
		require.NotNil(t, meta)
		assert.Equal(t, 50, meta.MaxTokens)
	})

	t.Run("image request delegates to its own GetTokenCountMeta", func(t *testing.T) {
		req := &dto.ImageRequest{Model: "dall-e-3", N: lo.ToPtr(uint(1))}
		meta := fastTokenCountMetaForPricing(req)
		// ImageRequest.GetTokenCountMeta is the source of truth; just assert
		// delegation produced a non-nil meta here.
		require.NotNil(t, meta)
	})

	t.Run("unknown request type yields empty meta with tokenizer type", func(t *testing.T) {
		meta := fastTokenCountMetaForPricing(&dto.EmbeddingRequest{Model: "x"})
		require.NotNil(t, meta)
		assert.Equal(t, types.TokenTypeTokenizer, meta.TokenType)
	})
}

// TestShouldRetry locks in the relay retry decision matrix. It exercises the
// pure parts of shouldRetry: channel errors always retry, skip-retry errors
// never retry, status-code range rules, and the specific_channel_id guard.
func TestShouldRetry(t *testing.T) {
	gin.SetMode(gin.TestMode)
	newCtx := func() *gin.Context {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		return c
	}

	t.Run("nil error never retries", func(t *testing.T) {
		assert.False(t, shouldRetry(newCtx(), nil, 3))
	})

	t.Run("channel error always retries regardless of budget", func(t *testing.T) {
		err := types.NewError(errors.New("channel down"), types.ErrorCodeChannelInvalidKey)
		assert.True(t, shouldRetry(newCtx(), err, 0))
	})

	t.Run("skip-retry error never retries", func(t *testing.T) {
		err := types.NewError(errors.New("bad body"), types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
		assert.False(t, shouldRetry(newCtx(), err, 3))
	})

	t.Run("zero budget never retries", func(t *testing.T) {
		err := types.NewErrorWithStatusCode(errors.New("boom"), types.ErrorCodeInvalidRequest, http.StatusBadGateway)
		assert.False(t, shouldRetry(newCtx(), err, 0))
	})

	t.Run("specific channel id never retries", func(t *testing.T) {
		c := newCtx()
		c.Set("specific_channel_id", 42)
		err := types.NewErrorWithStatusCode(errors.New("boom"), types.ErrorCodeInvalidRequest, http.StatusBadGateway)
		assert.False(t, shouldRetry(c, err, 3))
	})

	t.Run("2xx never retries", func(t *testing.T) {
		err := types.NewErrorWithStatusCode(errors.New("ok?"), types.ErrorCodeInvalidRequest, http.StatusOK)
		assert.False(t, shouldRetry(newCtx(), err, 3))
	})

	t.Run("out-of-range status code retries", func(t *testing.T) {
		err := types.NewErrorWithStatusCode(errors.New("weird"), types.ErrorCodeInvalidRequest, 700)
		assert.True(t, shouldRetry(newCtx(), err, 3))
	})

	t.Run("504 always-skip status does not retry", func(t *testing.T) {
		err := types.NewErrorWithStatusCode(errors.New("gateway timeout"), types.ErrorCodeInvalidRequest, http.StatusGatewayTimeout)
		assert.False(t, shouldRetry(newCtx(), err, 3))
	})

	t.Run("500 retries", func(t *testing.T) {
		err := types.NewErrorWithStatusCode(errors.New("server"), types.ErrorCodeInvalidRequest, http.StatusInternalServerError)
		assert.True(t, shouldRetry(newCtx(), err, 3))
	})

	t.Run("400 does not retry (outside retry ranges)", func(t *testing.T) {
		err := types.NewErrorWithStatusCode(errors.New("bad req"), types.ErrorCodeInvalidRequest, http.StatusBadRequest)
		assert.False(t, shouldRetry(newCtx(), err, 3))
	})

	t.Run("429 retries", func(t *testing.T) {
		err := types.NewErrorWithStatusCode(errors.New("rate"), types.ErrorCodeInvalidRequest, http.StatusTooManyRequests)
		assert.True(t, shouldRetry(newCtx(), err, 3))
	})
}

// TestShouldRetryTaskRelay locks in the task relay retry decision matrix.
func TestShouldRetryTaskRelay(t *testing.T) {
	gin.SetMode(gin.TestMode)
	newCtx := func() *gin.Context {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		return c
	}

	t.Run("nil error never retries", func(t *testing.T) {
		assert.False(t, shouldRetryTaskRelay(newCtx(), 1, nil, 3))
	})

	t.Run("zero budget never retries", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: http.StatusBadGateway, Error: errors.New("boom")}
		assert.False(t, shouldRetryTaskRelay(newCtx(), 1, err, 0))
	})

	t.Run("specific channel id never retries", func(t *testing.T) {
		c := newCtx()
		c.Set("specific_channel_id", 9)
		err := &taskdto.TaskError{StatusCode: http.StatusBadGateway, Error: errors.New("boom")}
		assert.False(t, shouldRetryTaskRelay(c, 1, err, 3))
	})

	t.Run("429 always retries", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: http.StatusTooManyRequests, Error: errors.New("rate")}
		assert.True(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))
	})

	t.Run("307 always retries", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: 307, Error: errors.New("redirect")}
		assert.True(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))
	})

	t.Run("5xx retries unless always-skip status", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: http.StatusBadGateway, Error: errors.New("boom")}
		assert.True(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))

		// 504 is in the always-skip status list -> no retry
		err504 := &taskdto.TaskError{StatusCode: http.StatusGatewayTimeout, Error: errors.New("timeout")}
		assert.False(t, shouldRetryTaskRelay(newCtx(), 1, err504, 3))
	})

	t.Run("400 never retries", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: http.StatusBadRequest, Error: errors.New("bad")}
		assert.False(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))
	})

	t.Run("408 never retries", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: http.StatusRequestTimeout, Error: errors.New("timeout")}
		assert.False(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))
	})

	t.Run("local error on 4xx never retries", func(t *testing.T) {
		// A 4xx status (e.g. 409) that isn't 400/408/429 reaches the LocalError
		// guard; local errors must not retry regardless of remaining budget.
		err := &taskdto.TaskError{StatusCode: http.StatusConflict, Error: errors.New("local"), LocalError: true}
		assert.False(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))
	})

	t.Run("2xx never retries", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: http.StatusOK, Error: errors.New("ok")}
		assert.False(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))
	})

	t.Run("unknown 4xx retries", func(t *testing.T) {
		err := &taskdto.TaskError{StatusCode: http.StatusConflict, Error: errors.New("conflict")}
		assert.True(t, shouldRetryTaskRelay(newCtx(), 1, err, 3))
	})
}

func TestRespondTaskError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Run("non-429 error passed through as-is", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		orig := &taskdto.TaskError{StatusCode: http.StatusBadGateway, Message: "boom", Code: "x"}
		respondTaskError(c, orig)
		assert.Equal(t, http.StatusBadGateway, w.Code)
		// message unchanged
		assert.Contains(t, w.Body.String(), "boom")
	})

	t.Run("429 message rewritten to saturation hint", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		orig := &taskdto.TaskError{StatusCode: http.StatusTooManyRequests, Message: "orig", Code: "x"}
		respondTaskError(c, orig)
		assert.Equal(t, http.StatusTooManyRequests, w.Code)
		assert.Contains(t, orig.Message, "负载已饱和")
	})
}

// ---------------------------------------------------------------------------
// user.go pure helpers (DB-free where possible)
// ---------------------------------------------------------------------------

func TestCanManageTargetRole(t *testing.T) {
	cases := []struct {
		name             string
		myRole, target   int
		want             bool
	}{
		{"root manages anyone", common.RoleRootUser, common.RoleCommonUser, true},
		{"root manages admin", common.RoleRootUser, common.RoleAdminUser, true},
		{"admin manages common", common.RoleAdminUser, common.RoleCommonUser, true},
		{"admin cannot manage equal admin", common.RoleAdminUser, common.RoleAdminUser, false},
		{"admin cannot manage root", common.RoleAdminUser, common.RoleRootUser, false},
		{"common cannot manage admin", common.RoleCommonUser, common.RoleAdminUser, false},
		{"common cannot manage equal", common.RoleCommonUser, common.RoleCommonUser, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, canManageTargetRole(tc.myRole, tc.target))
		})
	}
}

func TestCalculateUserPermissions(t *testing.T) {
	t.Run("root has no sidebar_settings and empty modules", func(t *testing.T) {
		p := calculateUserPermissions(common.RoleRootUser)
		assert.False(t, p["sidebar_settings"].(bool))
		mod, ok := p["sidebar_modules"].(map[string]interface{})
		require.True(t, ok)
		assert.Empty(t, mod)
	})

	t.Run("admin has sidebar_settings and admin.setting=false", func(t *testing.T) {
		p := calculateUserPermissions(common.RoleAdminUser)
		assert.True(t, p["sidebar_settings"].(bool))
		mod := p["sidebar_modules"].(map[string]interface{})
		admin := mod["admin"].(map[string]interface{})
		assert.False(t, admin["setting"].(bool))
	})

	t.Run("common user has sidebar_settings and admin=false", func(t *testing.T) {
		p := calculateUserPermissions(common.RoleCommonUser)
		assert.True(t, p["sidebar_settings"].(bool))
		mod := p["sidebar_modules"].(map[string]interface{})
		// admin entry is a bool false, not a map
		assert.Equal(t, false, mod["admin"])
	})
}

func TestGenerateDefaultSidebarConfig(t *testing.T) {
	t.Run("root config includes admin.setting=true", func(t *testing.T) {
		cfg := generateDefaultSidebarConfig(common.RoleRootUser)
		require.NotEmpty(t, cfg)
		assert.Contains(t, cfg, `"chat"`)
		assert.Contains(t, cfg, `"console"`)
		assert.Contains(t, cfg, `"personal"`)
		assert.Contains(t, cfg, `"admin"`)
		assert.Contains(t, cfg, `"setting":true`)
	})

	t.Run("admin config includes admin.setting=false", func(t *testing.T) {
		cfg := generateDefaultSidebarConfig(common.RoleAdminUser)
		require.NotEmpty(t, cfg)
		assert.Contains(t, cfg, `"admin"`)
		// admin block present with setting:false
		assert.Contains(t, cfg, `"setting":false`)
	})

	t.Run("common user config has no admin block", func(t *testing.T) {
		cfg := generateDefaultSidebarConfig(common.RoleCommonUser)
		require.NotEmpty(t, cfg)
		assert.NotContains(t, cfg, `"admin"`)
		assert.Contains(t, cfg, `"chat"`)
		assert.Contains(t, cfg, `"console"`)
		assert.Contains(t, cfg, `"personal"`)
	})
}

func TestLoginMethodFromContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Each case pairs a request URL with the route template it should match.
	// gin's test context does not populate FullPath, so we replay the request
	// through a throwaway engine that has the template registered; the matched
	// route sets FullPath and params on the context.
	cases := []struct {
		name     string
		template string
		url      string
		want     string
	}{
		{"password login", "/api/user/login", "/api/user/login", "password"},
		{"2fa login", "/api/user/login/2fa", "/api/user/login/2fa", "2fa"},
		{"passkey finish", "/api/user/passkey/login/finish", "/api/user/passkey/login/finish", "passkey"},
		{"wechat oauth", "/api/oauth/wechat", "/api/oauth/wechat", "wechat"},
		{"telegram login", "/api/oauth/telegram/login", "/api/oauth/telegram/login", "telegram"},
		{"generic oauth provider", "/api/oauth/:provider", "/api/oauth/discord", "oauth:discord"},
		{"unknown path", "/api/unknown", "/api/unknown", "unknown"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := gin.New()
			var got string
			r.Handle(http.MethodPost, tc.template, func(c *gin.Context) {
				// Read FullPath synchronously inside the handler; gin sets it
				// before dispatching, and reading it here avoids Copy() which
				// drops the unexported fullPath field.
				got = loginMethodFromContext(c)
			})
			req := httptest.NewRequest(http.MethodPost, tc.url, nil)
			r.ServeHTTP(httptest.NewRecorder(), req)
			assert.Equal(t, tc.want, got)
		})
	}
}

func TestCheckUpdatePassword(t *testing.T) {
	db := setupIntegrationDB(t)

	hashed, err := common.Password2Hash("correct-password-1")
	require.NoError(t, err)
	user := &model.User{
		Username: "pwuser",
		Password: hashed,
		Role:     common.RoleCommonUser,
		Status:   common.UserStatusEnabled,
		Group:    "default",
		AffCode:  common.GetRandomString(4),
	}
	require.NoError(t, db.Create(user).Error)

	t.Run("empty new password returns false no error", func(t *testing.T) {
		// newPassword == "" short-circuits before any password validation.
		update, err := checkUpdatePassword("ignored-original", "", user.Id)
		require.NoError(t, err)
		assert.False(t, update)
	})

	t.Run("unset current password returns errUserPasswordUnset", func(t *testing.T) {
		// user with empty password hash
		empty := &model.User{
			Username: "nopw",
			Role:     common.RoleCommonUser,
			Status:   common.UserStatusEnabled,
			Group:    "default",
			AffCode:  common.GetRandomString(4),
		}
		require.NoError(t, db.Create(empty).Error)
		_, err := checkUpdatePassword("old", "new", empty.Id)
		assert.ErrorIs(t, err, errUserPasswordUnset)
	})

	t.Run("wrong original password returns errOriginalPasswordFail", func(t *testing.T) {
		_, err := checkUpdatePassword("wrong", "newpass", user.Id)
		assert.ErrorIs(t, err, errOriginalPasswordFail)
	})

	t.Run("correct original password returns true", func(t *testing.T) {
		update, err := checkUpdatePassword("correct-password-1", "newpass", user.Id)
		require.NoError(t, err)
		assert.True(t, update)
	})

	t.Run("nonexistent user returns error", func(t *testing.T) {
		_, err := checkUpdatePassword("x", "y", 999999)
		assert.Error(t, err)
	})
}

// ---------------------------------------------------------------------------
// channel.go DB-backed helpers (status filter applied to a real query)
// ---------------------------------------------------------------------------

// TestApplyChannelStatusFilterAndBuildChannelListQuery exercises the GORM
// query shaping helpers against the SQLite fixture, locking in that the
// enabled/disabled/all filter branches produce distinct WHERE clauses.
func TestApplyChannelStatusFilterAndBuildChannelListQuery(t *testing.T) {
	db := setupIntegrationDB(t)

	seed := []*model.Channel{
		{Name: "enabled-a", Type: 1, Status: common.ChannelStatusEnabled, Group: "default", CreatedTime: common.GetTimestamp()},
		{Name: "enabled-b", Type: 2, Status: common.ChannelStatusEnabled, Group: "default", CreatedTime: common.GetTimestamp()},
		{Name: "disabled-a", Type: 1, Status: common.ChannelStatusManuallyDisabled, Group: "default", CreatedTime: common.GetTimestamp()},
	}
	for _, ch := range seed {
		require.NoError(t, db.Create(ch).Error)
	}

	t.Run("enabled filter returns only enabled channels", func(t *testing.T) {
		var got []*model.Channel
		err := applyChannelStatusFilter(db.Model(&model.Channel{}), common.ChannelStatusEnabled).Find(&got).Error
		require.NoError(t, err)
		assert.Len(t, got, 2)
		for _, ch := range got {
			assert.Equal(t, common.ChannelStatusEnabled, ch.Status)
		}
	})

	t.Run("disabled filter returns only non-enabled channels", func(t *testing.T) {
		var got []*model.Channel
		err := applyChannelStatusFilter(db.Model(&model.Channel{}), 0).Find(&got).Error
		require.NoError(t, err)
		assert.Len(t, got, 1)
		assert.Equal(t, "disabled-a", got[0].Name)
	})

	t.Run("all filter returns every channel", func(t *testing.T) {
		var got []*model.Channel
		err := applyChannelStatusFilter(db.Model(&model.Channel{}), -1).Find(&got).Error
		require.NoError(t, err)
		assert.Len(t, got, 3)
	})

	t.Run("buildChannelListQuery composes status and type filter", func(t *testing.T) {
		// empty group short-circuits ApplyChannelGroupFilter (commonGroupCol is
		// not initialized in the test fixture), so we exercise the status + type
		// composition path which is the load-bearing logic of buildChannelListQuery.
		// enabled + type 1 -> only enabled-a
		var got []*model.Channel
		err := buildChannelListQuery("", common.ChannelStatusEnabled, 1).Find(&got).Error
		require.NoError(t, err)
		require.Len(t, got, 1)
		assert.Equal(t, "enabled-a", got[0].Name)
	})

	t.Run("buildChannelListQuery negative type filter ignores type", func(t *testing.T) {
		var got []*model.Channel
		err := buildChannelListQuery("", common.ChannelStatusEnabled, -1).Find(&got).Error
		require.NoError(t, err)
		assert.Len(t, got, 2)
	})
}

// ---------------------------------------------------------------------------
// relay.go getChannel: nil ChannelMeta short-circuit (no external service)
// ---------------------------------------------------------------------------

// TestGetChannelNilChannelMetaBuildsStubFromContext exercises the early-return
// branch of getChannel: when ChannelMeta is nil (e.g. a websocket/realtime
// request whose channel was already resolved by middleware), the function
// must synthesize a *model.Channel from context keys and return it without
// calling the channel cache.
func TestGetChannelNilChannelMetaBuildsStubFromContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("channel_id", 5)
	c.Set("channel_type", 1)
	c.Set("channel_name", "stub")
	c.Set("auto_ban", false)

	// Real RelayInfo with ChannelMeta left nil takes the early-return path.
	info := &relaycommon.RelayInfo{}

	ch, apiErr := getChannel(c, info, nil)
	require.Nil(t, apiErr)
	require.NotNil(t, ch)
	assert.Equal(t, 5, ch.Id)
	assert.Equal(t, 1, ch.Type)
	assert.Equal(t, "stub", ch.Name)
	require.NotNil(t, ch.AutoBan)
	// auto_ban=false maps to AutoBan=0
	assert.Equal(t, 0, *ch.AutoBan)
}

// TestGetChannelNilChannelMetaAutoBanTrue flips the auto_ban flag so the
// AutoBan pointer is set to 1, covering the other side of the ternary.
func TestGetChannelNilChannelMetaAutoBanTrue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("channel_id", 8)
	c.Set("channel_type", 2)
	c.Set("channel_name", "stub2")
	c.Set("auto_ban", true)

	info := &relaycommon.RelayInfo{}
	ch, apiErr := getChannel(c, info, nil)
	require.Nil(t, apiErr)
	require.NotNil(t, ch)
	assert.Equal(t, 1, *ch.AutoBan)
}
