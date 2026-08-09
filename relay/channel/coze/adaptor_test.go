package coze

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// convertCozeChatRequest
// ---------------------------------------------------------------------------

func TestConvertCozeChatRequest_BasicUserMessages(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set("bot_id", "bot_test_123")

	stream := false
	request := dto.GeneralOpenAIRequest{
		Model: "moonshot-v1-8k",
		Messages: []dto.Message{
			{Role: "system", Content: "You are a helpful assistant."},
			{Role: "user", Content: "Hello, how are you?"},
			{Role: "assistant", Content: "I am fine."},
			{Role: "user", Content: "Tell me a joke."},
		},
		Stream: &stream,
	}

	result := convertCozeChatRequest(c, request)
	require.NotNil(t, result)
	assert.Equal(t, "bot_test_123", result.BotId)
	assert.False(t, result.Stream)

	// Only user messages should be converted
	assert.Len(t, result.AdditionalMessages, 2)
	assert.Equal(t, "user", result.AdditionalMessages[0].Role)
	assert.Equal(t, "text", result.AdditionalMessages[0].ContentType)
}

func TestConvertCozeChatRequest_StreamTrue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set("bot_id", "bot_456")

	stream := true
	request := dto.GeneralOpenAIRequest{
		Model: "deepseek-v3",
		Messages: []dto.Message{
			{Role: "user", Content: "hi"},
		},
		Stream: &stream,
	}

	result := convertCozeChatRequest(c, request)
	assert.True(t, result.Stream)
}

func TestConvertCozeChatRequest_NoUserMessages(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set("bot_id", "bot_789")

	request := dto.GeneralOpenAIRequest{
		Model: "deepseek-v3",
		Messages: []dto.Message{
			{Role: "system", Content: "system prompt"},
			{Role: "assistant", Content: "previous response"},
		},
	}

	result := convertCozeChatRequest(c, request)
	assert.Nil(t, result.AdditionalMessages)
}

func TestConvertCozeChatRequest_UserIdFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set("bot_id", "bot_abc")
	c.Set("X-Oneapi-Request-Id", "req-12345")

	// No User field in the request → should use helper.GetResponseID(c) as fallback
	request := dto.GeneralOpenAIRequest{
		Model: "moonshot-v1-8k",
		Messages: []dto.Message{
			{Role: "user", Content: "test"},
		},
	}

	result := convertCozeChatRequest(c, request)
	require.NotNil(t, result.UserId)
	// UserId should be non-empty (it's the fallback from GetResponseID)
	assert.NotEmpty(t, result.UserId)
}

func TestConvertCozeChatRequest_ExplicitUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set("bot_id", "bot_def")

	request := dto.GeneralOpenAIRequest{
		Model: "moonshot-v1-8k",
		Messages: []dto.Message{
			{Role: "user", Content: "hi"},
		},
		User: json.RawMessage(`"user-custom-id"`),
	}

	result := convertCozeChatRequest(c, request)
	assert.Equal(t, json.RawMessage(`"user-custom-id"`), result.UserId)
}

// ---------------------------------------------------------------------------
// Adaptor.GetRequestURL
// ---------------------------------------------------------------------------

func TestGetRequestURL(t *testing.T) {
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelBaseUrl: "https://api.coze.cn",
	}

	url, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.coze.cn/v3/chat", url)
}

func TestGetRequestURL_TrailingSlash(t *testing.T) {
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelBaseUrl: "https://api.coze.com",
	}

	url, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.coze.com/v3/chat", url)
}

// ---------------------------------------------------------------------------
// Adaptor.SetupRequestHeader
// ---------------------------------------------------------------------------

func TestSetupRequestHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v3/chat", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ApiKey: "pat_coze_test_token",
	}

	a := &Adaptor{}
	header := make(http.Header)
	err := a.SetupRequestHeader(c, &header, info)
	require.NoError(t, err)
	assert.Equal(t, "Bearer pat_coze_test_token", header.Get("Authorization"))
}

// ---------------------------------------------------------------------------
// Adaptor.ConvertOpenAIRequest
// ---------------------------------------------------------------------------

func TestConvertOpenAIRequest_NilRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	a := &Adaptor{}
	_, err := a.ConvertOpenAIRequest(c, &relaycommon.RelayInfo{}, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "request is nil")
}

func TestConvertOpenAIRequest_ReturnsCozeRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set("bot_id", "bot_convert")

	stream := true
	request := &dto.GeneralOpenAIRequest{
		Model: "Doubao-pro-32k",
		Messages: []dto.Message{
			{Role: "user", Content: "What is 2+2?"},
		},
		Stream: &stream,
	}

	a := &Adaptor{}
	result, err := a.ConvertOpenAIRequest(c, &relaycommon.RelayInfo{}, request)
	require.NoError(t, err)

	cozeReq, ok := result.(*CozeChatRequest)
	require.True(t, ok)
	assert.Equal(t, "bot_convert", cozeReq.BotId)
	assert.True(t, cozeReq.Stream)
	assert.Len(t, cozeReq.AdditionalMessages, 1)
}

