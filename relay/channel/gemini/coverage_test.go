package gemini

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// adaptor.go: GetRequestURL
//
// GetRequestURL builds the upstream Gemini/Vertex URL from the channel base
// URL, the model name, and the relay mode. The model-name prefix selects
// between imagen (:predict), embedding (:embedContent / :batchEmbedContents)
// and chat (:generateContent / :streamGenerateContent?alt=sse) actions.
// Streaming in native Gemini mode also disables ping.
// ---------------------------------------------------------------------------

func TestGetRequestURL(t *testing.T) {
	tests := []struct {
		name           string
		baseUrl        string
		upstreamModel  string
		originModel    string
		isStream       bool
		relayMode      int
		batchEmbedding bool
		wantURL        string
		wantDisablePing bool
	}{
		{
			name:          "chat generate content non-stream",
			baseUrl:       "https://generativelanguage.googleapis.com",
			upstreamModel: "gemini-2.5-flash",
			originModel:   "gemini-2.5-flash",
			relayMode:     relayconstant.RelayModeChatCompletions,
			wantURL:       "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
		},
		{
			name:           "chat stream content appends alt=sse",
			baseUrl:        "https://generativelanguage.googleapis.com",
			upstreamModel:  "gemini-2.5-flash",
			originModel:    "gemini-2.5-flash",
			isStream:       true,
			relayMode:      relayconstant.RelayModeChatCompletions,
			wantURL:        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
			wantDisablePing: false,
		},
		{
			name:           "native gemini stream disables ping",
			baseUrl:        "https://generativelanguage.googleapis.com",
			upstreamModel:  "gemini-2.5-flash",
			originModel:    "gemini-2.5-flash",
			isStream:       true,
			relayMode:      relayconstant.RelayModeGemini,
			wantURL:        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
			wantDisablePing: true,
		},
		{
			name:          "imagen model uses predict action",
			baseUrl:       "https://generativelanguage.googleapis.com",
			upstreamModel: "imagen-4.0-generate-001",
			originModel:   "imagen-4.0-generate-001",
			relayMode:     relayconstant.RelayModeChatCompletions,
			wantURL:       "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict",
		},
		{
			name:          "text-embedding model uses embedContent action",
			baseUrl:       "https://generativelanguage.googleapis.com",
			upstreamModel: "text-embedding-004",
			originModel:   "text-embedding-004",
			relayMode:     relayconstant.RelayModeEmbeddings,
			wantURL:       "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
		},
		{
			name:           "embedding model batch uses batchEmbedContents action",
			baseUrl:        "https://generativelanguage.googleapis.com",
			upstreamModel: "gemini-embedding-001",
			originModel:   "gemini-embedding-001",
			relayMode:     relayconstant.RelayModeEmbeddings,
			batchEmbedding: true,
			wantURL:        "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents",
		},
		{
			name:          "embedding-prefix model uses embedContent action",
			baseUrl:       "https://generativelanguage.googleapis.com",
			upstreamModel: "embedding-001",
			originModel:   "embedding-001",
			relayMode:     relayconstant.RelayModeEmbeddings,
			wantURL:       "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent",
		},
		{
			name:          "gemini-1.0-pro uses v1 version override",
			baseUrl:       "https://generativelanguage.googleapis.com",
			upstreamModel: "gemini-1.0-pro",
			originModel:   "gemini-1.0-pro",
			relayMode:     relayconstant.RelayModeChatCompletions,
			wantURL:       "https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			info := &relaycommon.RelayInfo{
				IsStream:             tt.isStream,
				IsGeminiBatchEmbedding: tt.batchEmbedding,
				RelayMode:            tt.relayMode,
				OriginModelName:       tt.originModel,
			}
			info.ChannelMeta = &relaycommon.ChannelMeta{
				ChannelBaseUrl:    tt.baseUrl,
				UpstreamModelName: tt.upstreamModel,
			}
			a := &Adaptor{}
			got, err := a.GetRequestURL(info)
			require.NoError(t, err)
			assert.Equal(t, tt.wantURL, got)
			if tt.wantDisablePing {
				assert.True(t, info.DisablePing, "native gemini stream should disable ping")
			}
		})
	}
}

// Thinking-adapter suffix stripping mutates UpstreamModelName in-place when
// ThinkingAdapterEnabled is true and the model is not blacklisted. The default
// settings have ThinkingAdapterEnabled=false, so suffixes are preserved.
func TestGetRequestURL_ThinkingAdapterDisabledByDefault(t *testing.T) {
	info := &relaycommon.RelayInfo{
		OriginModelName: "gemini-2.5-flash-thinking",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelBaseUrl:    "https://generativelanguage.googleapis.com",
		UpstreamModelName: "gemini-2.5-flash-thinking",
	}
	a := &Adaptor{}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	// Adapter disabled -> suffix kept in URL
	assert.Contains(t, got, "models/gemini-2.5-flash-thinking:generateContent")
	assert.Equal(t, "gemini-2.5-flash-thinking", info.UpstreamModelName)
}

// ---------------------------------------------------------------------------
// adaptor.go: SetupRequestHeader
//
// Gemini auth uses x-goog-api-key, never the OpenAI Bearer scheme.
// ---------------------------------------------------------------------------

func TestSetupRequestHeader(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Request.Header.Set("Accept", "text/event-stream")

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeChatCompletions,
		IsStream:  true,
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ApiKey: "AIza-test-key-123",
	}

	header := make(http.Header)
	a := &Adaptor{}
	err := a.SetupRequestHeader(c, &header, info)
	require.NoError(t, err)
	assert.Equal(t, "AIza-test-key-123", header.Get("x-goog-api-key"))
	// Gemini must never send an OpenAI-style Authorization header.
	assert.Empty(t, header.Get("Authorization"))
	// Standard API request headers (Content-Type / Accept) are forwarded.
	assert.Equal(t, "application/json", header.Get("Content-Type"))
	assert.Equal(t, "text/event-stream", header.Get("Accept"))
}

