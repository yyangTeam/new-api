package claude

import (
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
	"github.com/QuantumNous/new-api/setting/model_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

// This file locks the observable contracts of the Claude channel adaptor and
// relay-claude response handling: URL construction, header setup, the
// OpenAI<->Claude stop-reason mapping, content/usage block transforms, cache
// token accounting, and the stream/non-stream dispatch branches. These are
// pure transforms or contract-shaped dispatchers; no real upstream HTTP.

// --- helpers ---------------------------------------------------------------

func newTestContext() *gin.Context {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	return c
}

func strPtr(s string) *string { return &s }
func uintPtr(v uint) *uint    { return &v }

// usageFromAny asserts a DoResponse "usage any" return into *dto.Usage.
func usageFromAny(t *testing.T, v any) *dto.Usage {
	t.Helper()
	u, ok := v.(*dto.Usage)
	require.True(t, ok, "expected *dto.Usage, got %T", v)
	require.NotNil(t, u)
	return u
}

// recorderBody returns the body captured by the httptest.ResponseRecorder backing
// a gin test context. gin wraps the recorder in its own responseWriter, which
// exposes the underlying http.ResponseWriter via Unwrap(); from there we can
// type-assert back to *httptest.ResponseRecorder and read its buffer.
func recorderBody(c *gin.Context) string {
	w := c.Writer
	if w == nil {
		return ""
	}
	unwrapper, ok := w.(interface{ Unwrap() http.ResponseWriter })
	if !ok {
		return ""
	}
	rec, ok := unwrapper.Unwrap().(*httptest.ResponseRecorder)
	if !ok {
		return ""
	}
	return rec.Body.String()
}

// --- GetRequestURL ---------------------------------------------------------

func TestGetRequestURL_PlainBaseAppendsMessagesPath(t *testing.T) {
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelBaseUrl: "https://api.anthropic.com",
		},
	}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://api.anthropic.com/v1/messages", got)
}

func TestGetRequestURL_NoBetaFlagsOmitsQuery(t *testing.T) {
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta:        &relaycommon.ChannelMeta{ChannelBaseUrl: "https://host.example"},
		IsClaudeBetaQuery: false,
	}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.NotContains(t, got, "beta=")
}

func TestGetRequestURL_IsClaudeBetaQueryAppendsBetaTrue(t *testing.T) {
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta:        &relaycommon.ChannelMeta{ChannelBaseUrl: "https://host.example"},
		IsClaudeBetaQuery: true,
	}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://host.example/v1/messages?beta=true", got)
}

func TestGetRequestURL_ChannelOtherSettingsBetaAppendsBetaTrue(t *testing.T) {
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelBaseUrl:        "https://host.example",
			ChannelOtherSettings: dto.ChannelOtherSettings{ClaudeBetaQuery: true},
		},
	}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Equal(t, "https://host.example/v1/messages?beta=true", got)
}

func TestGetRequestURL_IsClaudeBetaQueryWinsOverChannelSetting(t *testing.T) {
	// Either flag is sufficient; verify the request-level flag is honored on its own.
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelBaseUrl:        "https://host.example",
			ChannelOtherSettings: dto.ChannelOtherSettings{ClaudeBetaQuery: false},
		},
		IsClaudeBetaQuery: true,
	}
	got, err := a.GetRequestURL(info)
	require.NoError(t, err)
	assert.Contains(t, got, "beta=true")
}

// --- shouldAppendClaudeBetaQuery -------------------------------------------

func TestShouldAppendClaudeBetaQuery(t *testing.T) {
	t.Run("nil info returns false", func(t *testing.T) {
		assert.False(t, shouldAppendClaudeBetaQuery(nil))
	})
	t.Run("neither flag returns false", func(t *testing.T) {
		info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{}}
		assert.False(t, shouldAppendClaudeBetaQuery(info))
	})
	t.Run("IsClaudeBetaQuery returns true", func(t *testing.T) {
		info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{}}
		info.IsClaudeBetaQuery = true
		assert.True(t, shouldAppendClaudeBetaQuery(info))
	})
	t.Run("channel other settings flag returns true", func(t *testing.T) {
		info := &relaycommon.RelayInfo{
			ChannelMeta: &relaycommon.ChannelMeta{
				ChannelOtherSettings: dto.ChannelOtherSettings{ClaudeBetaQuery: true},
			},
		}
		assert.True(t, shouldAppendClaudeBetaQuery(info))
	})
}

// --- SetupRequestHeader ----------------------------------------------------

func TestSetupRequestHeader_SetsApiKeyAndDefaultVersion(t *testing.T) {
	c := newTestContext()
	header := make(http.Header)
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{ApiKey: "sk-ant-key"},
		OriginModelName: "claude-3-5-sonnet",
	}
	a := &Adaptor{}
	require.NoError(t, a.SetupRequestHeader(c, &header, info))
	assert.Equal(t, "sk-ant-key", header.Get("x-api-key"))
	assert.Equal(t, "2023-06-01", header.Get("anthropic-version"))
	// No Bearer Authorization header for Claude (it uses x-api-key).
	assert.Empty(t, header.Get("Authorization"))
}

