// Fork-added coverage tests for the deepseek adaptor. Appended here per the
// fork-aware convention (one coverage_test.go per package). Migrated from the
// fork's prior adaptor_test.go when that upstream test file was restored to
// the upstream version; they cover the OpenAI/Responses V4 thinking-suffix
// conversion and the adaptor interface methods that upstream's adaptor_test.go
// does not exercise.
package deepseek

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetRequestURL(t *testing.T) {
	tests := []struct {
		name        string
		baseUrl     string
		relayMode   int
		relayFormat types.RelayFormat
		wantURL     string
	}{
		{
			name:        "chat completions default",
			baseUrl:     "https://api.deepseek.com",
			relayMode:   constant.RelayModeChatCompletions,
			relayFormat: types.RelayFormatOpenAI,
			wantURL:     "https://api.deepseek.com/v1/chat/completions",
		},
		{
			name:        "completions mode appends /beta",
			baseUrl:     "https://api.deepseek.com",
			relayMode:   constant.RelayModeCompletions,
			relayFormat: types.RelayFormatOpenAI,
			wantURL:     "https://api.deepseek.com/beta/completions",
		},
		{
			name:        "completions mode with existing /beta suffix",
			baseUrl:     "https://api.deepseek.com/beta",
			relayMode:   constant.RelayModeCompletions,
			relayFormat: types.RelayFormatOpenAI,
			wantURL:     "https://api.deepseek.com/beta/completions",
		},
		{
			name:        "responses mode",
			baseUrl:     "https://api.deepseek.com",
			relayMode:   constant.RelayModeResponses,
			relayFormat: types.RelayFormatOpenAI,
			wantURL:     "https://api.deepseek.com/responses",
		},
		{
			name:        "claude format",
			baseUrl:     "https://api.deepseek.com",
			relayMode:   constant.RelayModeChatCompletions,
			relayFormat: types.RelayFormatClaude,
			wantURL:     "https://api.deepseek.com/anthropic/v1/messages",
		},
	}

	a := &Adaptor{}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			info := &relaycommon.RelayInfo{
				RelayMode:   tc.relayMode,
				RelayFormat: tc.relayFormat,
			}
			info.ChannelMeta = &relaycommon.ChannelMeta{
				ChannelBaseUrl: tc.baseUrl,
			}
			url, err := a.GetRequestURL(info)
			require.NoError(t, err)
			assert.Equal(t, tc.wantURL, url)
		})
	}
}

func TestSetupRequestHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ApiKey: "sk-test-key-123",
	}

	a := &Adaptor{}
	header := make(http.Header)
	err := a.SetupRequestHeader(c, &header, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer sk-test-key-123", header.Get("Authorization"))
}

func TestConvertOpenAIRequest_NilRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	a := &Adaptor{}
	_, err := a.ConvertOpenAIRequest(c, &relaycommon.RelayInfo{}, nil)
	assert.Error(t, err)
}

// Without a V4 effort suffix, the request passes through unchanged.
func TestConvertOpenAIRequest_NoSuffix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "deepseek-chat",
	}

	request := &dto.GeneralOpenAIRequest{
		Model: "deepseek-chat",
	}

	result, err := convertOpenAIRequest(c, info, request)
	require.NoError(t, err)
	openaiReq, ok := result.(*dto.GeneralOpenAIRequest)
	require.True(t, ok)
	assert.Equal(t, "deepseek-chat", openaiReq.Model)
	assert.Nil(t, openaiReq.THINKING)
}

// A -max tail strips the suffix, enables thinking, and sets effort to "max".
func TestConvertOpenAIRequest_V4MaxSuffix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "deepseek-v4-flash-max",
	}

	request := &dto.GeneralOpenAIRequest{
		Model: "deepseek-v4-flash-max",
	}

	result, err := convertOpenAIRequest(c, info, request)
	require.NoError(t, err)
	openaiReq, ok := result.(*dto.GeneralOpenAIRequest)
	require.True(t, ok)
	assert.Equal(t, "deepseek-v4-flash", openaiReq.Model)
	assert.Equal(t, "max", openaiReq.ReasoningEffort)

	var thinking map[string]string
	err = common.Unmarshal(openaiReq.THINKING, &thinking)
	require.NoError(t, err)
	assert.Equal(t, "enabled", thinking["type"])
}

