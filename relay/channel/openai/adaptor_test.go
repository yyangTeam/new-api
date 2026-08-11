package openai

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