// When the client did not send an Accept header on a stream request, the
// adaptor falls back to text/event-stream so the upstream sends SSE.
func TestSetupRequestHeader_StreamFallbackAccept(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Request.Header.Set("Content-Type", "application/json")
	// no Accept header

	info := &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeChatCompletions,
		IsStream:  true,
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{ApiKey: "k"}

	header := make(http.Header)
	a := &Adaptor{}
	err := a.SetupRequestHeader(c, &header, info)
	require.NoError(t, err)
	assert.Equal(t, "text/event-stream", header.Get("Accept"))
}

// ---------------------------------------------------------------------------
// adaptor.go: ConvertOpenAIRequest
//
// Delegates to relayconvert for OpenAI -> Gemini translation. A nil request
// must surface an explicit error rather than a nil-pointer panic.
// ---------------------------------------------------------------------------

func TestConvertOpenAIRequest_NilReturnsError(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	info := &relaycommon.RelayInfo{
		OriginModelName: "gemini-2.5-flash",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "gemini-2.5-flash",
	}
	a := &Adaptor{}
	_, err := a.ConvertOpenAIRequest(c, info, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "request is nil")
}

func TestConvertOpenAIRequest_TranslatesToGeminiChatRequest(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	info := &relaycommon.RelayInfo{OriginModelName: "gemini-2.5-flash"}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	// Round-trip through JSON so the Message content goes through its
	// UnmarshalJSON normalizer (raw -> string | []MediaContent), matching the
	// real wire path the relay pipeline always takes.
	raw := []byte(`{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"hello"}]}`)
	var req dto.GeneralOpenAIRequest
	require.NoError(t, common.Unmarshal(raw, &req))

	a := &Adaptor{}
	result, err := a.ConvertOpenAIRequest(c, info, &req)
	require.NoError(t, err)
	geminiReq, ok := result.(*dto.GeminiChatRequest)
	require.True(t, ok, "expected *dto.GeminiChatRequest, got %T", result)
	require.Len(t, geminiReq.Contents, 1)
	assert.Equal(t, "user", geminiReq.Contents[0].Role)
	require.Len(t, geminiReq.Contents[0].Parts, 1)
	assert.Equal(t, "hello", geminiReq.Contents[0].Parts[0].Text)
}

// ---------------------------------------------------------------------------
// adaptor.go: ConvertGeminiRequest
//
// Normalizes a native Gemini request: the first content's empty role becomes
// "user", and YouTube file URIs without a mime type get video/webm.
// ---------------------------------------------------------------------------

func TestConvertGeminiRequest_DefaultsFirstEmptyRoleToUser(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini:generateContent", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	req := &dto.GeminiChatRequest{
		Contents: []dto.GeminiChatContent{
			{Parts: []dto.GeminiPart{{Text: "hi"}}}, // Role empty
			{Role: "model", Parts: []dto.GeminiPart{{Text: "hello"}}},
		},
	}
	a := &Adaptor{}
	got, err := a.ConvertGeminiRequest(c, info, req)
	require.NoError(t, err)
	same, ok := got.(*dto.GeminiChatRequest)
	require.True(t, ok)
	assert.Equal(t, "user", same.Contents[0].Role, "first empty role should default to user")
	assert.Equal(t, "model", same.Contents[1].Role, "explicit role must be preserved")
}

func TestConvertGeminiRequest_PreservesExplicitFirstRole(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini:generateContent", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	req := &dto.GeminiChatRequest{
		Contents: []dto.GeminiChatContent{
			{Role: "system", Parts: []dto.GeminiPart{{Text: "sys"}}},
		},
	}
	a := &Adaptor{}
	got, err := a.ConvertGeminiRequest(c, info, req)
	require.NoError(t, err)
	same := got.(*dto.GeminiChatRequest)
	assert.Equal(t, "system", same.Contents[0].Role)
}

func TestConvertGeminiRequest_YouTubeFileDataGetsVideoMime(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini:generateContent", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	req := &dto.GeminiChatRequest{
		Contents: []dto.GeminiChatContent{
			{
				Role: "user",
				Parts: []dto.GeminiPart{
					{FileData: &dto.GeminiFileData{FileUri: "https://www.youtube.com/watch?v=abc"}},
					{FileData: &dto.GeminiFileData{FileUri: "https://example.com/video.mp4", MimeType: "video/mp4"}},
				},
			},
		},
	}
	a := &Adaptor{}
	got, err := a.ConvertGeminiRequest(c, info, req)
	require.NoError(t, err)
	same := got.(*dto.GeminiChatRequest)
	assert.Equal(t, "video/webm", same.Contents[0].Parts[0].FileData.MimeType, "YouTube URI w/o mime should become video/webm")
	assert.Equal(t, "video/mp4", same.Contents[0].Parts[1].FileData.MimeType, "explicit mime must be preserved")
}

func TestConvertGeminiRequest_EmptyContentsReturnsUnchanged(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini:generateContent", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	req := &dto.GeminiChatRequest{}
	a := &Adaptor{}
	got, err := a.ConvertGeminiRequest(c, info, req)
	require.NoError(t, err)
	_, ok := got.(*dto.GeminiChatRequest)
	assert.True(t, ok)
}

// ---------------------------------------------------------------------------
// adaptor.go: ConvertClaudeRequest
//
// Translates a Claude messages request to the Gemini generateContent shape.
// A non-Claude request type surfaces a typed conversion error.
// ---------------------------------------------------------------------------

