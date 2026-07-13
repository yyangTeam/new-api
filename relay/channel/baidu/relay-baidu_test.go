package baidu

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestOpenAI2Baidu(t *testing.T) {
	tests := []struct {
		name     string
		request  dto.GeneralOpenAIRequest
		validate func(t *testing.T, result *BaiduChatRequest)
	}{
		{
			name: "basic messages without system",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{
					{Role: "user", Content: "Hello"},
					{Role: "assistant", Content: "Hi there"},
					{Role: "user", Content: "How are you?"},
				},
				Temperature: lo.ToPtr(0.7),
				TopP:        lo.ToPtr(0.9),
				Stream:      lo.ToPtr(false),
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				require.Len(t, result.Messages, 3)
				assert.Equal(t, "user", result.Messages[0].Role)
				assert.Equal(t, "Hello", result.Messages[0].Content)
				assert.Equal(t, "assistant", result.Messages[1].Role)
				assert.Equal(t, "Hi there", result.Messages[1].Content)
				assert.Equal(t, "user", result.Messages[2].Role)
				assert.Equal(t, "How are you?", result.Messages[2].Content)
				assert.Equal(t, lo.ToPtr(0.7), result.Temperature)
				assert.InDelta(t, 0.9, result.TopP, 0.001)
				assert.False(t, result.Stream)
				assert.Empty(t, result.System)
			},
		},
		{
			name: "system message extracted to System field",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{
					{Role: "system", Content: "You are a helpful assistant."},
					{Role: "user", Content: "Hello"},
				},
				Stream: lo.ToPtr(true),
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				assert.Equal(t, "You are a helpful assistant.", result.System)
				require.Len(t, result.Messages, 1)
				assert.Equal(t, "user", result.Messages[0].Role)
				assert.Equal(t, "Hello", result.Messages[0].Content)
				assert.True(t, result.Stream)
			},
		},
		{
			name: "max_tokens set to 1 should become 2",
			request: dto.GeneralOpenAIRequest{
				Messages:  []dto.Message{{Role: "user", Content: "Hi"}},
				MaxTokens: lo.ToPtr(uint(1)),
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				require.NotNil(t, result.MaxOutputTokens)
				assert.Equal(t, 2, *result.MaxOutputTokens)
			},
		},
		{
			name: "max_tokens normal value preserved",
			request: dto.GeneralOpenAIRequest{
				Messages:  []dto.Message{{Role: "user", Content: "Hi"}},
				MaxTokens: lo.ToPtr(uint(100)),
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				require.NotNil(t, result.MaxOutputTokens)
				assert.Equal(t, 100, *result.MaxOutputTokens)
			},
		},
		{
			name: "max_tokens zero omits MaxOutputTokens",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{{Role: "user", Content: "Hi"}},
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				assert.Nil(t, result.MaxOutputTokens)
			},
		},
		{
			name: "frequency_penalty mapped to PenaltyScore",
			request: dto.GeneralOpenAIRequest{
				Messages:         []dto.Message{{Role: "user", Content: "Hi"}},
				FrequencyPenalty: lo.ToPtr(1.5),
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				assert.InDelta(t, 1.5, result.PenaltyScore, 0.001)
			},
		},
		{
			name: "empty messages produces nil Messages slice",
			request: dto.GeneralOpenAIRequest{
				Messages: []dto.Message{},
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				assert.Nil(t, result.Messages)
			},
		},
		{
			name: "max_completion_tokens used when max_tokens absent",
			request: dto.GeneralOpenAIRequest{
				Messages:            []dto.Message{{Role: "user", Content: "Hi"}},
				MaxCompletionTokens: lo.ToPtr(uint(200)),
			},
			validate: func(t *testing.T, result *BaiduChatRequest) {
				require.NotNil(t, result.MaxOutputTokens)
				assert.Equal(t, 200, *result.MaxOutputTokens)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := requestOpenAI2Baidu(tc.request)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestResponseBaidu2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		response BaiduChatResponse
		validate func(t *testing.T, result *dto.OpenAITextResponse)
	}{
		{
			name: "basic response conversion",
			response: BaiduChatResponse{
				Id:      "resp-123",
				Created: 1700000000,
				Result:  "Hello! How can I help you?",
				Usage: dto.Usage{
					PromptTokens:     10,
					CompletionTokens: 8,
					TotalTokens:      18,
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				assert.Equal(t, "resp-123", result.Id)
				assert.Equal(t, "chat.completion", result.Object)
				assert.Equal(t, int64(1700000000), result.Created)
				require.Len(t, result.Choices, 1)
				assert.Equal(t, 0, result.Choices[0].Index)
				assert.Equal(t, "assistant", result.Choices[0].Message.Role)
				assert.Equal(t, "Hello! How can I help you?", result.Choices[0].Message.StringContent())
				assert.Equal(t, "stop", result.Choices[0].FinishReason)
				assert.Equal(t, 10, result.Usage.PromptTokens)
				assert.Equal(t, 8, result.Usage.CompletionTokens)
				assert.Equal(t, 18, result.Usage.TotalTokens)
			},
		},
		{
			name: "empty result string",
			response: BaiduChatResponse{
				Id:      "resp-empty",
				Created: 1700000001,
				Result:  "",
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "", result.Choices[0].Message.StringContent())
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := responseBaidu2OpenAI(&tc.response)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestStreamResponseBaidu2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		response BaiduChatStreamResponse
		validate func(t *testing.T, result *dto.ChatCompletionsStreamResponse)
	}{
		{
			name: "streaming chunk not finished",
			response: BaiduChatStreamResponse{
				BaiduChatResponse: BaiduChatResponse{
					Id:      "stream-123",
					Created: 1700000000,
					Result:  "Hello",
				},
				IsEnd: false,
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				assert.Equal(t, "stream-123", result.Id)
				assert.Equal(t, "chat.completion.chunk", result.Object)
				assert.Equal(t, int64(1700000000), result.Created)
				assert.Equal(t, "ernie-bot", result.Model)
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "Hello", result.Choices[0].Delta.GetContentString())
				assert.Nil(t, result.Choices[0].FinishReason)
			},
		},
		{
			name: "streaming chunk finished",
			response: BaiduChatStreamResponse{
				BaiduChatResponse: BaiduChatResponse{
					Id:      "stream-456",
					Created: 1700000001,
					Result:  "world!",
				},
				IsEnd: true,
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "world!", result.Choices[0].Delta.GetContentString())
				require.NotNil(t, result.Choices[0].FinishReason)
				assert.Equal(t, constant.FinishReasonStop, *result.Choices[0].FinishReason)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := streamResponseBaidu2OpenAI(&tc.response)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestEmbeddingRequestOpenAI2Baidu(t *testing.T) {
	tests := []struct {
		name    string
		request dto.EmbeddingRequest
		want    []string
	}{
		{
			name: "single string input",
			request: dto.EmbeddingRequest{
				Input: "hello world",
			},
			want: []string{"hello world"},
		},
		{
			name: "multiple string inputs",
			request: dto.EmbeddingRequest{
				Input: []any{"foo", "bar", "baz"},
			},
			want: []string{"foo", "bar", "baz"},
		},
		{
			name: "nil input",
			request: dto.EmbeddingRequest{
				Input: nil,
			},
			want: []string{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := embeddingRequestOpenAI2Baidu(tc.request)
			require.NotNil(t, result)
			assert.Equal(t, tc.want, result.Input)
		})
	}
}

func TestEmbeddingResponseBaidu2OpenAI(t *testing.T) {
	baiduResp := &BaiduEmbeddingResponse{
		Id:     "emb-123",
		Object: "embedding_list",
		Data: []BaiduEmbeddingData{
			{Object: "embedding", Embedding: []float64{0.1, 0.2, 0.3}, Index: 0},
			{Object: "embedding", Embedding: []float64{0.4, 0.5, 0.6}, Index: 1},
		},
		Usage: dto.Usage{
			PromptTokens: 5,
			TotalTokens:  5,
		},
	}

	result := embeddingResponseBaidu2OpenAI(baiduResp)
	require.NotNil(t, result)
	assert.Equal(t, "list", result.Object)
	assert.Equal(t, "baidu-embedding", result.Model)
	require.Len(t, result.Data, 2)
	assert.Equal(t, "embedding", result.Data[0].Object)
	assert.Equal(t, 0, result.Data[0].Index)
	assert.Equal(t, []float64{0.1, 0.2, 0.3}, result.Data[0].Embedding)
	assert.Equal(t, 1, result.Data[1].Index)
	assert.Equal(t, []float64{0.4, 0.5, 0.6}, result.Data[1].Embedding)
	assert.Equal(t, 5, result.Usage.PromptTokens)
}
