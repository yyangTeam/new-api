package openai

import (
	"encoding/json"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// --- merged from adaptor_test.go ---
// --- detectImageMimeType ---

func TestDetectImageMimeType(t *testing.T) {
	tests := []struct {
		filename string
		want     string
	}{
		{"photo.jpg", "image/jpeg"},
		{"photo.jpeg", "image/jpeg"},
		{"photo.JPG", "image/jpeg"},
		{"photo.JPEG", "image/jpeg"},
		{"image.png", "image/png"},
		{"image.PNG", "image/png"},
		{"image.webp", "image/webp"},
		{"image.WEBP", "image/webp"},
		{"image.jp2", "image/jpeg"}, // extension starts with .jp
		{"image.bmp", "image/png"},  // unknown defaults to png
		{"noextension", "image/png"},
		{"", "image/png"},
	}
	for _, tt := range tests {
		t.Run(tt.filename, func(t *testing.T) {
			got := detectImageMimeType(tt.filename)
			assert.Equal(t, tt.want, got)
		})
	}
}

// --- isJSONRequest ---

func TestIsJSONRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name        string
		contentType string
		want        bool
	}{
		{"application/json", "application/json", true},
		{"application/json with charset", "application/json; charset=utf-8", true},
		{"multipart form", "multipart/form-data; boundary=xxx", false},
		{"empty", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/images/edits", nil)
			c.Request.Header.Set("Content-Type", tt.contentType)
			assert.Equal(t, tt.want, isJSONRequest(c))
		})
	}

	t.Run("nil context", func(t *testing.T) {
		assert.False(t, isJSONRequest(nil))
	})

	t.Run("nil request", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = nil
		assert.False(t, isJSONRequest(c))
	})
}

// --- GetRequestURL ---

func TestGetRequestURL(t *testing.T) {
	tests := []struct {
		name    string
		info    *relaycommon.RelayInfo
		want    string
		wantErr bool
	}{
		{
			name: "default channel type uses base+path",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:    constant.ChannelTypeOpenAI,
					ChannelBaseUrl: "https://api.openai.com",
				},
				RequestURLPath: "/v1/chat/completions",
			},
			want: "https://api.openai.com/v1/chat/completions",
		},
		{
			name: "custom channel type substitutes model in URL",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeCustom,
					ChannelBaseUrl:    "https://custom.example.com/v1/{model}/chat",
					UpstreamModelName: "my-model",
				},
				RequestURLPath: "/v1/chat/completions",
			},
			want: "https://custom.example.com/v1/my-model/chat",
		},
		{
			name: "Azure channel builds deployment URL with api-version",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeAzure,
					ChannelBaseUrl:    "https://myresource.openai.azure.com",
					ApiVersion:        "2024-02-01",
					UpstreamModelName: "gpt-4",
					ChannelCreateTime: constant.AzureNoRemoveDotTime + 1, // don't remove dots
				},
				RelayMode:      relayconstant.RelayModeChatCompletions,
				RequestURLPath: "/v1/chat/completions",
			},
			want: "https://myresource.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-02-01",
		},
		{
			name: "Azure removes dots from model name for old channels",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeAzure,
					ChannelBaseUrl:    "https://myresource.openai.azure.com",
					ApiVersion:        "2024-02-01",
					UpstreamModelName: "gpt-4.1",
					ChannelCreateTime: 0, // old channel
				},
				RelayMode:      relayconstant.RelayModeChatCompletions,
				RequestURLPath: "/v1/chat/completions",
			},
			want: "https://myresource.openai.azure.com/openai/deployments/gpt-41/chat/completions?api-version=2024-02-01",
		},
		{
			name: "Azure responses mode builds responses URL",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeAzure,
					ChannelBaseUrl:    "https://myresource.openai.azure.com",
					ApiVersion:        "2024-02-01",
					UpstreamModelName: "gpt-4",
				},
				RelayMode:      relayconstant.RelayModeResponses,
				RequestURLPath: "/v1/responses",
			},
			want: "https://myresource.openai.azure.com/openai/v1/responses?api-version=preview",
		},
		{
			name: "Azure responses compact appends /compact",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeAzure,
					ChannelBaseUrl:    "https://myresource.openai.azure.com",
					ApiVersion:        "2024-02-01",
					UpstreamModelName: "gpt-4",
				},
				RelayMode:      relayconstant.RelayModeResponsesCompact,
				RequestURLPath: "/v1/responses/compact",
			},
			want: "https://myresource.openai.azure.com/openai/v1/responses/compact?api-version=preview",
		},
		{
			name: "Claude relay format redirects to chat completions",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:    constant.ChannelTypeOpenAI,
					ChannelBaseUrl: "https://api.openai.com",
				},
				RelayFormat:    types.RelayFormatClaude,
				RelayMode:      relayconstant.RelayModeChatCompletions,
				RequestURLPath: "/v1/messages",
			},
			want: "https://api.openai.com/v1/chat/completions",
		},
		{
			name: "Gemini relay format redirects to chat completions",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:    constant.ChannelTypeOpenAI,
					ChannelBaseUrl: "https://api.openai.com",
				},
				RelayFormat:    types.RelayFormatGemini,
				RelayMode:      relayconstant.RelayModeChatCompletions,
				RequestURLPath: "/v1/whatever",
			},
			want: "https://api.openai.com/v1/chat/completions",
		},
		{
			name: "Realtime mode converts https to wss",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeOpenAI,
					ChannelBaseUrl:    "https://api.openai.com",
					UpstreamModelName: "gpt-4o-realtime-preview",
				},
				RelayMode:      relayconstant.RelayModeRealtime,
				RequestURLPath: "/v1/realtime",
			},
			want: "wss://api.openai.com/v1/realtime",
		},
		{
			name: "Realtime mode converts http to ws",
			info: &relaycommon.RelayInfo{
				ChannelMeta: &relaycommon.ChannelMeta{
					ChannelType:       constant.ChannelTypeOpenAI,
					ChannelBaseUrl:    "http://localhost:8080",
					UpstreamModelName: "gpt-4o-realtime-preview",
				},
				RelayMode:      relayconstant.RelayModeRealtime,
				RequestURLPath: "/v1/realtime",
			},
			want: "ws://localhost:8080/v1/realtime",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := &Adaptor{}
			_ = a // just for the method receiver
			got, err := a.GetRequestURL(tt.info)
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.want, got)
			}
		})
	}
}