func TestConvertClaudeRequest_TranslatesToGemini(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	info := &relaycommon.RelayInfo{OriginModelName: "gemini-2.5-flash"}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	req := &dto.ClaudeRequest{
		Model: "gemini-2.5-flash",
		Messages: []dto.ClaudeMessage{
			{Role: "user", Content: json.RawMessage(`[{"type":"text","text":"hi"}]`)},
		},
	}
	a := &Adaptor{}
	got, err := a.ConvertClaudeRequest(c, info, req)
	require.NoError(t, err)
	geminiReq, ok := got.(*dto.GeminiChatRequest)
	require.True(t, ok, "expected *dto.GeminiChatRequest, got %T", got)
	require.Len(t, geminiReq.Contents, 1)
	assert.Equal(t, "user", geminiReq.Contents[0].Role)
}

func TestConvertClaudeRequest_WithSystemPrompt(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	info := &relaycommon.RelayInfo{OriginModelName: "gemini-2.5-flash"}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	// A system prompt in the Claude request must surface as Gemini system
	// instructions, not as a user content turn.
	req := &dto.ClaudeRequest{
		Model: "gemini-2.5-flash",
		System: json.RawMessage(`[{"type":"text","text":"you are helpful"}]`),
		Messages: []dto.ClaudeMessage{
			{Role: "user", Content: json.RawMessage(`[{"type":"text","text":"hi"}]`)},
		},
	}
	a := &Adaptor{}
	got, err := a.ConvertClaudeRequest(c, info, req)
	require.NoError(t, err)
	geminiReq, ok := got.(*dto.GeminiChatRequest)
	require.True(t, ok, "expected *dto.GeminiChatRequest, got %T", got)
	require.NotNil(t, geminiReq.SystemInstructions, "system prompt should map to system instructions")
	assert.NotEmpty(t, geminiReq.SystemInstructions.Parts)
	require.Len(t, geminiReq.Contents, 1)
	assert.Equal(t, "user", geminiReq.Contents[0].Role)
}

// ---------------------------------------------------------------------------
// adaptor.go: ConvertImageRequest
//
// Imagen-only guard, size -> aspect ratio mapping, quality -> image size
// mapping, and the N pointer default. These feed quota multipliers so they
// are billing-relevant: a wrong default N or aspect ratio changes the charge.
// ---------------------------------------------------------------------------

func TestConvertImageRequest_RejectsNonImagenModel(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	a := &Adaptor{}
	_, err := a.ConvertImageRequest(c, info, dto.ImageRequest{Prompt: "x"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "only imagen models are supported")
}

func TestConvertImageRequest_AspectRatioMapping(t *testing.T) {
	tests := []struct {
		name          string
		size          string
		wantAspect    string
		wantImageSize string
		quality       string
	}{
		{name: "empty size defaults 1:1", size: "", wantAspect: "1:1"},
		{name: "explicit ratio passthrough", size: "16:9", wantAspect: "16:9"},
		{name: "1024x1024 -> 1:1", size: "1024x1024", wantAspect: "1:1"},
		{name: "256x256 -> 1:1", size: "256x256", wantAspect: "1:1"},
		{name: "1536x1024 -> 3:2", size: "1536x1024", wantAspect: "3:2"},
		{name: "1024x1536 -> 2:3", size: "1024x1536", wantAspect: "2:3"},
		{name: "1024x1792 -> 9:16", size: "1024x1792", wantAspect: "9:16"},
		{name: "1792x1024 -> 16:9", size: "1792x1024", wantAspect: "16:9"},
		{name: "unknown size defaults 1:1", size: "9999x9999", wantAspect: "1:1"},
		{name: "quality hd maps to 2K", size: "1024x1024", quality: "hd", wantAspect: "1:1", wantImageSize: "2K"},
		{name: "quality high maps to 2K", size: "1024x1024", quality: "high", wantAspect: "1:1", wantImageSize: "2K"},
		{name: "quality 2K maps to 2K", size: "1024x1024", quality: "2K", wantAspect: "1:1", wantImageSize: "2K"},
		{name: "quality standard maps to 1K", size: "1024x1024", quality: "standard", wantAspect: "1:1", wantImageSize: "1K"},
		{name: "quality medium maps to 1K", size: "1024x1024", quality: "medium", wantAspect: "1:1", wantImageSize: "1K"},
		{name: "quality low maps to 1K", size: "1024x1024", quality: "low", wantAspect: "1:1", wantImageSize: "1K"},
		{name: "quality auto maps to 1K", size: "1024x1024", quality: "auto", wantAspect: "1:1", wantImageSize: "1K"},
		{name: "quality 1K maps to 1K", size: "1024x1024", quality: "1K", wantAspect: "1:1", wantImageSize: "1K"},
		{name: "unknown quality defaults to 1K", size: "1024x1024", quality: "ultra", wantAspect: "1:1", wantImageSize: "1K"},
		{name: "empty quality leaves imageSize unset", size: "1024x1024", quality: "", wantAspect: "1:1", wantImageSize: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
			info := &relaycommon.RelayInfo{}
			info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "imagen-4.0-generate-001"}

			a := &Adaptor{}
			got, err := a.ConvertImageRequest(c, info, dto.ImageRequest{
				Prompt:  "a cat",
				Size:    tt.size,
				Quality: tt.quality,
			})
			require.NoError(t, err)
			imgReq, ok := got.(dto.GeminiImageRequest)
			require.True(t, ok)
			assert.Equal(t, "a cat", imgReq.Instances[0].Prompt)
			assert.Equal(t, tt.wantAspect, imgReq.Parameters.AspectRatio)
			assert.Equal(t, tt.wantImageSize, imgReq.Parameters.ImageSize)
			assert.Equal(t, "allow_adult", imgReq.Parameters.PersonGeneration)
		})
	}
}

