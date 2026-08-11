package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestExtractModelNameFromGeminiPath(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{
			name:     "standard v1beta generateContent",
			path:     "/v1beta/models/gemini-2.0-flash:generateContent",
			expected: "gemini-2.0-flash",
		},
		{
			name:     "v1 generateContent",
			path:     "/v1/models/gemini-pro:generateContent",
			expected: "gemini-pro",
		},
		{
			name:     "streamGenerateContent",
			path:     "/v1beta/models/gemini-1.5-pro-latest:streamGenerateContent",
			expected: "gemini-1.5-pro-latest",
		},
		{
			name:     "no colon returns full model segment",
			path:     "/v1beta/models/gemini-2.0-flash",
			expected: "gemini-2.0-flash",
		},
		{
			name:     "no /models/ prefix returns empty",
			path:     "/v1beta/something/gemini-2.0-flash:generateContent",
			expected: "",
		},
		{
			name:     "empty path returns empty",
			path:     "",
			expected: "",
		},
		{
			name:     "path ends at /models/ boundary returns empty",
			path:     "/v1beta/models/",
			expected: "",
		},
		{
			name:     "model with complex version and date",
			path:     "/v1/models/gemini-2.5-pro-preview-05-06:generateContent",
			expected: "gemini-2.5-pro-preview-05-06",
		},
		{
			name:     "multiple colons takes first segment",
			path:     "/v1beta/models/model-name:action:extra",
			expected: "model-name",
		},
		{
			name:     "models appears mid-path",
			path:     "/api/v2/models/custom-model:call",
			expected: "custom-model",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractModelNameFromGeminiPath(tt.path)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetJSONStringValue(t *testing.T) {
	tests := []struct {
		name        string
		json        string
		field       string
		expected    string
		expectError bool
	}{
		{
			name:     "valid string value",
			json:     `{"model":"gpt-4"}`,
			field:    "model",
			expected: "gpt-4",
		},
		{
			name:     "missing field returns empty string",
			json:     `{"other":"value"}`,
			field:    "model",
			expected: "",
		},
		{
			name:     "null field returns empty string",
			json:     `{"model":null}`,
			field:    "model",
			expected: "",
		},
		{
			name:        "numeric field returns type error",
			json:        `{"model":123}`,
			field:       "model",
			expectError: true,
		},
		{
			name:        "boolean field returns type error",
			json:        `{"model":true}`,
			field:       "model",
			expectError: true,
		},
		{
			name:        "array field returns type error",
			json:        `{"model":["gpt-4"]}`,
			field:       "model",
			expectError: true,
		},
		{
			name:        "object field returns type error",
			json:        `{"model":{"name":"gpt-4"}}`,
			field:       "model",
			expectError: true,
		},
		{
			name:     "empty string is valid",
			json:     `{"model":""}`,
			field:    "model",
			expected: "",
		},
		{
			name:     "string with spaces",
			json:     `{"model":" gpt-4 "}`,
			field:    "model",
			expected: " gpt-4 ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := gjson.Get(tt.json, tt.field)
			value, err := getJSONStringValue(result, tt.field)
			if tt.expectError {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.field)
				assert.Contains(t, err.Error(), "must be a string")
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expected, value)
			}
		})
	}
}