func TestSetupRequestHeader_RespectsClientAnthropicVersion(t *testing.T) {
	c := newTestContext()
	c.Request.Header.Set("anthropic-version", "2024-10-22")
	header := make(http.Header)
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{ApiKey: "k"},
		OriginModelName: "m",
	}
	a := &Adaptor{}
	require.NoError(t, a.SetupRequestHeader(c, &header, info))
	assert.Equal(t, "2024-10-22", header.Get("anthropic-version"))
}

func TestSetupRequestHeader_ForwardsAnthropicBeta(t *testing.T) {
	c := newTestContext()
	c.Request.Header.Set("anthropic-beta", "prompt-caching-2024-07-31,output-128k-2025-02-19")
	header := make(http.Header)
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{ApiKey: "k"},
		OriginModelName: "m",
	}
	a := &Adaptor{}
	require.NoError(t, a.SetupRequestHeader(c, &header, info))
	assert.Equal(t, "prompt-caching-2024-07-31,output-128k-2025-02-19", header.Get("anthropic-beta"))
}

func TestSetupRequestHeader_OmitsAnthropicBetaWhenAbsent(t *testing.T) {
	c := newTestContext()
	header := make(http.Header)
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{ApiKey: "k"},
		OriginModelName: "m",
	}
	a := &Adaptor{}
	require.NoError(t, a.SetupRequestHeader(c, &header, info))
	assert.Empty(t, header.Get("anthropic-beta"))
}

func TestSetupRequestHeader_StreamSetsAcceptTextEventStream(t *testing.T) {
	c := newTestContext()
	c.Request.Header.Set("Accept", "") // client did not set Accept
	header := make(http.Header)
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{ApiKey: "k"},
		OriginModelName: "m",
		IsStream:         true,
	}
	a := &Adaptor{}
	require.NoError(t, a.SetupRequestHeader(c, &header, info))
	assert.Equal(t, "text/event-stream", header.Get("Accept"))
}

func TestCommonClaudeHeadersOperation_ForwardsBetaAndNoOpsWhenAbsent(t *testing.T) {
	t.Run("forwards beta header", func(t *testing.T) {
		c := newTestContext()
		c.Request.Header.Set("anthropic-beta", "computer-use-2024-10-22")
		header := make(http.Header)
		CommonClaudeHeadersOperation(c, &header, &relaycommon.RelayInfo{
			OriginModelName: "claude-3-5-sonnet",
		})
		assert.Equal(t, "computer-use-2024-10-22", header.Get("anthropic-beta"))
	})
	t.Run("no beta header is a no-op for an unconfigured model", func(t *testing.T) {
		c := newTestContext()
		header := make(http.Header)
		CommonClaudeHeadersOperation(c, &header, &relaycommon.RelayInfo{
			OriginModelName: "claude-3-5-sonnet",
		})
		assert.Empty(t, header.Get("anthropic-beta"))
	})
}

// --- ConvertClaudeRequest (passthrough) ------------------------------------

func TestConvertClaudeRequest_Passthrough(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{}}
	req := &dto.ClaudeRequest{Model: "claude-3-5-sonnet", MaxTokens: uintPtr(1024)}
	a := &Adaptor{}
	got, err := a.ConvertClaudeRequest(c, info, req)
	require.NoError(t, err)
	require.Equal(t, req, got.(*dto.ClaudeRequest))
}

// --- ConvertOpenAIRequest --------------------------------------------------

func TestConvertOpenAIRequest_NilReturnsError(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{}}
	a := &Adaptor{}
	_, err := a.ConvertOpenAIRequest(c, info, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "request is nil")
}

func TestConvertOpenAIRequest_ConvertsToClaudeRequest(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{}}
	req := &dto.GeneralOpenAIRequest{
		Model: "claude-3-5-sonnet",
		Messages: []dto.Message{
			{Role: "system", Content: "You are a helpful assistant."},
			{Role: "user", Content: "Hello"},
		},
	}
	a := &Adaptor{}
	got, err := a.ConvertOpenAIRequest(c, info, req)
	require.NoError(t, err)
	claudeReq, ok := got.(*dto.ClaudeRequest)
	require.True(t, ok)
	// OpenAI "system" role is extracted into Claude's top-level System field as a
	// list of media messages (text block), and removed from the message list.
	assert.Equal(t, "claude-3-5-sonnet", claudeReq.Model)
	require.NotNil(t, claudeReq.System)
	systemMedia := claudeReq.ParseSystem()
	require.Len(t, systemMedia, 1)
	assert.Equal(t, "text", systemMedia[0].Type)
	assert.Equal(t, "You are a helpful assistant.", systemMedia[0].GetText())
	// The user message must remain, with the system message removed from the list.
	require.Len(t, claudeReq.Messages, 1)
	assert.Equal(t, "user", claudeReq.Messages[0].Role)
}

// --- Not-implemented stubs -------------------------------------------------