// --- SetupRequestHeader ---

func TestSetupRequestHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Azure sets api-key header", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType: constant.ChannelTypeAzure,
				ApiKey:      "test-azure-key",
			},
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		assert.Equal(t, "test-azure-key", header.Get("api-key"))
		assert.Empty(t, header.Get("Authorization"))
	})

	t.Run("OpenAI sets Bearer Authorization", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType: constant.ChannelTypeOpenAI,
				ApiKey:      "sk-test123",
			},
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		assert.Equal(t, "Bearer sk-test123", header.Get("Authorization"))
	})

	t.Run("OpenAI with Organization sets header", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:  constant.ChannelTypeOpenAI,
				ApiKey:       "sk-test",
				Organization: "org-test",
			},
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		assert.Equal(t, "org-test", header.Get("OpenAI-Organization"))
	})

	t.Run("OpenRouter sets default Referer and Title", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType: constant.ChannelTypeOpenRouter,
				ApiKey:      "sk-or-test",
			},
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		assert.Equal(t, "https://www.newapi.ai", header.Get("HTTP-Referer"))
		assert.Equal(t, "New API", header.Get("X-OpenRouter-Title"))
	})

	t.Run("OpenRouter preserves existing Referer", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		header := make(http.Header)
		header.Set("HTTP-Referer", "https://my-app.com")
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType: constant.ChannelTypeOpenRouter,
				ApiKey:      "sk-or-test",
			},
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		assert.Equal(t, "https://my-app.com", header.Get("HTTP-Referer"))
	})

	t.Run("HeadersOverride skips default Authorization", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:     constant.ChannelTypeOpenAI,
				ApiKey:          "sk-default",
				HeadersOverride: map[string]interface{}{"Authorization": "Bearer sk-custom"},
			},
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		// The default Bearer should not be set when override is present
		assert.Empty(t, header.Get("Authorization"))
	})
}

// --- ConvertOpenAIRequest ---

func TestConvertOpenAIRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("nil request returns error", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI},
		}
		a := &Adaptor{}
		_, err := a.ConvertOpenAIRequest(c, info, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "request is nil")
	})

	t.Run("non-OpenAI/Azure channel clears StreamOptions", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeDeepSeek},
		}
		req := &dto.GeneralOpenAIRequest{
			Model:         "deepseek-chat",
			StreamOptions: &dto.StreamOptions{IncludeUsage: true},
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		assert.Nil(t, oaiReq.StreamOptions)
	})

	t.Run("OpenAI channel preserves StreamOptions", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI},
		}
		req := &dto.GeneralOpenAIRequest{
			Model:         "gpt-4",
			StreamOptions: &dto.StreamOptions{IncludeUsage: true},
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		require.NotNil(t, oaiReq.StreamOptions)
		assert.True(t, oaiReq.StreamOptions.IncludeUsage)
	})

	t.Run("o-model promotes MaxTokens to MaxCompletionTokens", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				UpstreamModelName: "o3-mini",
			},
		}
		maxTok := uint(1000)
		req := &dto.GeneralOpenAIRequest{
			Model:     "o3-mini",
			MaxTokens: &maxTok,
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		require.NotNil(t, oaiReq.MaxCompletionTokens)
		assert.Equal(t, uint(1000), *oaiReq.MaxCompletionTokens)
		assert.Nil(t, oaiReq.MaxTokens)
	})

	t.Run("o-model clears Temperature", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				UpstreamModelName: "o1",
			},
		}
		temp := 0.7
		req := &dto.GeneralOpenAIRequest{
			Model:       "o1",
			Temperature: &temp,
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		assert.Nil(t, oaiReq.Temperature)
	})

	t.Run("gpt-5 model clears Temperature, TopP, LogProbs", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				UpstreamModelName: "gpt-5",
			},
		}
		temp := 0.7
		topP := 0.9
		logprobs := true
		req := &dto.GeneralOpenAIRequest{
			Model:       "gpt-5",
			Temperature: &temp,
			TopP:        &topP,
			LogProbs:    &logprobs,
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		assert.Nil(t, oaiReq.Temperature)
		assert.Nil(t, oaiReq.TopP)
		assert.Nil(t, oaiReq.LogProbs)
	})

	t.Run("o3/o4 model promotes system to developer role", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				UpstreamModelName: "o3",
			},
		}
		req := &dto.GeneralOpenAIRequest{
			Model: "o3",
			Messages: []dto.Message{
				{Role: "system", Content: json.RawMessage(`"You are helpful"`)},
				{Role: "user", Content: json.RawMessage(`"Hello"`)},
			},
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		assert.Equal(t, "developer", oaiReq.Messages[0].Role)
	})

	t.Run("o1-mini does NOT promote system to developer", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				UpstreamModelName: "o1-mini",
			},
		}
		req := &dto.GeneralOpenAIRequest{
			Model: "o1-mini",
			Messages: []dto.Message{
				{Role: "system", Content: json.RawMessage(`"You are helpful"`)},
			},
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		assert.Equal(t, "system", oaiReq.Messages[0].Role)
	})

	t.Run("o1-preview does NOT promote system to developer", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				UpstreamModelName: "o1-preview",
			},
		}
		req := &dto.GeneralOpenAIRequest{
			Model: "o1-preview",
			Messages: []dto.Message{
				{Role: "system", Content: json.RawMessage(`"You are helpful"`)},
			},
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		assert.Equal(t, "system", oaiReq.Messages[0].Role)
	})

	t.Run("o-model with effort suffix strips suffix and sets effort", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				UpstreamModelName: "o3-mini-high",
			},
		}
		req := &dto.GeneralOpenAIRequest{
			Model: "o3-mini-high",
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIRequest(c, info, req)
		require.NoError(t, err)
		oaiReq := result.(*dto.GeneralOpenAIRequest)
		assert.Equal(t, "o3-mini", oaiReq.Model)
		assert.Equal(t, "high", oaiReq.ReasoningEffort)
		assert.Equal(t, "high", info.ReasoningEffort)
	})
}

// --- Init ---