// N is a billing multiplier; the adaptor must default a nil N to 1 (never 0,
// which would bill zero images) and pass through an explicit N.
func TestConvertImageRequest_NDefaultAndPassthrough(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "imagen-4.0-generate-001"}

	t.Run("nil N defaults to 1", func(t *testing.T) {
		a := &Adaptor{}
		got, err := a.ConvertImageRequest(c, info, dto.ImageRequest{Prompt: "p"})
		require.NoError(t, err)
		assert.Equal(t, 1, got.(dto.GeminiImageRequest).Parameters.SampleCount)
	})

	t.Run("explicit N passes through", func(t *testing.T) {
		n := uint(3)
		a := &Adaptor{}
		got, err := a.ConvertImageRequest(c, info, dto.ImageRequest{Prompt: "p", N: &n})
		require.NoError(t, err)
		assert.Equal(t, 3, got.(dto.GeminiImageRequest).Parameters.SampleCount)
	})
}

// ---------------------------------------------------------------------------
// adaptor.go: ConvertEmbeddingRequest
//
// Validates input presence, builds a batch-style payload, sets the batch
// flag on info, and applies outputDimensionality only for newer models.
// ---------------------------------------------------------------------------

func TestConvertEmbeddingRequest_NilInputErrors(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "text-embedding-004"}

	a := &Adaptor{}
	_, err := a.ConvertEmbeddingRequest(c, info, dto.EmbeddingRequest{Model: "text-embedding-004"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "input is required")
}

func TestConvertEmbeddingRequest_EmptyParsedInputErrors(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "text-embedding-004"}

	// Input is a non-nil empty array — ParseInput returns []string{} of len 0.
	a := &Adaptor{}
	_, err := a.ConvertEmbeddingRequest(c, info, dto.EmbeddingRequest{
		Model: "text-embedding-004",
		Input: []any{},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "input is empty")
}

func TestConvertEmbeddingRequest_BuildsBatchPayload(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "text-embedding-004"}

	dim := 256
	a := &Adaptor{}
	got, err := a.ConvertEmbeddingRequest(c, info, dto.EmbeddingRequest{
		Model:      "text-embedding-004",
		Input:      []any{"hello", "world"},
		Dimensions: &dim,
	})
	require.NoError(t, err)
	payload, ok := got.(map[string]interface{})
	require.True(t, ok)
	requests, ok := payload["requests"].([]map[string]interface{})
	require.True(t, ok)
	require.Len(t, requests, 2)
	assert.Equal(t, "models/text-embedding-004", requests[0]["model"])
	assert.Equal(t, "hello", requests[0]["content"].(dto.GeminiChatContent).Parts[0].Text)
	assert.Equal(t, "world", requests[1]["content"].(dto.GeminiChatContent).Parts[0].Text)
	// newer model + positive dimensions -> outputDimensionality set
	assert.Equal(t, 256, requests[0]["outputDimensionality"])
	// Batch flag must be set so GetRequestURL emits batchEmbedContents.
	assert.True(t, info.IsGeminiBatchEmbedding)
}

// outputDimensionality is only supported by the post-2024 embedding models;
// older prefixes must not carry it even when Dimensions is set.
func TestConvertEmbeddingRequest_OlderModelOmitsOutputDimensionality(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "embedding-older-001"}

	dim := 128
	a := &Adaptor{}
	got, err := a.ConvertEmbeddingRequest(c, info, dto.EmbeddingRequest{
		Model:      "embedding-older-001",
		Input:      "hello",
		Dimensions: &dim,
	})
	require.NoError(t, err)
	payload := got.(map[string]interface{})
	requests := payload["requests"].([]map[string]interface{})
	require.Len(t, requests, 1)
	_, present := requests[0]["outputDimensionality"]
	assert.False(t, present, "older embedding models must not carry outputDimensionality")
}

// Zero dimensions must not be emitted as outputDimensionality (would be a
// billing/no-op surprise upstream).
func TestConvertEmbeddingRequest_ZeroDimensionsOmitted(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "text-embedding-004"}

	zero := 0
	a := &Adaptor{}
	got, err := a.ConvertEmbeddingRequest(c, info, dto.EmbeddingRequest{
		Model:      "text-embedding-004",
		Input:      "hello",
		Dimensions: &zero,
	})
	require.NoError(t, err)
	payload := got.(map[string]interface{})
	requests := payload["requests"].([]map[string]interface{})
	_, present := requests[0]["outputDimensionality"]
	assert.False(t, present)
}

// ---------------------------------------------------------------------------
// adaptor.go: ConvertAudioRequest / ConvertRerankRequest / GetModelList /
// GetChannelName / Init / DoRequest
//
// Audio is unsupported. Rerank is a no-op pass-through. The remaining helpers
// are trivial but lock the contract.
// ---------------------------------------------------------------------------

func TestConvertAudioRequest_NotImplemented(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/audio/transcriptions", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}
	a := &Adaptor{}
	_, err := a.ConvertAudioRequest(c, info, dto.AudioRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not implemented")
}

func TestConvertRerankRequest_ReturnsNilNil(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/rerank", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}
	a := &Adaptor{}
	got, err := a.ConvertRerankRequest(c, relayconstant.RelayModeRerank, dto.RerankRequest{})
	require.NoError(t, err)
	assert.Nil(t, got)
}

func TestGetModelList_ReturnsKnownModels(t *testing.T) {
	a := &Adaptor{}
	models := a.GetModelList()
	assert.NotEmpty(t, models)
	// representative entries across categories
	assert.Contains(t, models, "gemini-2.5-flash")
	assert.Contains(t, models, "imagen-4.0-generate-001")
	assert.Contains(t, models, "gemini-embedding-001")
	assert.Contains(t, models, "gemma-3-27b-it")
}

func TestGetChannelName(t *testing.T) {
	a := &Adaptor{}
	assert.Equal(t, ChannelName, a.GetChannelName())
	assert.Equal(t, "google gemini", a.GetChannelName())
}

func TestAdaptorInit_NoStateMutation(t *testing.T) {
	// Init is a no-op for the Gemini adaptor; it must not panic and must not
	// depend on a non-nil info.
	a := &Adaptor{}
	require.NotPanics(t, func() { a.Init(&relaycommon.RelayInfo{}) })
	require.NotPanics(t, func() { a.Init(nil) })
}

func TestDoRequest_DelegatesToChannel(t *testing.T) {
	// DoRequest delegates to channel.DoApiRequest; with a nil body and a stub
	// info it should surface a network/URL error rather than panic.
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	info := &relaycommon.RelayInfo{OriginModelName: "gemini-2.5-flash"}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelBaseUrl:    "http://127.0.0.1:0", // unreachable
		UpstreamModelName: "gemini-2.5-flash",
		ApiKey:            "k",
	}
	a := &Adaptor{}
	_, err := a.DoRequest(c, info, strings.NewReader("{}"))
	require.Error(t, err)
}