func TestChannelSupportsRequestPath(t *testing.T) {
	tests := []struct {
		name         string
		channel      *model.Channel
		requestPath  string
		requestModel string
		expected     bool
	}{
		{
			name:     "nil channel returns false",
			channel:  nil,
			expected: false,
		},
		{
			name:         "OpenAI type always returns true",
			channel:      &model.Channel{Type: 1},
			requestPath:  "/v1/chat/completions",
			requestModel: "gpt-4",
			expected:     true,
		},
		{
			name:         "Claude type always returns true",
			channel:      &model.Channel{Type: 19},
			requestPath:  "/v1/messages",
			requestModel: "claude-3-opus",
			expected:     true,
		},
		{
			name:         "AdvancedCustom with empty settings returns false",
			channel:      &model.Channel{Type: constant.ChannelTypeAdvancedCustom, OtherSettings: "{}"},
			requestPath:  "/v1/chat/completions",
			requestModel: "gpt-4",
			expected:     false,
		},
		{
			name: "AdvancedCustom with matching route and model returns true",
			channel: makeAdvancedCustomChannel(t, &dto.AdvancedCustomConfig{
				Routes: []dto.AdvancedCustomRoute{
					{
						IncomingPath: "/v1/chat/completions",
						UpstreamPath: "/api/chat",
						Models:       []string{"gpt-4", "gpt-3.5-turbo"},
					},
				},
			}),
			requestPath:  "/v1/chat/completions",
			requestModel: "gpt-4",
			expected:     true,
		},
		{
			name: "AdvancedCustom with non-matching path returns false",
			channel: makeAdvancedCustomChannel(t, &dto.AdvancedCustomConfig{
				Routes: []dto.AdvancedCustomRoute{
					{
						IncomingPath: "/v1/embeddings",
						UpstreamPath: "/api/embed",
						Models:       []string{"text-embedding-3-large"},
					},
				},
			}),
			requestPath:  "/v1/chat/completions",
			requestModel: "text-embedding-3-large",
			expected:     false,
		},
		{
			name: "AdvancedCustom with non-matching model returns false",
			channel: makeAdvancedCustomChannel(t, &dto.AdvancedCustomConfig{
				Routes: []dto.AdvancedCustomRoute{
					{
						IncomingPath: "/v1/chat/completions",
						UpstreamPath: "/api/chat",
						Models:       []string{"gpt-3.5-turbo"},
					},
				},
			}),
			requestPath:  "/v1/chat/completions",
			requestModel: "gpt-4",
			expected:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := channelSupportsRequestPath(tt.channel, tt.requestPath, tt.requestModel)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func makeAdvancedCustomChannel(t *testing.T, config *dto.AdvancedCustomConfig) *model.Channel {
	t.Helper()
	settings := dto.ChannelOtherSettings{
		AdvancedCustom: config,
	}
	settingsJSON, err := common.Marshal(settings)
	require.NoError(t, err)
	return &model.Channel{
		Type:          constant.ChannelTypeAdvancedCustom,
		OtherSettings: string(settingsJSON),
	}
}

func TestSetupContextForSelectedChannelNilChannel(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())

	apiErr := SetupContextForSelectedChannel(ctx, nil, "gpt-4")

	require.NotNil(t, apiErr)
	assert.Equal(t, "gpt-4", ctx.GetString("original_model"))
}

func TestSetupContextForSelectedChannelSetsContextKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	org := "org-test"
	channel := &model.Channel{
		Id:                 42,
		Name:               "test-channel",
		Type:               1,
		Key:                "sk-test-key",
		Status:             1,
		OpenAIOrganization: &org,
		CreatedTime:        1700000000,
	}

	apiErr := SetupContextForSelectedChannel(ctx, channel, "gpt-4o")

	require.Nil(t, apiErr)
	assert.Equal(t, "gpt-4o", ctx.GetString("original_model"))

	channelId, exists := ctx.Get(string(constant.ContextKeyChannelId))
	require.True(t, exists)
	assert.Equal(t, 42, channelId)

	channelName, exists := ctx.Get(string(constant.ContextKeyChannelName))
	require.True(t, exists)
	assert.Equal(t, "test-channel", channelName)

	channelType, exists := ctx.Get(string(constant.ContextKeyChannelType))
	require.True(t, exists)
	assert.Equal(t, 1, channelType)

	channelKey, exists := ctx.Get(string(constant.ContextKeyChannelKey))
	require.True(t, exists)
	assert.Equal(t, "sk-test-key", channelKey)

	channelOrg, exists := ctx.Get(string(constant.ContextKeyChannelOrganization))
	require.True(t, exists)
	assert.Equal(t, "org-test", channelOrg)
}

func TestSetupContextForSelectedChannelWithoutOrganization(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	channel := &model.Channel{
		Id:     1,
		Name:   "no-org-channel",
		Type:   1,
		Key:    "sk-key",
		Status: 1,
	}

	apiErr := SetupContextForSelectedChannel(ctx, channel, "gpt-4")

	require.Nil(t, apiErr)
	_, exists := ctx.Get(string(constant.ContextKeyChannelOrganization))
	assert.False(t, exists, "organization should not be set when nil")
}

func TestSetupContextForSelectedChannelAzureSetsApiVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	channel := &model.Channel{
		Id:    1,
		Name:  "azure-channel",
		Type:  constant.ChannelTypeAzure,
		Key:   "azure-key",
		Other: "2024-02-15-preview",
	}

	apiErr := SetupContextForSelectedChannel(ctx, channel, "gpt-4")

	require.Nil(t, apiErr)
	assert.Equal(t, "2024-02-15-preview", ctx.GetString("api_version"))
}

func TestSetupContextForSelectedChannelGeminiSetsApiVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	channel := &model.Channel{
		Id:    2,
		Name:  "gemini-channel",
		Type:  constant.ChannelTypeGemini,
		Key:   "gemini-key",
		Other: "v1beta",
	}

	apiErr := SetupContextForSelectedChannel(ctx, channel, "gemini-pro")

	require.Nil(t, apiErr)
	assert.Equal(t, "v1beta", ctx.GetString("api_version"))
}

func TestSetupContextForSelectedChannelVertexAiSetsRegion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	channel := &model.Channel{
		Id:    3,
		Name:  "vertex-channel",
		Type:  constant.ChannelTypeVertexAi,
		Key:   "vertex-key",
		Other: "us-central1",
	}

	apiErr := SetupContextForSelectedChannel(ctx, channel, "gemini-pro")

	require.Nil(t, apiErr)
	assert.Equal(t, "us-central1", ctx.GetString("region"))
}