func TestAdaptorNotImplementedStubs(t *testing.T) {
	a := &Adaptor{}
	c := newTestContext()
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{}}

	_, err := a.ConvertGeminiRequest(c, info, &dto.GeminiChatRequest{})
	require.Error(t, err)

	_, err = a.ConvertAudioRequest(c, info, dto.AudioRequest{})
	require.Error(t, err)

	_, err = a.ConvertImageRequest(c, info, dto.ImageRequest{})
	require.Error(t, err)

	_, err = a.ConvertEmbeddingRequest(c, info, dto.EmbeddingRequest{})
	require.Error(t, err)

	_, err = a.ConvertOpenAIResponsesRequest(c, info, dto.OpenAIResponsesRequest{})
	require.Error(t, err)

	// ConvertRerankRequest is intentionally a no-op passthrough (returns nil,nil),
	// not an error — locking that contract.
	res, err := a.ConvertRerankRequest(c, relayconstant.RelayModeRerank, dto.RerankRequest{})
	require.NoError(t, err)
	assert.Nil(t, res)
}

// --- Init / GetModelList / GetChannelName / DoResponse ---------------------

func TestAdaptorInitIsNoOp(t *testing.T) {
	a := &Adaptor{}
	// Init is a no-op for the Claude adaptor; it must not panic and must not
	// mutate the info struct.
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeAnthropic}}
	require.NotPanics(t, func() { a.Init(info) })
}

func TestAdaptorGetModelList(t *testing.T) {
	a := &Adaptor{}
	list := a.GetModelList()
	assert.NotEmpty(t, list)
	assert.Contains(t, list, "claude-3-5-sonnet-20241022")
	assert.Contains(t, list, "claude-opus-4-8")
}

func TestAdaptorGetChannelName(t *testing.T) {
	a := &Adaptor{}
	assert.Equal(t, "claude", a.GetChannelName())
}

func TestDoResponse_DispatchesByStreamFlag(t *testing.T) {
	a := &Adaptor{}
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		RelayFormat:      types.RelayFormatClaude,
	}
	// Non-stream path returns the ClaudeHandler result (usage, nil).
	info.IsStream = false
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(`{"type":"message","content":[{"type":"text","text":"hi"}],"usage":{"input_tokens":3,"output_tokens":2}}`)),
	}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageFromAny(t, usageAny)
	assert.Equal(t, 3, usage.PromptTokens)
	assert.Equal(t, 2, usage.CompletionTokens)
	assert.Equal(t, string(types.RelayFormatClaude), string(info.FinalRequestRelayFormat))
}

// --- stopReasonClaude2OpenAI (load-bearing OpenAI<->Claude mapping) --------

func TestStopReasonClaude2OpenAI(t *testing.T) {
	tests := []struct {
		name   string
		reason string
		want   string
	}{
		{"end_turn -> stop", "end_turn", "stop"},
		{"stop_sequence -> stop", "stop_sequence", "stop"},
		{"max_tokens -> length", "max_tokens", "length"},
		{"tool_use -> tool_calls", "tool_use", "tool_calls"},
		{"refusal -> content_filter", "refusal", "content_filter"},
		{"unknown passes through unchanged", "model_context_window_exceeded", "model_context_window_exceeded"},
		{"empty passes through", "", ""},
		{"case-insensitive End_Turn", "End_Turn", "stop"},
		{"case-insensitive MAX_TOKENS", "MAX_TOKENS", "length"},
		{"case-insensitive Tool_Use", "Tool_Use", "tool_calls"},
		{"case-insensitive REFUSAL", "REFUSAL", "content_filter"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, stopReasonClaude2OpenAI(tt.reason))
		})
	}
}

// --- maybeMarkClaudeRefusal ------------------------------------------------

func TestMaybeMarkClaudeRefusal(t *testing.T) {
	t.Run("nil context is safe", func(t *testing.T) {
		require.NotPanics(t, func() { maybeMarkClaudeRefusal(nil, "refusal") })
	})
	t.Run("refusal sets admin reject reason", func(t *testing.T) {
		c := newTestContext()
		maybeMarkClaudeRefusal(c, "refusal")
		val, ok := common.GetContextKey(c, constant.ContextKeyAdminRejectReason)
		require.True(t, ok)
		assert.Equal(t, "claude_stop_reason=refusal", val)
	})
	t.Run("refusal is case-insensitive", func(t *testing.T) {
		c := newTestContext()
		maybeMarkClaudeRefusal(c, "REFUSAL")
		_, ok := common.GetContextKey(c, constant.ContextKeyAdminRejectReason)
		assert.True(t, ok)
	})
	t.Run("non-refusal stop reason does not set reject reason", func(t *testing.T) {
		c := newTestContext()
		maybeMarkClaudeRefusal(c, "end_turn")
		_, ok := common.GetContextKey(c, constant.ContextKeyAdminRejectReason)
		assert.False(t, ok)
	})
}

// --- StreamResponseClaude2OpenAI ------------------------------------------

