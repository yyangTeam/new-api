package palm

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResponsePaLM2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		response PaLMChatResponse
		validate func(t *testing.T, result *dto.OpenAITextResponse)
	}{
		{
			name: "single candidate",
			response: PaLMChatResponse{
				Candidates: []PaLMChatMessage{
					{Author: "bot", Content: "Hello from PaLM!"},
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				require.Len(t, result.Choices, 1)
				assert.Equal(t, 0, result.Choices[0].Index)
				assert.Equal(t, "assistant", result.Choices[0].Message.Role)
				assert.Equal(t, "Hello from PaLM!", result.Choices[0].Message.StringContent())
				assert.Equal(t, "stop", result.Choices[0].FinishReason)
			},
		},
		{
			name: "multiple candidates",
			response: PaLMChatResponse{
				Candidates: []PaLMChatMessage{
					{Author: "bot", Content: "Answer A"},
					{Author: "bot", Content: "Answer B"},
					{Author: "bot", Content: "Answer C"},
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				require.Len(t, result.Choices, 3)
				assert.Equal(t, 0, result.Choices[0].Index)
				assert.Equal(t, "Answer A", result.Choices[0].Message.StringContent())
				assert.Equal(t, 1, result.Choices[1].Index)
				assert.Equal(t, "Answer B", result.Choices[1].Message.StringContent())
				assert.Equal(t, 2, result.Choices[2].Index)
				assert.Equal(t, "Answer C", result.Choices[2].Message.StringContent())
				for _, choice := range result.Choices {
					assert.Equal(t, "stop", choice.FinishReason)
					assert.Equal(t, "assistant", choice.Message.Role)
				}
			},
		},
		{
			name: "no candidates produces empty choices",
			response: PaLMChatResponse{
				Candidates: []PaLMChatMessage{},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				assert.Empty(t, result.Choices)
			},
		},
		{
			name: "empty content in candidate",
			response: PaLMChatResponse{
				Candidates: []PaLMChatMessage{
					{Author: "bot", Content: ""},
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "", result.Choices[0].Message.StringContent())
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := responsePaLM2OpenAI(&tc.response)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestStreamResponsePaLM2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		response PaLMChatResponse
		validate func(t *testing.T, result *dto.ChatCompletionsStreamResponse)
	}{
		{
			name: "with candidate content",
			response: PaLMChatResponse{
				Candidates: []PaLMChatMessage{
					{Author: "bot", Content: "Streamed content"},
				},
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				assert.Equal(t, "chat.completion.chunk", result.Object)
				assert.Equal(t, "palm2", result.Model)
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "Streamed content", result.Choices[0].Delta.GetContentString())
				require.NotNil(t, result.Choices[0].FinishReason)
				assert.Equal(t, constant.FinishReasonStop, *result.Choices[0].FinishReason)
			},
		},
		{
			name: "no candidates produces empty delta content",
			response: PaLMChatResponse{
				Candidates: []PaLMChatMessage{},
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "", result.Choices[0].Delta.GetContentString())
				require.NotNil(t, result.Choices[0].FinishReason)
				assert.Equal(t, constant.FinishReasonStop, *result.Choices[0].FinishReason)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := streamResponsePaLM2OpenAI(&tc.response)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}
