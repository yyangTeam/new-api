package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var initI18nOnce sync.Once

func ensureI18nInitialized(t *testing.T) {
	t.Helper()
	initI18nOnce.Do(func() {
		if err := i18n.Init(); err != nil {
			t.Fatalf("failed to initialize i18n: %v", err)
		}
	})
}

func newDistributorTestContext(method, path string, body []byte) *gin.Context {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest(method, path, nil)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
		ctx.Set(common.KeyRequestBody, body)
	}
	ctx.Request = req
	return ctx
}

func TestGetModelRequestGeminiPathExtraction(t *testing.T) {
	ensureI18nInitialized(t)
	tests := []struct {
		name          string
		path          string
		expectedModel string
	}{
		{
			name:          "v1beta generateContent",
			path:          "/v1beta/models/gemini-2.0-flash:generateContent",
			expectedModel: "gemini-2.0-flash",
		},
		{
			name:          "v1 models path",
			path:          "/v1/models/gemini-pro:streamGenerateContent",
			expectedModel: "gemini-pro",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := newDistributorTestContext(http.MethodPost, tt.path, nil)
			modelReq, shouldSelect, err := getModelRequest(ctx)
			require.NoError(t, err)
			assert.True(t, shouldSelect)
			assert.Equal(t, tt.expectedModel, modelReq.Model)
			assert.Equal(t, relayconstant.RelayModeGemini, ctx.GetInt("relay_mode"))
		})
	}
}

func TestGetModelRequestRealtimeUsesQueryParam(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodGet, "/v1/realtime?model=gpt-4o-realtime-preview", nil)

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "gpt-4o-realtime-preview", modelReq.Model)
}

func TestGetModelRequestModerationsDefaultModel(t *testing.T) {
	ensureI18nInitialized(t)
	// When moderations path and no model in body, defaults to text-moderation-stable
	ctx := newDistributorTestContext(http.MethodPost, "/v1/moderations", []byte(`{}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "text-moderation-stable", modelReq.Model)
}

func TestGetModelRequestModerationsExplicitModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/moderations", []byte(`{"model":"text-moderation-latest"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "text-moderation-latest", modelReq.Model)
}

func TestGetModelRequestImageGenerationsDefaultModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/images/generations", []byte(`{}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "dall-e", modelReq.Model)
}

func TestGetModelRequestImageGenerationsExplicitModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/images/generations", []byte(`{"model":"dall-e-3"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "dall-e-3", modelReq.Model)
}

func TestGetModelRequestAudioSpeechDefaultModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/audio/speech", []byte(`{}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "tts-1", modelReq.Model)
}

func TestGetModelRequestAudioTranscriptionDefaultModel(t *testing.T) {
	ensureI18nInitialized(t)
	// Transcription with JSON body and no model field should default to whisper-1
	ctx := newDistributorTestContext(http.MethodPost, "/v1/audio/transcriptions", []byte(`{}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "whisper-1", modelReq.Model)
}

func TestGetModelRequestAudioTranslationDefaultModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/audio/translations", []byte(`{}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "whisper-1", modelReq.Model)
}

func TestGetModelRequestChatCompletions(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/chat/completions", []byte(`{"model":"gpt-4o"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "gpt-4o", modelReq.Model)
}

func TestGetModelRequestInvalidJSON(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/chat/completions", []byte(`{not valid json`))

	_, _, err := getModelRequest(ctx)

	require.Error(t, err)
}

func TestGetModelRequestVideoRemixShouldNotSelectChannel(t *testing.T) {
	ensureI18nInitialized(t)
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest(http.MethodPost, "/v1/videos/task123/remix", nil)
	ctx.Request = req

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.False(t, shouldSelect)
	assert.Equal(t, "", modelReq.Model)
	assert.Equal(t, relayconstant.RelayModeVideoSubmit, ctx.GetInt("relay_mode"))
}

func TestGetModelRequestResponsesCompactAddsSuffix(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/responses/compact", []byte(`{"model":"gpt-4o"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	// The compact suffix is appended by ratio_setting.WithCompactModelSuffix
	assert.True(t, strings.Contains(modelReq.Model, "gpt-4o"), "model should contain the base name")
}

func TestGetModelRequestVideoPostReadsModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/videos", []byte(`{"model":"sora-2"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "sora-2", modelReq.Model)
	assert.Equal(t, relayconstant.RelayModeVideoSubmit, ctx.GetInt("relay_mode"))
}

func TestGetModelRequestVideoGetDoesNotSelectChannel(t *testing.T) {
	ensureI18nInitialized(t)
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest(http.MethodGet, "/v1/videos", nil)
	ctx.Request = req

	_, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.False(t, shouldSelect)
}

func TestGetModelRequestVideoGenerationsPost(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/video/generations", []byte(`{"model":"wan-2.1"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "wan-2.1", modelReq.Model)
	assert.Equal(t, relayconstant.RelayModeVideoSubmit, ctx.GetInt("relay_mode"))
}

func TestGetModelRequestVideoGenerationsGet(t *testing.T) {
	ensureI18nInitialized(t)
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest(http.MethodGet, "/v1/video/generations", nil)
	ctx.Request = req

	_, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.False(t, shouldSelect)
}

func TestGetModelRequestAudioTranslationExplicitModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/audio/translations", []byte(`{"model":"whisper-large-v3"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "whisper-large-v3", modelReq.Model)
}

func TestGetModelRequestAudioSpeechExplicitModel(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/audio/speech", []byte(`{"model":"tts-1-hd"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "tts-1-hd", modelReq.Model)
}

func TestGetModelRequestEmbeddings(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/embeddings", []byte(`{"model":"text-embedding-3-large"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "text-embedding-3-large", modelReq.Model)
}

func TestGetModelRequestCompletions(t *testing.T) {
	ensureI18nInitialized(t)
	ctx := newDistributorTestContext(http.MethodPost, "/v1/completions", []byte(`{"model":"gpt-3.5-turbo-instruct"}`))

	modelReq, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.True(t, shouldSelect)
	assert.Equal(t, "gpt-3.5-turbo-instruct", modelReq.Model)
}

func TestGetModelRequestSunoFetchDoesNotSelectChannel(t *testing.T) {
	ensureI18nInitialized(t)
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	// Suno fetch requires POST method and path ending with /fetch
	req := httptest.NewRequest(http.MethodPost, "/suno/fetch", nil)
	ctx.Request = req

	_, shouldSelect, err := getModelRequest(ctx)

	require.NoError(t, err)
	assert.False(t, shouldSelect)
}

func TestGetModelRequestNonJSONModelField(t *testing.T) {
	ensureI18nInitialized(t)
	// When model field is not a string type in JSON body, getModelRequest returns error
	ctx := newDistributorTestContext(http.MethodPost, "/v1/chat/completions", []byte(`{"model":42}`))

	_, _, err := getModelRequest(ctx)

	require.Error(t, err)
}