// ---------------------------------------------------------------------------
// adaptor.go: DoResponse routing
//
// DoResponse picks the handler based on RelayMode / model prefix / stream.
// We exercise the routing branches with mock responses so no real upstream
// call is made. The embedding and imagen branches route by model-name prefix.
// ---------------------------------------------------------------------------

func TestDoResponse_RoutesEmbeddingByPrefix(t *testing.T) {
	for _, model := range []string{"text-embedding-004", "embedding-001", "gemini-embedding-001"} {
		t.Run(model, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
			info := &relaycommon.RelayInfo{
				RelayMode: relayconstant.RelayModeEmbeddings,
			}
			info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: model}

			body := []byte(`{"embeddings":[{"values":[0.1,0.2]}]}`)
			resp := &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewReader(body)),
				Header:     make(http.Header),
			}
			a := &Adaptor{}
			usage, apiErr := a.DoResponse(c, resp, info)
			require.Nil(t, apiErr)
			usageAsDto(t, usage)
		})
	}
}

func TestDoResponse_RoutesImagenByPrefix(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "imagen-4.0-generate-001"}

	body := []byte(`{"predictions":[{"bytesBase64Encoded":"BASE64"}]}`)
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     make(http.Header),
	}
	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageAsDto(t, usageAny)
	// Each generated image is billed at a fixed 258 tokens.
	assert.Equal(t, 258, usage.PromptTokens)
	assert.Equal(t, 0, usage.CompletionTokens)
	assert.Equal(t, 258, usage.TotalTokens)
}

func TestDoResponse_RoutesResponsesModeNonStream(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
	c.Set(common.RequestIdKey, "do-resp-test")
	info := &relaycommon.RelayInfo{
		RelayMode:    relayconstant.RelayModeResponses,
		RelayFormat:  types.RelayFormatOpenAIResponses,
		IsStream:     false,
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	payload := dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{Content: dto.GeminiChatContent{Role: "model", Parts: []dto.GeminiPart{{Text: "hi"}}}},
		},
		UsageMetadata: dto.GeminiUsageMetadata{PromptTokenCount: 2, CandidatesTokenCount: 3, TotalTokenCount: 5},
	}
	body, _ := common.Marshal(payload)
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     make(http.Header),
	}
	a := &Adaptor{}
	usage, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	u := usageAsDto(t, usage)
	assert.Equal(t, 2, u.PromptTokens)
	assert.Equal(t, 3, u.CompletionTokens)
}

func TestDoResponse_RoutesNativeGeminiNonStream(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini:generateContent", nil)
	info := &relaycommon.RelayInfo{
		RelayMode:      relayconstant.RelayModeGemini,
		RelayFormat:    types.RelayFormatGemini,
		RequestURLPath: "/v1beta/models/gemini:generateContent",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	payload := dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{Content: dto.GeminiChatContent{Role: "model", Parts: []dto.GeminiPart{{Text: "ok"}}}},
		},
		UsageMetadata: dto.GeminiUsageMetadata{PromptTokenCount: 2, CandidatesTokenCount: 3, TotalTokenCount: 5},
	}
	body, _ := common.Marshal(payload)
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     make(http.Header),
	}
	a := &Adaptor{}
	usage, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	u := usageAsDto(t, usage)
	assert.Equal(t, 5, u.TotalTokens)
}

func TestDoResponse_RoutesNativeGeminiEmbedding(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/text-embedding-004:embedContent", nil)
	info := &relaycommon.RelayInfo{
		RelayMode:      relayconstant.RelayModeGemini,
		RelayFormat:    types.RelayFormatGemini,
		RequestURLPath: "/v1beta/models/text-embedding-004:batchEmbedContents",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "text-embedding-004"}

	body := []byte(`{"embeddings":[{"values":[0.1,0.2]}]}`)
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     make(http.Header),
	}
	a := &Adaptor{}
	_, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
}

// ---------------------------------------------------------------------------
// relay-gemini.go: GeminiImageHandler
//
// Converts the Gemini imagen response to an OpenAI ImageResponse and bills a
// fixed 258 tokens per non-filtered image. RAI-filtered predictions are
// skipped, and zero predictions surface a no-images error.
// ---------------------------------------------------------------------------

func TestGeminiImageHandler_ConvertsAndBillsFixedTokens(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "imagen-4.0-generate-001"}

	body := []byte(`{"predictions":[
		{"mimeType":"image/png","bytesBase64Encoded":"AAA"},
		{"mimeType":"image/png","bytesBase64Encoded":"BBB","raiFilteredReason":"safety"},
		{"mimeType":"image/png","bytesBase64Encoded":"CCC"}
	]}`)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageAsDto(t, usageAny)
	// 2 non-filtered images * 258 tokens
	assert.Equal(t, 2*258, usage.PromptTokens)
	assert.Equal(t, 0, usage.CompletionTokens)
	assert.Equal(t, 2*258, usage.TotalTokens)

	out := rec.Body.String()
	assert.Contains(t, out, `"b64_json":"AAA"`)
	assert.Contains(t, out, `"b64_json":"CCC"`)
	assert.NotContains(t, out, "BBB")
}