func TestStreamResponseClaude2OpenAI_MessageStart(t *testing.T) {
	resp := &dto.ClaudeResponse{
		Type: "message_start",
		Message: &dto.ClaudeMediaMessage{
			Id:    "msg_abc",
			Model: "claude-3-5-sonnet",
		},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	assert.Equal(t, "chat.completion.chunk", got.Object)
	assert.Equal(t, "msg_abc", got.Id)
	assert.Equal(t, "claude-3-5-sonnet", got.Model)
	require.Len(t, got.Choices, 1)
	assert.Equal(t, "assistant", got.Choices[0].Delta.Role)
	// message_start emits an empty content string delta.
	assert.Empty(t, got.Choices[0].Delta.GetContentString())
}

func TestStreamResponseClaude2OpenAI_ContentBlockStartText(t *testing.T) {
	text := "Hello"
	resp := &dto.ClaudeResponse{
		Type:         "content_block_start",
		ContentBlock: &dto.ClaudeMediaMessage{Type: "text", Text: &text},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.Len(t, got.Choices, 1)
	require.NotNil(t, got.Choices[0].Delta.Content)
	assert.Equal(t, "Hello", *got.Choices[0].Delta.Content)
	assert.Empty(t, got.Choices[0].Delta.ToolCalls)
}

func TestStreamResponseClaude2OpenAI_ContentBlockStartToolUse(t *testing.T) {
	idx := 0
	resp := &dto.ClaudeResponse{
		Type:  "content_block_start",
		Index: &idx,
		ContentBlock: &dto.ClaudeMediaMessage{
			Type: "tool_use",
			Id:   "toolu_1",
			Name: "get_weather",
		},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.Len(t, got.Choices, 1)
	// When a tool_use block starts, content must be cleared and a tool call emitted
	// with an empty arguments string (filled in by later input_json_delta chunks).
	assert.Nil(t, got.Choices[0].Delta.Content)
	require.Len(t, got.Choices[0].Delta.ToolCalls, 1)
	tc := got.Choices[0].Delta.ToolCalls[0]
	assert.Equal(t, "toolu_1", tc.ID)
	assert.Equal(t, "function", tc.Type)
	assert.Equal(t, "get_weather", tc.Function.Name)
	assert.Equal(t, "", tc.Function.Arguments)
}

func TestStreamResponseClaude2OpenAI_ContentBlockDeltaText(t *testing.T) {
	text := "world"
	resp := &dto.ClaudeResponse{
		Type:  "content_block_delta",
		Delta: &dto.ClaudeMediaMessage{Text: &text},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.NotNil(t, got.Choices[0].Delta.Content)
	assert.Equal(t, "world", *got.Choices[0].Delta.Content)
}

func TestStreamResponseClaude2OpenAI_ContentBlockDeltaInputJsonDelta(t *testing.T) {
	partial := `{"city":"NYC"`
	idx := 1
	resp := &dto.ClaudeResponse{
		Type:  "content_block_delta",
		Index: &idx,
		Delta: &dto.ClaudeMediaMessage{Type: "input_json_delta", PartialJson: &partial},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.Len(t, got.Choices[0].Delta.ToolCalls, 1)
	assert.Equal(t, `{"city":"NYC"`, got.Choices[0].Delta.ToolCalls[0].Function.Arguments)
	// input_json_delta must clear the text content slot.
	assert.Nil(t, got.Choices[0].Delta.Content)
}

func TestStreamResponseClaude2OpenAI_ContentBlockDeltaThinkingDelta(t *testing.T) {
	thinking := "reasoning step"
	resp := &dto.ClaudeResponse{
		Type:  "content_block_delta",
		Delta: &dto.ClaudeMediaMessage{Type: "thinking_delta", Thinking: &thinking},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.NotNil(t, got.Choices[0].Delta.ReasoningContent)
	assert.Equal(t, "reasoning step", *got.Choices[0].Delta.ReasoningContent)
}

func TestStreamResponseClaude2OpenAI_ContentBlockDeltaSignatureDelta(t *testing.T) {
	// signature_delta is rendered as a newline reasoning chunk.
	resp := &dto.ClaudeResponse{
		Type:  "content_block_delta",
		Delta: &dto.ClaudeMediaMessage{Type: "signature_delta"},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.NotNil(t, got.Choices[0].Delta.ReasoningContent)
	assert.Equal(t, "\n", *got.Choices[0].Delta.ReasoningContent)
}

func TestStreamResponseClaude2OpenAI_MessageDeltaMapsStopReason(t *testing.T) {
	stop := "end_turn"
	resp := &dto.ClaudeResponse{
		Type:  "message_delta",
		Delta: &dto.ClaudeMediaMessage{StopReason: &stop},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.Len(t, got.Choices, 1)
	require.NotNil(t, got.Choices[0].FinishReason)
	assert.Equal(t, "stop", *got.Choices[0].FinishReason)
}

func TestStreamResponseClaude2OpenAI_MessageDeltaNullStopReasonOmitsFinishReason(t *testing.T) {
	stop := "null" // sentinel value that must NOT become a finish_reason
	resp := &dto.ClaudeResponse{
		Type:  "message_delta",
		Delta: &dto.ClaudeMediaMessage{StopReason: &stop},
	}
	got := StreamResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.Len(t, got.Choices, 1)
	assert.Nil(t, got.Choices[0].FinishReason)
}

func TestStreamResponseClaude2OpenAI_MessageStopAndUnknownReturnNil(t *testing.T) {
	t.Run("message_stop returns nil", func(t *testing.T) {
		assert.Nil(t, StreamResponseClaude2OpenAI(&dto.ClaudeResponse{Type: "message_stop"}))
	})
	t.Run("unknown type returns nil", func(t *testing.T) {
		assert.Nil(t, StreamResponseClaude2OpenAI(&dto.ClaudeResponse{Type: "ping"}))
	})
	t.Run("content_block_start with nil block returns nil", func(t *testing.T) {
		assert.Nil(t, StreamResponseClaude2OpenAI(&dto.ClaudeResponse{Type: "content_block_start"}))
	})
}

// --- ResponseClaude2OpenAI --------------------------------------------------

func TestResponseClaude2OpenAI_TextAndStopReason(t *testing.T) {
	resp := &dto.ClaudeResponse{
		Id:         "msg_1",
		Model:      "claude-3-5-sonnet",
		StopReason: "end_turn",
		Content: []dto.ClaudeMediaMessage{
			{Type: "text", Text: strPtr("Hello there")},
		},
	}
	got := ResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	assert.Equal(t, "msg_1", got.Id)
	assert.Equal(t, "claude-3-5-sonnet", got.Model)
	assert.Equal(t, "chat.completion", got.Object)
	require.Len(t, got.Choices, 1)
	assert.Equal(t, "assistant", got.Choices[0].Message.Role)
	assert.Equal(t, "Hello there", got.Choices[0].Message.StringContent())
	assert.Equal(t, "stop", got.Choices[0].FinishReason)
}

func TestResponseClaude2OpenAI_ToolUseBecomesToolCalls(t *testing.T) {
	resp := &dto.ClaudeResponse{
		Id:         "msg_2",
		Model:      "claude-3-5-sonnet",
		StopReason: "tool_use",
		Content: []dto.ClaudeMediaMessage{
			{
				Type:  "tool_use",
				Id:    "toolu_9",
				Name:  "lookup",
				Input: map[string]any{"q": "x"},
			},
		},
	}
	got := ResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.Len(t, got.Choices, 1)
	// ToolCalls is stored as json.RawMessage on the OpenAI Message; unmarshal to inspect.
	var toolCalls []dto.ToolCallResponse
	require.NoError(t, common.Unmarshal(got.Choices[0].Message.ToolCalls, &toolCalls))
	require.Len(t, toolCalls, 1)
	assert.Equal(t, "toolu_9", toolCalls[0].ID)
	assert.Equal(t, "function", toolCalls[0].Type)
	assert.Equal(t, "lookup", toolCalls[0].Function.Name)
	assert.JSONEq(t, `{"q":"x"}`, toolCalls[0].Function.Arguments)
	// stop_reason "tool_use" maps to OpenAI "tool_calls".
	assert.Equal(t, "tool_calls", got.Choices[0].FinishReason)
}

func TestResponseClaude2OpenAI_ThinkingBecomesReasoningContent(t *testing.T) {
	thinking := "internal reasoning"
	resp := &dto.ClaudeResponse{
		Id:         "msg_3",
		Model:      "claude-3-7-sonnet",
		StopReason: "max_tokens",
		Content: []dto.ClaudeMediaMessage{
			{Type: "thinking", Thinking: &thinking},
			{Type: "text", Text: strPtr("answer")},
		},
	}
	got := ResponseClaude2OpenAI(resp)
	require.NotNil(t, got)
	require.Len(t, got.Choices, 1)
	require.NotNil(t, got.Choices[0].Message.ReasoningContent)
	assert.Equal(t, "internal reasoning", *got.Choices[0].Message.ReasoningContent)
	// max_tokens maps to "length".
	assert.Equal(t, "length", got.Choices[0].FinishReason)
}

// --- cacheCreationTokensForOpenAIUsage -------------------------------------

func TestCacheCreationTokensForOpenAIUsage(t *testing.T) {
	t.Run("nil usage returns 0", func(t *testing.T) {
		assert.Equal(t, 0, cacheCreationTokensForOpenAIUsage(nil))
	})
	t.Run("aggregate cache creation preferred when it exceeds split", func(t *testing.T) {
		// Aggregate (CachedCreationTokens=50) > split (5m=10 + 1h=20 = 30) -> use 50.
		u := &dto.Usage{
			PromptTokensDetails:          dto.InputTokenDetails{CachedCreationTokens: 50},
			ClaudeCacheCreation5mTokens: 10,
			ClaudeCacheCreation1hTokens: 20,
		}
		assert.Equal(t, 50, cacheCreationTokensForOpenAIUsage(u))
	})
	t.Run("split tokens used when aggregate is zero", func(t *testing.T) {
		u := &dto.Usage{
			ClaudeCacheCreation5mTokens: 10,
			ClaudeCacheCreation1hTokens: 20,
		}
		assert.Equal(t, 30, cacheCreationTokensForOpenAIUsage(u))
	})
	t.Run("aggregate used when split is zero", func(t *testing.T) {
		u := &dto.Usage{
			PromptTokensDetails: dto.InputTokenDetails{CachedCreationTokens: 42},
		}
		assert.Equal(t, 42, cacheCreationTokensForOpenAIUsage(u))
	})
	t.Run("split used when aggregate is smaller than split", func(t *testing.T) {
		// Aggregate (10) <= split (5m=15 + 1h=5 = 20) -> use split.
		u := &dto.Usage{
			PromptTokensDetails:          dto.InputTokenDetails{CachedCreationTokens: 10},
			ClaudeCacheCreation5mTokens: 15,
			ClaudeCacheCreation1hTokens: 5,
		}
		assert.Equal(t, 20, cacheCreationTokensForOpenAIUsage(u))
	})
}

// --- HandleStreamResponseData (Claude format branch) -----------------------

func TestHandleStreamResponseData_ClaudeFormatMessageStartCapturesModel(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "orig",
		RelayFormat:     types.RelayFormatClaude,
	}
	claudeInfo := &ClaudeResponseInfo{Usage: &dto.Usage{}, ResponseText: strings.Builder{}}
	data := `{"type":"message_start","message":{"id":"msg_x","model":"claude-opus-4-8","usage":{"input_tokens":12,"cache_read_input_tokens":3}}}`
	apiErr := HandleStreamResponseData(c, info, claudeInfo, data)
	require.Nil(t, apiErr)
	// message_start must override UpstreamModelName with the upstream-reported model.
	assert.Equal(t, "claude-opus-4-8", info.UpstreamModelName)
}

func TestHandleStreamResponseData_ClaudeFormatMessageDeltaPatchesUsage(t *testing.T) {
	// Reset global passthrough so the patch path runs (non-passthrough).
	origin := model_setting.GetGlobalSettings().PassThroughRequestEnabled
	t.Cleanup(func() { model_setting.GetGlobalSettings().PassThroughRequestEnabled = origin })
	model_setting.GetGlobalSettings().PassThroughRequestEnabled = false

	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "m",
		RelayFormat:     types.RelayFormatClaude,
	}
	claudeInfo := &ClaudeResponseInfo{Usage: &dto.Usage{
		PromptTokens: 100,
		PromptTokensDetails: dto.InputTokenDetails{CachedTokens: 30, CachedCreationTokens: 50},
	}}
	// Bedrock-style delta: only output_tokens, missing input/cache fields.
	data := `{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":200}}`
	apiErr := HandleStreamResponseData(c, info, claudeInfo, data)
	require.Nil(t, apiErr)
	assert.True(t, claudeInfo.Done)
	assert.Equal(t, 200, claudeInfo.Usage.CompletionTokens)
}

func TestHandleStreamResponseData_InvalidJSONReturnsError(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "m",
		RelayFormat:     types.RelayFormatClaude,
	}
	claudeInfo := &ClaudeResponseInfo{Usage: &dto.Usage{}}
	apiErr := HandleStreamResponseData(c, info, claudeInfo, `{not valid json`)
	require.NotNil(t, apiErr)
	// BadResponseBody is the documented error code for unparseable upstream bodies.
	assert.Equal(t, types.ErrorCodeBadResponseBody, apiErr.GetErrorCode())
}

func TestHandleStreamResponseData_ClaudeErrorReturnsError(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "m",
		RelayFormat:     types.RelayFormatClaude,
	}
	claudeInfo := &ClaudeResponseInfo{Usage: &dto.Usage{}}
	data := `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`
	apiErr := HandleStreamResponseData(c, info, claudeInfo, data)
	require.NotNil(t, apiErr)
}

func TestHandleStreamResponseData_RefusalMarksContext(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "m",
		RelayFormat:     types.RelayFormatClaude,
	}
	claudeInfo := &ClaudeResponseInfo{Usage: &dto.Usage{}}
	// message_delta with a refusal stop_reason.
	data := `{"type":"message_delta","delta":{"stop_reason":"refusal"},"usage":{"output_tokens":1}}`
	apiErr := HandleStreamResponseData(c, info, claudeInfo, data)
	require.Nil(t, apiErr)
	_, ok := common.GetContextKey(c, constant.ContextKeyAdminRejectReason)
	assert.True(t, ok)
}

// --- HandleStreamResponseData (OpenAI format branch) -----------------------

func TestHandleStreamResponseData_OpenAIFormatConvertsChunk(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "m",
		RelayFormat:     types.RelayFormatOpenAI,
	}
	claudeInfo := &ClaudeResponseInfo{Usage: &dto.Usage{}, ResponseText: strings.Builder{}}
	data := `{"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}`
	apiErr := HandleStreamResponseData(c, info, claudeInfo, data)
	require.Nil(t, apiErr)
	assert.Equal(t, "hi", claudeInfo.ResponseText.String())
}

func TestHandleStreamResponseData_OpenAIFormatReturnsNilWhenFormatterDeclines(t *testing.T) {
	// message_stop makes FormatClaudeResponseInfo return false -> the OpenAI branch
	// returns nil without emitting a chunk (no error, no payload).
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "m",
		RelayFormat:     types.RelayFormatOpenAI,
	}
	claudeInfo := &ClaudeResponseInfo{Usage: &dto.Usage{}, ResponseText: strings.Builder{}}
	apiErr := HandleStreamResponseData(c, info, claudeInfo, `{"type":"message_stop"}`)
	require.Nil(t, apiErr)
}

// --- HandleStreamFinalResponse ---------------------------------------------

func TestHandleStreamFinalResponse_ClaudeFormatSetsSemanticAndBilling(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "claude-3-5-sonnet",
		RelayFormat:     types.RelayFormatClaude,
	}
	// Usage is already complete (prompt>0, completion>0, Done=true): the fallback
	// path must NOT run, so the existing fields are preserved and only the
	// semantic/billing invariants are applied.
	claudeInfo := &ClaudeResponseInfo{
		Usage: &dto.Usage{
			PromptTokens:     10,
			CompletionTokens: 5,
			TotalTokens:      15,
		},
		Done: true,
	}
	HandleStreamFinalResponse(c, info, claudeInfo)
	assert.Equal(t, "anthropic", claudeInfo.Usage.UsageSemantic)
	assert.Equal(t, 10, claudeInfo.Usage.PromptTokens)
	assert.Equal(t, 5, claudeInfo.Usage.CompletionTokens)
	assert.Equal(t, 15, claudeInfo.Usage.TotalTokens)
	require.NotNil(t, claudeInfo.Usage.BillingUsage)
}

