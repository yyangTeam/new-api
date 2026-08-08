package xai

import (
	"testing"

	"github.com/QuantumNous/new-api/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStreamResponseXAI2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		xAIResp  *dto.ChatCompletionsStreamResponse
		usage    *dto.Usage
		validate func(t *testing.T, result *dto.ChatCompletionsStreamResponse)
	}{
		{
			name:    "nil response returns nil",
			xAIResp: nil,
			usage:   &dto.Usage{},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				assert.Nil(t, result)
			},
		},
		{
			name: "basic response without usage",
			xAIResp: &dto.ChatCompletionsStreamResponse{
				Id:      "xai-123",
				Object:  "chat.completion.chunk",
				Created: 1700000000,
				Model:   "grok-3",
				Choices: []dto.ChatCompletionsStreamResponseChoice{
					{
						Delta: dto.ChatCompletionsStreamResponseChoiceDelta{
							Content: strPtr("Hello"),
							Role:    "assistant",
						},
						Index: 0,
					},
				},
			},
			usage: &dto.Usage{CompletionTokens: 10},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				assert.Equal(t, "xai-123", result.Id)
				assert.Equal(t, "chat.completion.chunk", result.Object)
				assert.Equal(t, int64(1700000000), result.Created)
				assert.Equal(t, "grok-3", result.Model)
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "Hello", *result.Choices[0].Delta.Content)
				assert.Nil(t, result.Usage)
			},
		},
		{
			name: "response with usage gets CompletionTokens overwritten",
			xAIResp: &dto.ChatCompletionsStreamResponse{
				Id:    "xai-456",
				Model: "grok-3",
				Usage: &dto.Usage{
					PromptTokens:     50,
					CompletionTokens: 999,
					TotalTokens:      100,
				},
			},
			usage: &dto.Usage{CompletionTokens: 42},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				require.NotNil(t, result.Usage)
				assert.Equal(t, 50, result.Usage.PromptTokens)
				assert.Equal(t, 42, result.Usage.CompletionTokens)
				assert.Equal(t, 100, result.Usage.TotalTokens)
			},
		},
		{
			name: "empty choices preserved",
			xAIResp: &dto.ChatCompletionsStreamResponse{
				Id:      "xai-empty",
				Model:   "grok-3-mini",
				Choices: []dto.ChatCompletionsStreamResponseChoice{},
			},
			usage: &dto.Usage{},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				assert.Empty(t, result.Choices)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := streamResponseXAI2OpenAI(tc.xAIResp, tc.usage)
			tc.validate(t, result)
		})
	}
}

func strPtr(s string) *string {
	return &s
}