func TestGeminiImageHandler_NoPredictionsReturnsError(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "imagen-4.0-generate-001"}

	body := []byte(`{"predictions":[]}`)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	_, apiErr := a.DoResponse(c, resp, info)
	require.NotNil(t, apiErr)
}

func TestGeminiImageHandler_BadJSONReturnsError(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "imagen-4.0-generate-001"}

	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader("{broken")), Header: make(http.Header)}
	a := &Adaptor{}
	_, apiErr := a.DoResponse(c, resp, info)
	require.NotNil(t, apiErr)
}

func TestGeminiImageHandler_ReadErrorReturnsError(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "imagen-4.0-generate-001"}

	resp := &http.Response{StatusCode: http.StatusOK, Body: &failingReadCloser{}, Header: make(http.Header)}
	a := &Adaptor{}
	_, apiErr := a.DoResponse(c, resp, info)
	require.NotNil(t, apiErr)
}

// ---------------------------------------------------------------------------
// relay-gemini.go: GeminiEmbeddingHandler
//
// Converts a Gemini batch embedding response into an OpenAI list response
// with per-item index, preserving order and model name.
// ---------------------------------------------------------------------------

func TestGeminiEmbeddingHandler_ConvertsBatchToOpenAIList(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "text-embedding-004"}

	body := []byte(`{"embeddings":[{"values":[0.1,0.2,0.3]},{"values":[0.4,0.5]}]}`)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	usage, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usageAsDto(t, usage)

	out := rec.Body.String()
	assert.Contains(t, out, `"object":"list"`)
	assert.Contains(t, out, `"object":"embedding"`)
	assert.Contains(t, out, `"index":0`)
	assert.Contains(t, out, `"index":1`)
	assert.Contains(t, out, `"model":"text-embedding-004"`)
}

func TestGeminiEmbeddingHandler_BadJSONReturnsError(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/embeddings", nil)
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "text-embedding-004"}

	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader("not json")), Header: make(http.Header)}
	a := &Adaptor{}
	_, apiErr := a.DoResponse(c, resp, info)
	require.NotNil(t, apiErr)
}

// ---------------------------------------------------------------------------
// relay-gemini.go: GeminiChatHandler empty-candidates / block-reason paths
//
// When the upstream returns no candidates, the handler must still compute
// usage from the response metadata, set the admin reject reason context
// key, and write a provider-shaped error body (OpenAI or Claude depending
// on RelayFormat). Block-reason maps to a 400; bare empty maps to 500.
// ---------------------------------------------------------------------------

func TestGeminiChatHandler_EmptyCandidatesOpenAIErrorShape(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	info := &relaycommon.RelayInfo{
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: "gemini-2.5-flash",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}
	info.SetEstimatePromptTokens(7)

	// No candidates, no prompt feedback -> "empty response from Gemini API".
	body := []byte(`{"candidates":[]}`)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	// DoResponse returns the handler's (usage, nil-error) pair; the error is
	// written into the gin context body, not returned as NewAPIError here.
	require.Nil(t, apiErr)
	usage := usageAsDto(t, usageAny)
	assert.Equal(t, 7, usage.PromptTokens)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Contains(t, rec.Body.String(), `"error"`)
	assert.Contains(t, rec.Body.String(), "empty response from Gemini API")
	// Admin reject reason recorded for downstream observability.
	assert.Equal(t, "gemini_empty_candidates", common.GetContextKeyString(c, constant.ContextKeyAdminRejectReason))
}

func TestGeminiChatHandler_BlockReasonReturns400(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	info := &relaycommon.RelayInfo{
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: "gemini-2.5-flash",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}
	info.SetEstimatePromptTokens(3)

	body := []byte(`{"candidates":[],"promptFeedback":{"blockReason":"SAFETY"}}`)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageAsDto(t, usageAny)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "request blocked by Gemini API")
	assert.Contains(t, rec.Body.String(), "SAFETY")
	// Admin reject reason recorded for downstream observability.
	assert.Equal(t, "gemini_block_reason=SAFETY", common.GetContextKeyString(c, constant.ContextKeyAdminRejectReason))
	// prompt tokens still surfaced from the metadata-derived estimate.
	assert.Equal(t, 3, usage.PromptTokens)
}

func TestGeminiChatHandler_BlockReasonClaudeErrorShape(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	info := &relaycommon.RelayInfo{
		RelayFormat:     types.RelayFormatClaude,
		OriginModelName: "gemini-2.5-flash",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}
	info.SetEstimatePromptTokens(3)

	body := []byte(`{"candidates":[],"promptFeedback":{"blockReason":"OTHER"}}`)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	_, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), `"type":"error"`)
	assert.Contains(t, rec.Body.String(), "request blocked by Gemini API")
}

func TestGeminiChatHandler_BadJSONReturnsError(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	info := &relaycommon.RelayInfo{
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: "gemini-2.5-flash",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader("{broken")), Header: make(http.Header)}
	a := &Adaptor{}
	_, apiErr := a.DoResponse(c, resp, info)
	require.NotNil(t, apiErr)
	assert.Equal(t, http.StatusInternalServerError, apiErr.StatusCode)
}

// ---------------------------------------------------------------------------
// relay-gemini.go: GeminiChatHandler happy path (OpenAI + Gemini formats)
//
// Verifies the OpenAI-shaped conversion writes choices/usage and that the
// native Gemini format passes the body through verbatim.
// ---------------------------------------------------------------------------

