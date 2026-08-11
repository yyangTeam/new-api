package relay

import (
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
)

func TestTrimModelThinking(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "no suffix", input: "gemini-2.5-pro", want: "gemini-2.5-pro"},
		{name: "thinking suffix", input: "gemini-2.5-flash-thinking", want: "gemini-2.5-flash"},
		{name: "nothinking suffix", input: "gemini-2.5-flash-nothinking", want: "gemini-2.5-flash"},
		{name: "thinking with budget number", input: "gemini-2.5-pro-thinking-8192", want: "gemini-2.5-pro-thinking"},
		{name: "thinking budget zero", input: "gemini-2.5-pro-thinking-0", want: "gemini-2.5-pro-thinking"},
		{name: "unrelated suffix", input: "gemini-2.5-flash-preview", want: "gemini-2.5-flash-preview"},
		{name: "empty string", input: "", want: ""},
		{name: "thinking only", input: "-thinking", want: ""},
		{name: "nothinking only", input: "-nothinking", want: ""},
		{name: "thinking in middle no dash number", input: "model-thinking-suffix", want: "model-thinking"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := trimModelThinking(tt.input)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestIsNoThinkingRequest(t *testing.T) {
	zero := 0
	nonZero := 1024

	tests := []struct {
		name string
		req  *dto.GeminiChatRequest
		want bool
	}{
		{
			name: "nil ThinkingConfig",
			req:  &dto.GeminiChatRequest{},
			want: false,
		},
		{
			name: "ThinkingConfig with nil budget",
			req: &dto.GeminiChatRequest{
				GenerationConfig: dto.GeminiChatGenerationConfig{
					ThinkingConfig: &dto.GeminiThinkingConfig{},
				},
			},
			want: false,
		},
		{
			name: "ThinkingConfig with budget zero",
			req: &dto.GeminiChatRequest{
				GenerationConfig: dto.GeminiChatGenerationConfig{
					ThinkingConfig: &dto.GeminiThinkingConfig{
						ThinkingBudget: &zero,
					},
				},
			},
			want: true,
		},
		{
			name: "ThinkingConfig with non-zero budget",
			req: &dto.GeminiChatRequest{
				GenerationConfig: dto.GeminiChatGenerationConfig{
					ThinkingConfig: &dto.GeminiThinkingConfig{
						ThinkingBudget: &nonZero,
					},
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isNoThinkingRequest(tt.req)
			assert.Equal(t, tt.want, got)
		})
	}
}