func TestHandleStreamFinalResponse_IncompleteUsageTriggersFallback(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "claude-3-5-sonnet",
		RelayFormat:     types.RelayFormatClaude,
	}
	// CompletionTokens == 0 forces the fallback path; ResponseText2Usage estimates a
	// completion token count from the buffered response text and recomputes TotalTokens.
	claudeInfo := &ClaudeResponseInfo{
		ResponseText: func() strings.Builder {
			var b strings.Builder
			b.WriteString("a non-empty completion so the estimator returns >0 tokens")
			return b
		}(),
		Usage: &dto.Usage{
			PromptTokens:     10,
			CompletionTokens: 0,
		},
		Done: true,
	}
	HandleStreamFinalResponse(c, info, claudeInfo)
	assert.Equal(t, "anthropic", claudeInfo.Usage.UsageSemantic)
	// The fallback must populate CompletionTokens (>0) and recompute TotalTokens.
	assert.Greater(t, claudeInfo.Usage.CompletionTokens, 0)
	assert.Equal(t, claudeInfo.Usage.PromptTokens+claudeInfo.Usage.CompletionTokens, claudeInfo.Usage.TotalTokens)
	require.NotNil(t, claudeInfo.Usage.BillingUsage)
}

func TestHandleStreamFinalResponse_OpenAIFormatEmitsUsageWhenRequested(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:        &relaycommon.ChannelMeta{},
		OriginModelName:   "claude-3-5-sonnet",
		RelayFormat:       types.RelayFormatOpenAI,
		ShouldIncludeUsage: true,
	}
	claudeInfo := &ClaudeResponseInfo{
		ResponseId:   "msg_final",
		ResponseText: strings.Builder{},
		Usage: &dto.Usage{
			PromptTokens:     11,
			CompletionTokens: 4,
		},
		Done: true,
	}
	require.NotPanics(t, func() {
		HandleStreamFinalResponse(c, info, claudeInfo)
	})
	// The final usage chunk must have been written to the recorder as SSE data.
	body := recorderBody(c)
	assert.Contains(t, body, "chat.completion.chunk")
	assert.Contains(t, body, "[DONE]")
}

