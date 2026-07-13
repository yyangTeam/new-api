package constant

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPath2RelayMode(t *testing.T) {
	tests := []struct {
		name string
		path string
		want int
	}{
		{"chat completions v1", "/v1/chat/completions", RelayModeChatCompletions},
		{"chat completions pg", "/pg/chat/completions", RelayModeChatCompletions},
		{"completions", "/v1/completions", RelayModeCompletions},
		{"embeddings v1", "/v1/embeddings", RelayModeEmbeddings},
		{"embeddings suffix", "/some/path/embeddings", RelayModeEmbeddings},
		{"moderations", "/v1/moderations", RelayModeModerations},
		{"images generations", "/v1/images/generations", RelayModeImagesGenerations},
		{"images edits", "/v1/images/edits", RelayModeImagesEdits},
		{"edits", "/v1/edits", RelayModeEdits},
		{"responses compact before responses", "/v1/responses/compact", RelayModeResponsesCompact},
		{"responses compact with trailing", "/v1/responses/compact/extra", RelayModeResponsesCompact},
		{"responses", "/v1/responses", RelayModeResponses},
		{"responses with id", "/v1/responses/resp_123", RelayModeResponses},
		{"audio speech", "/v1/audio/speech", RelayModeAudioSpeech},
		{"audio transcriptions", "/v1/audio/transcriptions", RelayModeAudioTranscription},
		{"audio translations", "/v1/audio/translations", RelayModeAudioTranslation},
		{"rerank", "/v1/rerank", RelayModeRerank},
		{"realtime", "/v1/realtime", RelayModeRealtime},
		{"gemini v1beta models", "/v1beta/models", RelayModeGemini},
		{"gemini v1 models", "/v1/models", RelayModeGemini},
		{"unknown path", "/v1/unknown", RelayModeUnknown},
		{"empty path", "", RelayModeUnknown},
		{"mj path delegates", "/mj/submit/imagine", RelayModeMidjourneyImagine},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Path2RelayMode(tt.path)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestPath2RelayModeMidjourney(t *testing.T) {
	tests := []struct {
		name string
		path string
		want int
	}{
		{"action", "/mj/submit/action", RelayModeMidjourneyAction},
		{"modal", "/mj/submit/modal", RelayModeMidjourneyModal},
		{"shorten", "/mj/submit/shorten", RelayModeMidjourneyShorten},
		{"swap face", "/mj/insight-face/swap", RelayModeSwapFace},
		{"upload discord images", "/submit/upload-discord-images", RelayModeMidjourneyUpload},
		{"imagine", "/mj/submit/imagine", RelayModeMidjourneyImagine},
		{"video", "/mj/submit/video", RelayModeMidjourneyVideo},
		{"edits", "/mj/submit/edits", RelayModeMidjourneyEdits},
		{"blend", "/mj/submit/blend", RelayModeMidjourneyBlend},
		{"describe", "/mj/submit/describe", RelayModeMidjourneyDescribe},
		{"notify", "/mj/notify", RelayModeMidjourneyNotify},
		{"change", "/mj/submit/change", RelayModeMidjourneyChange},
		{"simple-change", "/mj/submit/simple-change", RelayModeMidjourneyChange},
		{"fetch", "/mj/task/123/fetch", RelayModeMidjourneyTaskFetch},
		{"image-seed", "/mj/task/123/image-seed", RelayModeMidjourneyTaskImageSeed},
		{"list-by-condition", "/mj/task/list-by-condition", RelayModeMidjourneyTaskFetchByCondition},
		{"unknown mj path", "/mj/unknown", RelayModeUnknown},
		{"empty", "", RelayModeUnknown},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Path2RelayModeMidjourney(tt.path)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestPath2RelaySuno(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
		want   int
	}{
		{"POST fetch", http.MethodPost, "/suno/fetch", RelayModeSunoFetch},
		{"GET fetch by id", http.MethodGet, "/suno/fetch/123", RelayModeSunoFetchByID},
		{"submit", http.MethodPost, "/suno/submit/music", RelayModeSunoSubmit},
		{"GET submit also matches", http.MethodGet, "/suno/submit/lyrics", RelayModeSunoSubmit},
		{"GET fetch no id (not contains /fetch/)", http.MethodGet, "/suno/fetch", RelayModeUnknown},
		{"POST fetch with id (suffix still /fetch)", http.MethodPost, "/suno/task/fetch", RelayModeSunoFetch},
		{"unknown path", http.MethodGet, "/suno/unknown", RelayModeUnknown},
		{"empty path", http.MethodGet, "", RelayModeUnknown},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Path2RelaySuno(tt.method, tt.path)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestPath2RelayModeConstants(t *testing.T) {
	assert.Equal(t, 0, RelayModeUnknown)
	assert.NotEqual(t, RelayModeChatCompletions, RelayModeCompletions)
	assert.NotEqual(t, RelayModeResponses, RelayModeResponsesCompact)
}