func TestAdaptorInit(t *testing.T) {
	t.Run("sets ChannelType", func(t *testing.T) {
		a := &Adaptor{}
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType: constant.ChannelTypeAzure,
				ChannelSetting: dto.ChannelSettings{
					ThinkingToContent: false,
				},
			},
		}
		a.Init(info)
		assert.Equal(t, constant.ChannelTypeAzure, a.ChannelType)
	})

	t.Run("initializes ThinkingContentInfo when ThinkingToContent enabled", func(t *testing.T) {
		a := &Adaptor{}
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType: constant.ChannelTypeOpenAI,
				ChannelSetting: dto.ChannelSettings{
					ThinkingToContent: true,
				},
			},
		}
		a.Init(info)
		assert.True(t, info.ThinkingContentInfo.IsFirstThinkingContent)
		assert.False(t, info.ThinkingContentInfo.SendLastThinkingContent)
		assert.False(t, info.ThinkingContentInfo.HasSentThinkingContent)
	})
}

// --- ConvertOpenAIResponsesRequest ---

func TestConvertOpenAIResponsesRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("effort suffix parsed and applied to request", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{},
		}
		req := dto.OpenAIResponsesRequest{
			Model: "o3-mini-low",
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIResponsesRequest(c, info, req)
		require.NoError(t, err)
		converted := result.(dto.OpenAIResponsesRequest)
		assert.Equal(t, "o3-mini", converted.Model)
		require.NotNil(t, converted.Reasoning)
		assert.Equal(t, "low", converted.Reasoning.Effort)
		assert.Equal(t, "low", info.ReasoningEffort)
	})

	t.Run("no suffix leaves request unchanged", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{},
		}
		req := dto.OpenAIResponsesRequest{
			Model: "gpt-4o",
		}
		a := &Adaptor{}
		result, err := a.ConvertOpenAIResponsesRequest(c, info, req)
		require.NoError(t, err)
		converted := result.(dto.OpenAIResponsesRequest)
		assert.Equal(t, "gpt-4o", converted.Model)
		assert.Nil(t, converted.Reasoning)
	})
}

// --- GetModelList / GetChannelName ---

func TestGetModelList(t *testing.T) {
	a := &Adaptor{ChannelType: constant.ChannelTypeOpenAI}
	list := a.GetModelList()
	assert.Contains(t, list, "gpt-4o")
	assert.Contains(t, list, "o3")
}

func TestGetChannelName(t *testing.T) {
	tests := []struct {
		channelType int
		want        string
	}{
		{constant.ChannelTypeOpenAI, "openai"},
		{constant.ChannelTypeOpenRouter, "openrouter"},
	}
	for _, tt := range tests {
		a := &Adaptor{ChannelType: tt.channelType}
		assert.Equal(t, tt.want, a.GetChannelName())
	}
}

// --- Azure Realtime URL ---

func TestGetRequestURLAzureRealtime(t *testing.T) {
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:       constant.ChannelTypeAzure,
			ChannelBaseUrl:    "https://myresource.openai.azure.com",
			ApiVersion:        "2024-10-01-preview",
			UpstreamModelName: "gpt-4o-realtime-preview",
			ChannelCreateTime: constant.AzureNoRemoveDotTime + 1,
		},
		RelayMode:      relayconstant.RelayModeRealtime,
		RequestURLPath: "/v1/realtime",
	}
	a := &Adaptor{}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "wss://myresource.openai.azure.com/openai/realtime?deployment=gpt-4o-realtime-preview&api-version=2024-10-01-preview", got)
}

// --- Azure Responses with custom version ---

func TestGetRequestURLAzureResponsesCustomVersion(t *testing.T) {
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:       constant.ChannelTypeAzure,
			ChannelBaseUrl:    "https://myresource.openai.azure.com",
			ApiVersion:        "2024-02-01",
			UpstreamModelName: "gpt-4",
			ChannelOtherSettings: dto.ChannelOtherSettings{
				AzureResponsesVersion: "2025-01-01",
			},
		},
		RelayMode:      relayconstant.RelayModeResponses,
		RequestURLPath: "/v1/responses",
	}
	a := &Adaptor{}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://myresource.openai.azure.com/openai/v1/responses?api-version=2025-01-01", got)
}

// --- Azure cognitive services URL ---