func TestHandleStreamFinalResponse_OpenAIFormatSkipsUsageWhenNotRequested(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:        &relaycommon.ChannelMeta{},
		OriginModelName:   "claude-3-5-sonnet",
		RelayFormat:       types.RelayFormatOpenAI,
		ShouldIncludeUsage: false,
	}
	claudeInfo := &ClaudeResponseInfo{
		Usage: &dto.Usage{PromptTokens: 1, CompletionTokens: 1},
		Done:  true,
	}
	require.NotPanics(t, func() {
		HandleStreamFinalResponse(c, info, claudeInfo)
	})
	body := recorderBody(c)
	// Only the [DONE] terminator is emitted; no usage chunk.
	assert.Contains(t, body, "[DONE]")
	assert.NotContains(t, body, "prompt_tokens")
}

// --- ClaudeHandler + HandleClaudeResponseData (OpenAI branch) --------------

func TestClaudeHandler_NonStreamOpenAIFormatProducesMappedUsage(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "claude-3-5-sonnet",
		RelayFormat:     types.RelayFormatOpenAI,
	}
	body := `{
		"id":"msg_1","type":"message","model":"claude-3-5-sonnet","stop_reason":"end_turn",
		"content":[{"type":"text","text":"hi"}],
		"usage":{"input_tokens":10,"output_tokens":4,"cache_read_input_tokens":2,"cache_creation_input_tokens":3}
	}`
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageFromAny(t, usageAny)
	// The usage RETURNED by ClaudeHandler is the Anthropic-semantic claudeInfo.Usage:
	// prompt = upstream input_tokens (not the OpenAI-mapped total), completion = output_tokens,
	// cache fields preserved, and TotalTokens = input + output.
	assert.Equal(t, 10, usage.PromptTokens)
	assert.Equal(t, 4, usage.CompletionTokens)
	assert.Equal(t, 10+4, usage.TotalTokens)
	assert.Equal(t, 2, usage.PromptTokensDetails.CachedTokens)
	assert.Equal(t, 3, usage.PromptTokensDetails.CachedCreationTokens)
	assert.Equal(t, "anthropic", usage.UsageSemantic)

	// The OpenAI-format response BODY, by contrast, carries the OpenAI-mapped usage where
	// prompt_tokens = input + cached + cache_creation (15) and total = 19, plus the assistant
	// text content and the mapped stop_reason.
	out := recorderBody(c)
	assert.Equal(t, "chat.completion", gjson.Get(out, "object").String())
	assert.Equal(t, "msg_1", gjson.Get(out, "id").String())
	assert.Equal(t, "stop", gjson.Get(out, "choices.0.finish_reason").String())
	assert.Equal(t, "hi", gjson.Get(out, "choices.0.message.content").String())
	assert.Equal(t, int64(10+2+3), gjson.Get(out, "usage.prompt_tokens").Int())
	assert.Equal(t, int64(4), gjson.Get(out, "usage.completion_tokens").Int())
	assert.Equal(t, int64(10+2+3+4), gjson.Get(out, "usage.total_tokens").Int())
}