// A -none tail strips the suffix and disables thinking with empty effort.
func TestConvertOpenAIRequest_V4NoneSuffix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "deepseek-v4-pro-none",
	}

	request := &dto.GeneralOpenAIRequest{
		Model: "deepseek-v4-pro-none",
	}

	result, err := convertOpenAIRequest(c, info, request)
	require.NoError(t, err)
	openaiReq, ok := result.(*dto.GeneralOpenAIRequest)
	require.True(t, ok)
	assert.Equal(t, "deepseek-v4-pro", openaiReq.Model)
	assert.Equal(t, "", openaiReq.ReasoningEffort)

	var thinking map[string]string
	err = common.Unmarshal(openaiReq.THINKING, &thinking)
	require.NoError(t, err)
	assert.Equal(t, "disabled", thinking["type"])
}

// Models outside the deepseek-v4-* / deepseek-flash family are not processed.
func TestConvertOpenAIRequest_NonV4ModelWithSuffix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "deepseek-chat-max",
	}

	request := &dto.GeneralOpenAIRequest{
		Model: "deepseek-chat-max",
	}

	result, err := convertOpenAIRequest(c, info, request)
	require.NoError(t, err)
	openaiReq, ok := result.(*dto.GeneralOpenAIRequest)
	require.True(t, ok)
	assert.Equal(t, "deepseek-chat-max", openaiReq.Model)
	assert.Nil(t, openaiReq.THINKING)
}

func TestGetModelList(t *testing.T) {
	a := &Adaptor{}
	models := a.GetModelList()
	assert.NotEmpty(t, models)
	assert.Contains(t, models, "deepseek-flash")
	assert.Contains(t, models, "deepseek-v4-pro")
}

func TestGetChannelName(t *testing.T) {
	a := &Adaptor{}
	assert.Equal(t, "deepseek", a.GetChannelName())
}

func TestConvertOpenAIResponsesRequest_V4MaxSuffix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "deepseek-v4-flash-max",
	}

	request := dto.OpenAIResponsesRequest{
		Model: "deepseek-v4-flash-max",
	}

	a := &Adaptor{}
	result, err := a.ConvertOpenAIResponsesRequest(c, info, request)
	require.NoError(t, err)

	respReq, ok := result.(dto.OpenAIResponsesRequest)
	require.True(t, ok)
	assert.Equal(t, "deepseek-v4-flash", respReq.Model)
	require.NotNil(t, respReq.Reasoning)
	assert.Equal(t, "max", respReq.Reasoning.Effort)
}

func TestConvertOpenAIResponsesRequest_V4NoneSuffix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "deepseek-v4-pro-none",
	}

	request := dto.OpenAIResponsesRequest{
		Model: "deepseek-v4-pro-none",
	}

	a := &Adaptor{}
	result, err := a.ConvertOpenAIResponsesRequest(c, info, request)
	require.NoError(t, err)

	respReq, ok := result.(dto.OpenAIResponsesRequest)
	require.True(t, ok)
	assert.Equal(t, "deepseek-v4-pro", respReq.Model)
	require.NotNil(t, respReq.Reasoning)
	// -none disables thinking, which maps to effort "none" in responses format.
	assert.Equal(t, "none", respReq.Reasoning.Effort)
}

func TestConvertOpenAIResponsesRequest_NoSuffix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		UpstreamModelName: "deepseek-v4-flash",
	}

	request := dto.OpenAIResponsesRequest{
		Model: "deepseek-v4-flash",
	}

	a := &Adaptor{}
	result, err := a.ConvertOpenAIResponsesRequest(c, info, request)
	require.NoError(t, err)

	respReq, ok := result.(dto.OpenAIResponsesRequest)
	require.True(t, ok)
	assert.Equal(t, "deepseek-v4-flash", respReq.Model)
	assert.Nil(t, respReq.Reasoning)
}

func convertOpenAIRequest(c *gin.Context, info *relaycommon.RelayInfo, req *dto.GeneralOpenAIRequest) (any, error) {
	a := &Adaptor{}
	return a.ConvertOpenAIRequest(c, info, req)
}