func TestGetRequestURLAzureCognitiveServicesResponses(t *testing.T) {
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:       constant.ChannelTypeAzure,
			ChannelBaseUrl:    "https://myresource.cognitiveservices.azure.com",
			ApiVersion:        "2024-12-01-preview",
			UpstreamModelName: "gpt-4o",
		},
		RelayMode:      relayconstant.RelayModeResponses,
		RequestURLPath: "/v1/responses",
	}
	a := &Adaptor{}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://myresource.cognitiveservices.azure.com/openai/responses?api-version=2024-12-01-preview", got)
}

// --- Azure with Claude relay format ---

func TestGetRequestURLAzureClaudeFormat(t *testing.T) {
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:       constant.ChannelTypeAzure,
			ChannelBaseUrl:    "https://myresource.openai.azure.com",
			ApiVersion:        "2024-02-01",
			UpstreamModelName: "gpt-4",
			ChannelCreateTime: constant.AzureNoRemoveDotTime + 1,
		},
		RelayFormat:    types.RelayFormatClaude,
		RelayMode:      relayconstant.RelayModeChatCompletions,
		RequestURLPath: "/v1/messages?api-version=2024-02-01",
	}
	a := &Adaptor{}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	// Claude format path "/v1/messages" -> strips "messages", prepends "chat/completions"
	assert.Contains(t, got, "chat/completions")
	assert.Contains(t, got, "api-version=2024-02-01")
}

// --- Azure default API version ---

func TestGetRequestURLAzureDefaultAPIVersion(t *testing.T) {
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:       constant.ChannelTypeAzure,
			ChannelBaseUrl:    "https://myresource.openai.azure.com",
			ApiVersion:        "", // empty -> uses default
			UpstreamModelName: "gpt-4",
			ChannelCreateTime: constant.AzureNoRemoveDotTime + 1,
		},
		RelayMode:      relayconstant.RelayModeChatCompletions,
		RequestURLPath: "/v1/chat/completions",
	}
	a := &Adaptor{}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Contains(t, got, "api-version=")
}

// --- SetupRequestHeader Realtime ---

func TestSetupRequestHeaderRealtime(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Realtime with WebSocket protocol sets Sec-WebSocket-Protocol for legacy model", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodGet, "/v1/realtime", nil)
		c.Request.Header.Set("Sec-WebSocket-Protocol", "realtime")
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				ApiKey:            "sk-rt-key",
				UpstreamModelName: "gpt-4o-realtime-preview-2024-12-17",
			},
			RelayMode: relayconstant.RelayModeRealtime,
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		swp := header.Get("Sec-WebSocket-Protocol")
		assert.Contains(t, swp, "realtime")
		assert.Contains(t, swp, "openai-insecure-api-key.sk-rt-key")
		assert.Contains(t, swp, "openai-beta.realtime-v1")
	})

	t.Run("Realtime with WebSocket protocol for GA model omits beta", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodGet, "/v1/realtime", nil)
		c.Request.Header.Set("Sec-WebSocket-Protocol", "realtime")
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				ApiKey:            "sk-rt-key",
				UpstreamModelName: "gpt-realtime",
			},
			RelayMode: relayconstant.RelayModeRealtime,
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		swp := header.Get("Sec-WebSocket-Protocol")
		assert.Contains(t, swp, "realtime")
		assert.Contains(t, swp, "openai-insecure-api-key.sk-rt-key")
		assert.NotContains(t, swp, "openai-beta.realtime-v1")
	})

	t.Run("Realtime without WebSocket protocol sets openai-beta for legacy model", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodGet, "/v1/realtime", nil)
		// No Sec-WebSocket-Protocol header
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				ApiKey:            "sk-rt-key",
				UpstreamModelName: "gpt-4o-realtime-preview",
			},
			RelayMode: relayconstant.RelayModeRealtime,
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		assert.Equal(t, "realtime=v1", header.Get("openai-beta"))
		assert.Equal(t, "Bearer sk-rt-key", header.Get("Authorization"))
	})

	t.Run("Realtime without WebSocket protocol for GA model does not set openai-beta", func(t *testing.T) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodGet, "/v1/realtime", nil)
		header := make(http.Header)
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelType:       constant.ChannelTypeOpenAI,
				ApiKey:            "sk-rt-key",
				UpstreamModelName: "gpt-realtime-2",
			},
			RelayMode: relayconstant.RelayModeRealtime,
		}
		a := &Adaptor{}
		err := a.SetupRequestHeader(c, &header, info)
		require.NoError(t, err)
		assert.Empty(t, header.Get("openai-beta"))
		assert.Equal(t, "Bearer sk-rt-key", header.Get("Authorization"))
	})
}