func TestClaudeHandler_NonStreamClaudeFormatPassesBodyThrough(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "claude-3-5-sonnet",
		RelayFormat:     types.RelayFormatClaude,
	}
	body := `{"id":"msg_1","type":"message","content":[{"type":"text","text":"hi"}],"usage":{"input_tokens":3,"output_tokens":2}}`
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageFromAny(t, usageAny)
	assert.Equal(t, 3, usage.PromptTokens)
	assert.Equal(t, 2, usage.CompletionTokens)
	// Claude format passes the upstream body through verbatim.
	assert.Equal(t, body, recorderBody(c))
}

func TestClaudeHandler_UpstreamErrorReturnsAPIError(t *testing.T) {
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "claude-3-5-sonnet",
		RelayFormat:     types.RelayFormatClaude,
	}
	body := `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`
	resp := &http.Response{
		StatusCode: http.StatusServiceUnavailable,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
	a := &Adaptor{}
	usage, apiErr := a.DoResponse(c, resp, info)
	assert.Nil(t, usage)
	require.NotNil(t, apiErr)
}

// --- ClaudeStreamHandler ----------------------------------------------------

func TestClaudeStreamHandler_ClaudeFormatAccumulatesUsage(t *testing.T) {
	// StreamScannerHandler builds a timeout ticker from constant.StreamingTimeout;
	// a zero value panics in time.NewTicker. Set a positive window for the test.
	oldStreamingTimeout := constant.StreamingTimeout
	constant.StreamingTimeout = 300
	t.Cleanup(func() { constant.StreamingTimeout = oldStreamingTimeout })

	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta:      &relaycommon.ChannelMeta{},
		OriginModelName: "claude-3-5-sonnet",
		RelayFormat:     types.RelayFormatClaude,
		IsStream:        true,
	}
	// A complete Claude SSE stream: message_start -> text deltas -> message_delta -> message_stop.
	stream := strings.Join([]string{
		`event: message_start`,
		`data: {"type":"message_start","message":{"id":"msg_s","model":"claude-3-5-sonnet","usage":{"input_tokens":8,"cache_read_input_tokens":2,"cache_creation_input_tokens":3}}}`,
		``,
		`event: content_block_delta`,
		`data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"he"}}`,
		``,
		`event: content_block_delta`,
		`data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"llo"}}`,
		``,
		`event: message_delta`,
		`data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}`,
		``,
		`event: message_stop`,
		`data: {"type":"message_stop"}`,
		``,
	}, "\n")
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"text/event-stream"}},
		Body:       io.NopCloser(strings.NewReader(stream)),
	}
	a := &Adaptor{}
	usageAny, apiErr := a.DoResponse(c, resp, info)
	require.Nil(t, apiErr)
	usage := usageFromAny(t, usageAny)
	// message_start usage: input_tokens=8, cache_read=2, cache_creation=3.
	assert.Equal(t, 8, usage.PromptTokens)
	assert.Equal(t, 2, usage.PromptTokensDetails.CachedTokens)
	assert.Equal(t, 3, usage.PromptTokensDetails.CachedCreationTokens)
	// message_delta final output_tokens.
	assert.Equal(t, 5, usage.CompletionTokens)
	assert.Equal(t, "anthropic", usage.UsageSemantic)
}

// --- DoRequest (delegates to channel.DoApiRequest) -------------------------

func TestDoRequest_DelegatesToChannel(t *testing.T) {
	// DoRequest just forwards to channel.DoApiRequest(a, ...). Assert the
	// method is wired (returns without panicking). Use a local mock upstream
	// and a non-nil request body: a nil body made http.NewRequest leave
	// req.Body nil, and on a runner WITH network (CI) the real call to
	// api.anthropic.com succeeded, reached the body-cleanup path, and
	// nil-derefed req.Body.Close() — locally (no network) it errored early
	// so the suite passed. The mock + non-nil body make the test
	// deterministic and avoid the nil-deref.
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()
	a := &Adaptor{}
	c := newTestContext()
	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelBaseUrl: ts.URL,
			ApiKey:         "sk-test",
		},
		RequestURLPath: "/v1/messages",
	}
	require.NotPanics(t, func() {
		_, _ = a.DoRequest(c, info, strings.NewReader("{}"))
	})
}
