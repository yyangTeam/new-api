package openai

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