// --- merged from helper_test.go ---
// --- ProcessStreamResponse ---

func TestProcessStreamResponse(t *testing.T) {
	t.Run("accumulates content text", func(t *testing.T) {
		content := "Hello"
		resp := dto.ChatCompletionsStreamResponse{
			Choices: []dto.ChatCompletionsStreamResponseChoice{
				{Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
					Content: &content,
				}},
			},
		}
		var builder strings.Builder
		var toolCount int
		err := ProcessStreamResponse(resp, &builder, &toolCount)
		require.NoError(t, err)
		assert.Equal(t, "Hello", builder.String())
		assert.Equal(t, 0, toolCount)
	})

	t.Run("accumulates reasoning content", func(t *testing.T) {
		reasoning := "Thinking..."
		resp := dto.ChatCompletionsStreamResponse{
			Choices: []dto.ChatCompletionsStreamResponseChoice{
				{Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
					ReasoningContent: &reasoning,
				}},
			},
		}
		var builder strings.Builder
		var toolCount int
		err := ProcessStreamResponse(resp, &builder, &toolCount)
		require.NoError(t, err)
		assert.Equal(t, "Thinking...", builder.String())
	})

	t.Run("tracks tool calls name and arguments", func(t *testing.T) {
		idx := 0
		resp := dto.ChatCompletionsStreamResponse{
			Choices: []dto.ChatCompletionsStreamResponseChoice{
				{Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
					ToolCalls: []dto.ToolCallResponse{
						{Index: &idx, Function: dto.FunctionResponse{Name: "get_weather", Arguments: `{"city":"NYC"}`}},
					},
				}},
			},
		}
		var builder strings.Builder
		var toolCount int
		err := ProcessStreamResponse(resp, &builder, &toolCount)
		require.NoError(t, err)
		assert.Equal(t, 1, toolCount)
		assert.Contains(t, builder.String(), "get_weather")
		assert.Contains(t, builder.String(), `{"city":"NYC"}`)
	})

	t.Run("toolCount tracks maximum tool call count", func(t *testing.T) {
		idx0 := 0
		idx1 := 1
		// First chunk: 1 tool call
		resp1 := dto.ChatCompletionsStreamResponse{
			Choices: []dto.ChatCompletionsStreamResponseChoice{
				{Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
					ToolCalls: []dto.ToolCallResponse{
						{Index: &idx0, Function: dto.FunctionResponse{Name: "fn1"}},
					},
				}},
			},
		}
		// Second chunk: 2 tool calls
		resp2 := dto.ChatCompletionsStreamResponse{
			Choices: []dto.ChatCompletionsStreamResponseChoice{
				{Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
					ToolCalls: []dto.ToolCallResponse{
						{Index: &idx0, Function: dto.FunctionResponse{Arguments: "{}"}},
						{Index: &idx1, Function: dto.FunctionResponse{Name: "fn2", Arguments: "{}"}},
					},
				}},
			},
		}
		var builder strings.Builder
		var toolCount int
		require.NoError(t, ProcessStreamResponse(resp1, &builder, &toolCount))
		assert.Equal(t, 1, toolCount)
		require.NoError(t, ProcessStreamResponse(resp2, &builder, &toolCount))
		assert.Equal(t, 2, toolCount)
	})

	t.Run("empty choices does nothing", func(t *testing.T) {
		resp := dto.ChatCompletionsStreamResponse{Choices: nil}
		var builder strings.Builder
		var toolCount int
		err := ProcessStreamResponse(resp, &builder, &toolCount)
		require.NoError(t, err)
		assert.Equal(t, "", builder.String())
		assert.Equal(t, 0, toolCount)
	})
}

// --- processTokenData ---

