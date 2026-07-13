package zhipu

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestOpenAI2Zhipu(t *testing.T) {
	tests := []struct {
		name     string
		request  dto.GeneralOpenAIRequest
		validate func(t *testing.T, result *ZhipuRequest)
	}{
		{
			name: "basic user and assistant messages",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{
					{Role: "user", Content: "Hello"},
					{Role: "assistant", Content: "Hi there"},
					{Role: "user", Content: "How are you?"},
				},
				Temperature: lo.ToPtr(0.7),
				TopP:        lo.ToPtr(0.9),
			},
			validate: func(t *testing.T, result *ZhipuRequest) {
				require.Len(t, result.Prompt, 3)
				assert.Equal(t, "user", result.Prompt[0].Role)
				assert.Equal(t, "Hello", result.Prompt[0].Content)
				assert.Equal(t, "assistant", result.Prompt[1].Role)
				assert.Equal(t, "Hi there", result.Prompt[1].Content)
				assert.Equal(t, "user", result.Prompt[2].Role)
				assert.Equal(t, "How are you?", result.Prompt[2].Content)
				assert.Equal(t, lo.ToPtr(0.7), result.Temperature)
				assert.InDelta(t, 0.9, result.TopP, 0.001)
				assert.False(t, result.Incremental)
			},
		},
		{
			name: "system message expands to system + user Okay pair",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{
					{Role: "system", Content: "You are a helpful assistant."},
					{Role: "user", Content: "What is Go?"},
				},
			},
			validate: func(t *testing.T, result *ZhipuRequest) {
				require.Len(t, result.Prompt, 3)
				assert.Equal(t, "system", result.Prompt[0].Role)
				assert.Equal(t, "You are a helpful assistant.", result.Prompt[0].Content)
				assert.Equal(t, "user", result.Prompt[1].Role)
				assert.Equal(t, "Okay", result.Prompt[1].Content)
				assert.Equal(t, "user", result.Prompt[2].Role)
				assert.Equal(t, "What is Go?", result.Prompt[2].Content)
			},
		},
		{
			name: "empty messages",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{},
			},
			validate: func(t *testing.T, result *ZhipuRequest) {
				assert.Empty(t, result.Prompt)
			},
		},
		{
			name: "multiple system messages each get Okay",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{
					{Role: "system", Content: "First system"},
					{Role: "system", Content: "Second system"},
					{Role: "user", Content: "Hello"},
				},
			},
			validate: func(t *testing.T, result *ZhipuRequest) {
				require.Len(t, result.Prompt, 5)
				assert.Equal(t, "system", result.Prompt[0].Role)
				assert.Equal(t, "First system", result.Prompt[0].Content)
				assert.Equal(t, "user", result.Prompt[1].Role)
				assert.Equal(t, "Okay", result.Prompt[1].Content)
				assert.Equal(t, "system", result.Prompt[2].Role)
				assert.Equal(t, "Second system", result.Prompt[2].Content)
				assert.Equal(t, "user", result.Prompt[3].Role)
				assert.Equal(t, "Okay", result.Prompt[3].Content)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := requestOpenAI2Zhipu(tc.request)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestResponseZhipu2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		response ZhipuResponse
		validate func(t *testing.T, result *dto.OpenAITextResponse)
	}{
		{
			name: "single choice",
			response: ZhipuResponse{
				Success: true,
				Data: ZhipuResponseData{
					TaskId: "task-abc",
					Choices: []ZhipuMessage{
						{Role: "assistant", Content: "Hello!"},
					},
					Usage: dto.Usage{
						PromptTokens:     10,
						CompletionTokens: 3,
						TotalTokens:      13,
					},
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				assert.Equal(t, "task-abc", result.Id)
				assert.Equal(t, "chat.completion", result.Object)
				require.Len(t, result.Choices, 1)
				assert.Equal(t, 0, result.Choices[0].Index)
				assert.Equal(t, "assistant", result.Choices[0].Message.Role)
				assert.Equal(t, "Hello!", result.Choices[0].Message.StringContent())
				assert.Equal(t, "stop", result.Choices[0].FinishReason)
				assert.Equal(t, 10, result.Usage.PromptTokens)
			},
		},
		{
			name: "multiple choices, only last has stop",
			response: ZhipuResponse{
				Success: true,
				Data: ZhipuResponseData{
					TaskId: "task-multi",
					Choices: []ZhipuMessage{
						{Role: "assistant", Content: "Answer 1"},
						{Role: "assistant", Content: "Answer 2"},
						{Role: "assistant", Content: "Answer 3"},
					},
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				require.Len(t, result.Choices, 3)
				assert.Equal(t, "", result.Choices[0].FinishReason)
				assert.Equal(t, "", result.Choices[1].FinishReason)
				assert.Equal(t, "stop", result.Choices[2].FinishReason)
				assert.Equal(t, 0, result.Choices[0].Index)
				assert.Equal(t, 1, result.Choices[1].Index)
				assert.Equal(t, 2, result.Choices[2].Index)
			},
		},
		{
			name: "content with surrounding quotes trimmed",
			response: ZhipuResponse{
				Success: true,
				Data: ZhipuResponseData{
					TaskId: "task-trim",
					Choices: []ZhipuMessage{
						{Role: "assistant", Content: `"Hello World"`},
					},
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "Hello World", result.Choices[0].Message.StringContent())
			},
		},
		{
			name: "empty choices",
			response: ZhipuResponse{
				Success: true,
				Data: ZhipuResponseData{
					TaskId:  "task-empty",
					Choices: []ZhipuMessage{},
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				assert.Empty(t, result.Choices)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := responseZhipu2OpenAI(&tc.response)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestStreamResponseZhipu2OpenAI(t *testing.T) {
	result := streamResponseZhipu2OpenAI("Hello world")

	assert.Equal(t, "chat.completion.chunk", result.Object)
	assert.Equal(t, "chatglm", result.Model)
	require.Len(t, result.Choices, 1)
	assert.Equal(t, "Hello world", result.Choices[0].Delta.GetContentString())
}

func TestStreamMetaResponseZhipu2OpenAI(t *testing.T) {
	meta := &ZhipuStreamMetaResponse{
		RequestId: "req-abc",
		TaskId:    "task-xyz",
		Usage: dto.Usage{
			PromptTokens:     15,
			CompletionTokens: 25,
			TotalTokens:      40,
		},
	}

	response, usage := streamMetaResponseZhipu2OpenAI(meta)

	require.NotNil(t, response)
	require.NotNil(t, usage)
	assert.Equal(t, "req-abc", response.Id)
	assert.Equal(t, "chat.completion.chunk", response.Object)
	assert.Equal(t, "chatglm", response.Model)
	require.Len(t, response.Choices, 1)
	assert.Equal(t, "", response.Choices[0].Delta.GetContentString())
	require.NotNil(t, response.Choices[0].FinishReason)
	assert.Equal(t, constant.FinishReasonStop, *response.Choices[0].FinishReason)
	assert.Equal(t, 15, usage.PromptTokens)
	assert.Equal(t, 25, usage.CompletionTokens)
	assert.Equal(t, 40, usage.TotalTokens)
}

func TestGetZhipuToken(t *testing.T) {
	t.Run("invalid key format returns empty", func(t *testing.T) {
		token := getZhipuToken("invalidkey-no-dot")
		assert.Equal(t, "", token)
	})

	t.Run("valid key format produces non-empty JWT", func(t *testing.T) {
		token := getZhipuToken("myid.mysecret")
		assert.NotEmpty(t, token)
		assert.Contains(t, token, ".")
	})

	t.Run("same key returns cached token", func(t *testing.T) {
		token1 := getZhipuToken("cacheid.cachesecret")
		token2 := getZhipuToken("cacheid.cachesecret")
		assert.Equal(t, token1, token2)
	})
}