func TestGeminiChatHandler_OpenAIHappyPath(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	info := &relaycommon.RelayInfo{
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: "gemini-2.5-flash",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	payload := dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{
				Content: dto.GeminiChatContent{
					Role:  "model",
					Parts: []dto.GeminiPart{{Text: "hello world"}},
				},
				FinishReason: ptrString("STOP"),
			},
		},
		UsageMetadata: dto.GeminiUsageMetadata{PromptTokenCount: 2, CandidatesTokenCount: 3, TotalTokenCount: 5},
	}
	body, _ := common.Marshal(payload)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageAsDto(t, usageAny)
	assert.Equal(t, 2, usage.PromptTokens)
	assert.Equal(t, 3, usage.CompletionTokens)
	assert.Equal(t, 5, usage.TotalTokens)

	out := rec.Body.String()
	assert.Contains(t, out, `"object":"chat.completion"`)
	assert.Contains(t, out, `"role":"assistant"`)
	assert.Contains(t, out, "hello world")
	assert.Contains(t, out, `"finish_reason":"stop"`)
	assert.Contains(t, out, `"prompt_tokens":2`)
	assert.Contains(t, out, `"completion_tokens":3`)
}

func TestGeminiChatHandler_GeminiFormatPassthrough(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini:generateContent", nil)
	info := &relaycommon.RelayInfo{
		RelayFormat:     types.RelayFormatGemini,
		OriginModelName: "gemini-2.5-flash",
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	payload := dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{Content: dto.GeminiChatContent{Role: "model", Parts: []dto.GeminiPart{{Text: "native"}}}},
		},
		UsageMetadata: dto.GeminiUsageMetadata{PromptTokenCount: 4, CandidatesTokenCount: 5, TotalTokenCount: 9},
	}
	body, _ := common.Marshal(payload)
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: make(http.Header)}

	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageAsDto(t, usageAny)
	assert.Equal(t, 9, usage.TotalTokens)

	// Native Gemini format must pass the upstream body through unchanged.
	out := rec.Body.Bytes()
	assert.JSONEq(t, string(body), string(out))
}

// ---------------------------------------------------------------------------
// relay-gemini.go: pure helpers
//
// geminiResponseUsageText, geminiResponseInlineImageCount and
// markGeminiGoogleSearchCall are pure transforms exercised here in isolation.
// ---------------------------------------------------------------------------

func TestGeminiResponseUsageText_NilSafeAndConcatenates(t *testing.T) {
	t.Run("nil response returns empty", func(t *testing.T) {
		assert.Empty(t, geminiResponseUsageText(nil))
	})
	t.Run("no candidates returns empty", func(t *testing.T) {
		r := &dto.GeminiChatResponse{}
		assert.Empty(t, geminiResponseUsageText(r))
	})
	t.Run("concatenates text parts across candidates", func(t *testing.T) {
		r := &dto.GeminiChatResponse{
			Candidates: []dto.GeminiChatCandidate{
				{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{{Text: "a"}, {Text: "b"}}}},
				{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{{Text: "c"}}}},
			},
		}
		assert.Equal(t, "abc", geminiResponseUsageText(r))
	})
	t.Run("skips non-text parts", func(t *testing.T) {
		r := &dto.GeminiChatResponse{
			Candidates: []dto.GeminiChatCandidate{
				{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{
					{Text: "keep"},
					{InlineData: &dto.GeminiInlineData{MimeType: "image/png", Data: "x"}},
					{Text: "this"},
				}}},
			},
		}
		assert.Equal(t, "keepthis", geminiResponseUsageText(r))
	})
}

func TestGeminiResponseInlineImageCount(t *testing.T) {
	t.Run("nil response returns 0", func(t *testing.T) {
		assert.Equal(t, 0, geminiResponseInlineImageCount(nil))
	})
	t.Run("counts only inline data with mime", func(t *testing.T) {
		r := &dto.GeminiChatResponse{
			Candidates: []dto.GeminiChatCandidate{
				{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{
					{InlineData: &dto.GeminiInlineData{MimeType: "image/png", Data: "x"}},
					{Text: "skip"},
					{InlineData: &dto.GeminiInlineData{MimeType: "", Data: "y"}}, // no mime -> not counted
					{InlineData: &dto.GeminiInlineData{MimeType: "image/jpeg", Data: "z"}},
				}}},
				{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{
					{InlineData: &dto.GeminiInlineData{MimeType: "image/webp", Data: "w"}},
				}}},
			},
		}
		assert.Equal(t, 3, geminiResponseInlineImageCount(r))
	})
}

func TestMarkGeminiGoogleSearchCall(t *testing.T) {
	t.Run("nil context is a no-op", func(t *testing.T) {
		require.NotPanics(t, func() { markGeminiGoogleSearchCall(nil, &dto.GeminiChatResponse{}) })
	})
	t.Run("nil response is a no-op", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		require.NotPanics(t, func() { markGeminiGoogleSearchCall(c, nil) })
		assert.False(t, common.GetContextKeyBool(c, "gemini_google_search_call"))
	})
	t.Run("sets flag when grounding queries present", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		r := &dto.GeminiChatResponse{
			Candidates: []dto.GeminiChatCandidate{
				{GroundingMetadata: &dto.GeminiGroundingMetadata{WebSearchQueries: []string{"q"}}},
			},
		}
		markGeminiGoogleSearchCall(c, r)
		assert.True(t, common.GetContextKeyBool(c, "gemini_google_search_call"))
	})
	t.Run("does not set flag when grounding queries empty", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		r := &dto.GeminiChatResponse{
			Candidates: []dto.GeminiChatCandidate{
				{GroundingMetadata: &dto.GeminiGroundingMetadata{WebSearchQueries: nil}},
			},
		}
		markGeminiGoogleSearchCall(c, r)
		assert.False(t, common.GetContextKeyBool(c, "gemini_google_search_call"))
	})
	t.Run("does not set flag when no grounding metadata", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		r := &dto.GeminiChatResponse{
			Candidates: []dto.GeminiChatCandidate{{Content: dto.GeminiChatContent{Parts: []dto.GeminiPart{{Text: "x"}}}}},
		}
		markGeminiGoogleSearchCall(c, r)
		assert.False(t, common.GetContextKeyBool(c, "gemini_google_search_call"))
	})
}