func TestProcessTokenData(t *testing.T) {
	t.Run("chat completions mode processes stream response", func(t *testing.T) {
		data := `{"choices":[{"delta":{"content":"world"}}]}`
		var builder strings.Builder
		var toolCount int
		err := processTokenData(relayconstant.RelayModeChatCompletions, data, &builder, &toolCount)
		require.NoError(t, err)
		assert.Equal(t, "world", builder.String())
	})

	t.Run("completions mode processes text choices", func(t *testing.T) {
		data := `{"choices":[{"text":"hello"},{"text":" world"}]}`
		var builder strings.Builder
		var toolCount int
		err := processTokenData(relayconstant.RelayModeCompletions, data, &builder, &toolCount)
		require.NoError(t, err)
		assert.Equal(t, "hello world", builder.String())
	})

	t.Run("unknown mode does nothing", func(t *testing.T) {
		data := `{"choices":[{"delta":{"content":"ignored"}}]}`
		var builder strings.Builder
		var toolCount int
		err := processTokenData(relayconstant.RelayModeEmbeddings, data, &builder, &toolCount)
		require.NoError(t, err)
		assert.Equal(t, "", builder.String())
	})

	t.Run("invalid JSON in chat mode returns error", func(t *testing.T) {
		var builder strings.Builder
		var toolCount int
		err := processTokenData(relayconstant.RelayModeChatCompletions, `{broken`, &builder, &toolCount)
		require.Error(t, err)
	})

	t.Run("invalid JSON in completions mode returns error", func(t *testing.T) {
		var builder strings.Builder
		var toolCount int
		err := processTokenData(relayconstant.RelayModeCompletions, `{broken`, &builder, &toolCount)
		require.Error(t, err)
	})
}

// --- handleLastResponse ---

func TestHandleLastResponse(t *testing.T) {
	t.Run("extracts response metadata from last stream data", func(t *testing.T) {
		lastData := `{"id":"chatcmpl-abc","created":1710000000,"model":"gpt-4o","system_fingerprint":"fp_123","choices":[{"index":0,"delta":{"content":"hi"},"finish_reason":"stop"}]}`
		var responseId string
		var createAt int64
		var systemFingerprint string
		var model string
		var usage *dto.Usage = &dto.Usage{}
		var containStreamUsage bool
		var shouldSendLastResp bool = true
		info := &relaycommon.RelayInfo{
			ChannelMeta:        &relaycommon.ChannelMeta{},
			ShouldIncludeUsage: true,
		}

		err := handleLastResponse(lastData, &responseId, &createAt, &systemFingerprint, &model, &usage, &containStreamUsage, info, &shouldSendLastResp)
		require.NoError(t, err)
		assert.Equal(t, "chatcmpl-abc", responseId)
		assert.Equal(t, int64(1710000000), createAt)
		assert.Equal(t, "fp_123", systemFingerprint)
		assert.Equal(t, "gpt-4o", model)
		assert.False(t, containStreamUsage) // no usage in this chunk
		assert.True(t, shouldSendLastResp)
	})

	t.Run("extracts usage when present in last stream data", func(t *testing.T) {
		lastData := `{"id":"chatcmpl-abc","created":1710000000,"model":"gpt-4o","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}`
		var responseId string
		var createAt int64
		var systemFingerprint string
		var model string
		var usage *dto.Usage = &dto.Usage{}
		var containStreamUsage bool
		var shouldSendLastResp bool = true
		info := &relaycommon.RelayInfo{
			ChannelMeta:        &relaycommon.ChannelMeta{},
			ShouldIncludeUsage: true,
		}

		err := handleLastResponse(lastData, &responseId, &createAt, &systemFingerprint, &model, &usage, &containStreamUsage, info, &shouldSendLastResp)
		require.NoError(t, err)
		assert.True(t, containStreamUsage)
		assert.Equal(t, 10, usage.PromptTokens)
		assert.Equal(t, 20, usage.CompletionTokens)
		assert.Equal(t, 30, usage.TotalTokens)
	})

	t.Run("shouldSendLastResp is false when usage-only chunk and ShouldIncludeUsage=false", func(t *testing.T) {
		// usage present, no content in choices delta
		lastData := `{"id":"chatcmpl-abc","created":1710000000,"model":"gpt-4o","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}`
		var responseId string
		var createAt int64
		var systemFingerprint string
		var model string
		var usage *dto.Usage = &dto.Usage{}
		var containStreamUsage bool
		var shouldSendLastResp bool = true
		info := &relaycommon.RelayInfo{
			ChannelMeta:        &relaycommon.ChannelMeta{},
			ShouldIncludeUsage: false,
		}

		err := handleLastResponse(lastData, &responseId, &createAt, &systemFingerprint, &model, &usage, &containStreamUsage, info, &shouldSendLastResp)
		require.NoError(t, err)
		assert.True(t, containStreamUsage)
		assert.False(t, shouldSendLastResp)
	})

	t.Run("invalid JSON returns error", func(t *testing.T) {
		var responseId string
		var createAt int64
		var systemFingerprint string
		var model string
		var usage *dto.Usage = &dto.Usage{}
		var containStreamUsage bool
		var shouldSendLastResp bool = true
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{},
		}

		err := handleLastResponse(`{bad`, &responseId, &createAt, &systemFingerprint, &model, &usage, &containStreamUsage, info, &shouldSendLastResp)
		require.Error(t, err)
	})
}