// ---------------------------------------------------------------------------
// Adaptor.GetModelList / GetChannelName
// ---------------------------------------------------------------------------

func TestGetModelList(t *testing.T) {
	a := &Adaptor{}
	models := a.GetModelList()
	assert.Contains(t, models, "moonshot-v1-8k")
	assert.Contains(t, models, "deepseek-r1")
	assert.Contains(t, models, "Doubao-pro-32k")
	assert.Greater(t, len(models), 5)
}

func TestGetChannelName(t *testing.T) {
	a := &Adaptor{}
	assert.Equal(t, "coze", a.GetChannelName())
}

// ---------------------------------------------------------------------------
// Unimplemented methods return errors
// ---------------------------------------------------------------------------

func TestAdaptor_UnimplementedMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	a := &Adaptor{}
	info := &relaycommon.RelayInfo{}

	_, err := a.ConvertClaudeRequest(c, info, nil)
	assert.Error(t, err)

	_, err = a.ConvertAudioRequest(c, info, dto.AudioRequest{})
	assert.Error(t, err)

	_, err = a.ConvertImageRequest(c, info, dto.ImageRequest{})
	assert.Error(t, err)

	_, err = a.ConvertEmbeddingRequest(c, info, dto.EmbeddingRequest{})
	assert.Error(t, err)

	_, err = a.ConvertRerankRequest(c, 0, dto.RerankRequest{})
	assert.Error(t, err)

	_, err = a.ConvertOpenAIResponsesRequest(c, info, dto.OpenAIResponsesRequest{})
	assert.Error(t, err)

	_, err = a.ConvertGeminiRequest(c, info, nil)
	assert.Error(t, err)
}

// ---------------------------------------------------------------------------
// CozeChatRequest serialization
// ---------------------------------------------------------------------------

func TestCozeChatRequest_JSONSerialization(t *testing.T) {
	req := &CozeChatRequest{
		BotId:  "bot_123",
		UserId: json.RawMessage(`"user_456"`),
		AdditionalMessages: []CozeEnterMessage{
			{Role: "user", Content: "hello", ContentType: "text"},
		},
		Stream: true,
	}

	data, err := json.Marshal(req)
	require.NoError(t, err)

	var decoded CozeChatRequest
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)
	assert.Equal(t, "bot_123", decoded.BotId)
	assert.True(t, decoded.Stream)
	assert.Len(t, decoded.AdditionalMessages, 1)
	assert.Equal(t, "user", decoded.AdditionalMessages[0].Role)
}

// ---------------------------------------------------------------------------
// CozeError / CozeChatResponse parsing
// ---------------------------------------------------------------------------

func TestCozeChatResponse_Parsing(t *testing.T) {
	raw := `{
		"code": 0,
		"msg": "success",
		"data": {
			"id": "chat_001",
			"conversation_id": "conv_001",
			"bot_id": "bot_001",
			"created_at": 1700000000,
			"last_error": {"code": 0, "message": ""},
			"status": "completed",
			"usage": {"token_count": 100, "output_count": 50, "input_count": 50}
		}
	}`

	var resp CozeChatResponse
	err := json.Unmarshal([]byte(raw), &resp)
	require.NoError(t, err)
	assert.Equal(t, 0, resp.Code)
	assert.Equal(t, "success", resp.Msg)
	assert.Equal(t, "chat_001", resp.Data.Id)
	assert.Equal(t, "conv_001", resp.Data.ConversationId)
	assert.Equal(t, "completed", resp.Data.Status)
	assert.Equal(t, 100, resp.Data.Usage.TokenCount)
	assert.Equal(t, 50, resp.Data.Usage.OutputCount)
	assert.Equal(t, 50, resp.Data.Usage.InputCount)
}

func TestCozeChatDetailResponse_Parsing(t *testing.T) {
	raw := `{
		"code": 0,
		"msg": "",
		"data": [
			{
				"id": "msg_001",
				"role": "assistant",
				"type": "answer",
				"bot_id": "bot_001",
				"chat_id": "chat_001",
				"content": "\"Hello there!\"",
				"created_at": 1700000001,
				"content_type": "text",
				"conversation_id": "conv_001",
				"reasoning_content": ""
			}
		],
		"detail": {"logid": "log_xyz"}
	}`

	var resp CozeChatDetailResponse
	err := json.Unmarshal([]byte(raw), &resp)
	require.NoError(t, err)
	assert.Equal(t, 0, resp.Code)
	assert.Len(t, resp.Data, 1)
	assert.Equal(t, "assistant", resp.Data[0].Role)
	assert.Equal(t, "answer", resp.Data[0].Type)
	assert.Equal(t, "log_xyz", resp.Detail.Logid)
}

func TestCozeChatDetailResponse_ErrorResponse(t *testing.T) {
	raw := `{
		"code": 4001,
		"msg": "invalid bot_id",
		"data": [],
		"detail": {"logid": "log_err"}
	}`

	var resp CozeChatDetailResponse
	err := json.Unmarshal([]byte(raw), &resp)
	require.NoError(t, err)
	assert.Equal(t, 4001, resp.Code)
	assert.Equal(t, "invalid bot_id", resp.Msg)
}