// ---------------------------------------------------------------------------
// relay-gemini.go: attachEstimatedGeminiBillingUsage / patchGeminiZeroCompletionUsage
//
// Billing invariants: when the upstream reports prompt-only metadata after
// text/image output was received, completion tokens must be estimated so the
// settlement never charges zero for produced output.
// ---------------------------------------------------------------------------

func TestAttachEstimatedGeminiBillingUsage_NilSafe(t *testing.T) {
	assert.Nil(t, attachEstimatedGeminiBillingUsage(nil))
	usage := &dto.Usage{PromptTokens: 10, CompletionTokens: 5}
	got := attachEstimatedGeminiBillingUsage(usage)
	require.NotNil(t, got.BillingUsage)
	assert.True(t, got.BillingUsage.Estimated)
	assert.Equal(t, dto.BillingUsageSourceGeminiChat, got.BillingUsage.Source)
}

func TestPatchGeminiZeroCompletionUsage_NilAndPositiveSafe(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	t.Run("nil usage is a no-op", func(t *testing.T) {
		require.NotPanics(t, func() {
			patchGeminiZeroCompletionUsage(c, info, nil, "some text", 1)
		})
	})
	t.Run("positive completion tokens is a no-op", func(t *testing.T) {
		usage := &dto.Usage{PromptTokens: 5, CompletionTokens: 9, TotalTokens: 14}
		patchGeminiZeroCompletionUsage(c, info, usage, "text", 2)
		assert.Equal(t, 9, usage.CompletionTokens)
		assert.Equal(t, 14, usage.TotalTokens)
	})
	t.Run("empty text and zero images is a no-op", func(t *testing.T) {
		usage := &dto.Usage{PromptTokens: 5, CompletionTokens: 0, TotalTokens: 5}
		patchGeminiZeroCompletionUsage(c, info, usage, "", 0)
		assert.Equal(t, 0, usage.CompletionTokens)
	})
}

// When completion is zero but images were produced, the patch must assign a
// fixed per-image token estimate so the image generation is never billed as
// free. The total must then equal prompt + estimated completion.
func TestPatchGeminiZeroCompletionUsage_ImageOnlyEstimate(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	usage := &dto.Usage{PromptTokens: 10, CompletionTokens: 0, TotalTokens: 10}
	patchGeminiZeroCompletionUsage(c, info, usage, "", 3)
	// text empty + 3 images: ResponseText2Usage yields 0 completion, then the
	// image fallback kicks in (3 * 1400).
	assert.Equal(t, 3*1400, usage.CompletionTokens)
	assert.Equal(t, usage.PromptTokens+usage.CompletionTokens, usage.TotalTokens)
	assert.NotNil(t, usage.BillingUsage)
}

// ---------------------------------------------------------------------------
// relay-gemini.go: GeminiChatStreamHandler (streaming happy path)
//
// Exercises the streaming handler end-to-end with a single text chunk and a
// STOP terminator. Mocks the upstream SSE response; no real HTTP call.
// ---------------------------------------------------------------------------

func TestGeminiChatStreamHandler_OpenAIHappyPath(t *testing.T) {
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set(common.RequestIdKey, "gemini-stream-test")

	// StreamingTimeout must be > 0 for the stream scanner to operate.
	oldStreamingTimeout := constant.StreamingTimeout
	constant.StreamingTimeout = 300
	t.Cleanup(func() { constant.StreamingTimeout = oldStreamingTimeout })

	info := &relaycommon.RelayInfo{
		RelayFormat:     types.RelayFormatOpenAI,
		OriginModelName: "gemini-2.5-flash",
		IsStream:        true,
	}
	info.ChannelMeta = &relaycommon.ChannelMeta{UpstreamModelName: "gemini-2.5-flash"}

	first := dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{Content: dto.GeminiChatContent{Role: "model", Parts: []dto.GeminiPart{{Text: "hello"}}}},
		},
		UsageMetadata: dto.GeminiUsageMetadata{PromptTokenCount: 2, CandidatesTokenCount: 3, TotalTokenCount: 5},
	}
	stop := "STOP"
	final := dto.GeminiChatResponse{
		Candidates: []dto.GeminiChatCandidate{
			{FinishReason: &stop, Content: dto.GeminiChatContent{Role: "model", Parts: []dto.GeminiPart{{Text: ""}}}},
		},
		UsageMetadata: dto.GeminiUsageMetadata{PromptTokenCount: 2, CandidatesTokenCount: 3, TotalTokenCount: 5},
	}
	firstData, _ := common.Marshal(first)
	finalData, _ := common.Marshal(final)
	streamBody := "data: " + string(firstData) + "\n\ndata: " + string(finalData) + "\n\ndata: [DONE]\n"

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(streamBody)),
		Header:     make(http.Header),
	}
	resp.Header.Set("Content-Type", "text/event-stream")

	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageAsDto(t, usageAny)
	assert.Equal(t, 2, usage.PromptTokens)
	assert.Equal(t, 3, usage.CompletionTokens)
	assert.Equal(t, 5, usage.TotalTokens)

	out := rec.Body.String()
	assert.Contains(t, out, "chat.completion.chunk")
	assert.Contains(t, out, "hello")
	assert.Contains(t, out, `"finish_reason":"stop"`)
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func ptrString(s string) *string { return &s }

// usageAsDto asserts the any-typed usage returned by DoResponse back to a
// concrete *dto.Usage. Every Gemini handler returns *dto.Usage; this helper
// keeps field-level assertions concise without silencing a type mismatch.
func usageAsDto(t *testing.T, usage any) *dto.Usage {
	t.Helper()
	u, ok := usage.(*dto.Usage)
	require.True(t, ok, "expected *dto.Usage, got %T", usage)
	require.NotNil(t, u)
	return u
}