// --- collectStreamFunctionCallNames additional cases ---

func TestCollectStreamFunctionCallNamesMultipleChoices(t *testing.T) {
	seen := make(map[string]struct{})
	var names []string

	// Two choices, each with a tool call at index 0
	data := `{"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"c1","type":"function","function":{"name":"fn_a"}}]}},{"index":1,"delta":{"tool_calls":[{"index":0,"id":"c2","type":"function","function":{"name":"fn_b"}}]}}]}`
	collectStreamFunctionCallNames(data, seen, &names)

	require.Len(t, names, 2)
	assert.Equal(t, "fn_a", names[0])
	assert.Equal(t, "fn_b", names[1])
}

func TestCollectStreamFunctionCallNamesEmptyName(t *testing.T) {
	seen := make(map[string]struct{})
	var names []string

	// Tool call with empty name (arguments-only delta) is ignored
	data := `{"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{}"}}]}}]}`
	collectStreamFunctionCallNames(data, seen, &names)
	assert.Empty(t, names)
}

func TestCollectStreamFunctionCallNamesInvalidJSON(t *testing.T) {
	seen := make(map[string]struct{})
	var names []string

	collectStreamFunctionCallNames(`{bad json`, seen, &names)
	assert.Empty(t, names) // graceful handling
}

func TestCollectStreamFunctionCallNamesNilIndex(t *testing.T) {
	// When tc.Index is nil, falls back to the slice position (i)
	seen := make(map[string]struct{})
	var names []string

	// No "index" field in the tool_call — relies on slice position 0
	data := `{"choices":[{"index":0,"delta":{"tool_calls":[{"id":"c1","type":"function","function":{"name":"fn_no_index"}}]}}]}`
	collectStreamFunctionCallNames(data, seen, &names)
	require.Len(t, names, 1)
	assert.Equal(t, "fn_no_index", names[0])
	// Key should be "0-0" (choice index 0, tool index 0 from slice position)
	_, exists := seen["0-0"]
	assert.True(t, exists)
}

// --- processCompletionsStreamResponse ---

func TestProcessCompletionsStreamResponse(t *testing.T) {
	t.Run("concatenates all choice texts", func(t *testing.T) {
		resp := dto.CompletionsStreamResponse{
			Choices: []struct {
				Text         string `json:"text"`
				FinishReason string `json:"finish_reason"`
			}{
				{Text: "Hello "},
				{Text: "World"},
			},
		}
		var builder strings.Builder
		processCompletionsStreamResponse(resp, &builder)
		assert.Equal(t, "Hello World", builder.String())
	})

	t.Run("empty choices produces empty string", func(t *testing.T) {
		resp := dto.CompletionsStreamResponse{}
		var builder strings.Builder
		processCompletionsStreamResponse(resp, &builder)
		assert.Equal(t, "", builder.String())
	})
}

// --- common.GetPointer for test infrastructure verification ---
func TestCommonGetPointerTypes(t *testing.T) {
	intPtr := common.GetPointer(42)
	require.NotNil(t, intPtr)
	assert.Equal(t, 42, *intPtr)
}

// --- merged from usage_test.go ---
// --- extractCachedTokensFromBody ---

func TestExtractCachedTokensFromBody(t *testing.T) {
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
