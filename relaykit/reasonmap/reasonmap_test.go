package reasonmap

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestClaudeStopReasonToOpenAIFinishReason(t *testing.T) {
	tests := []struct {
		name       string
		stopReason string
		want       string
	}{
		{"stop_sequence to stop", "stop_sequence", "stop"},
		{"end_turn to stop", "end_turn", "stop"},
		{"max_tokens to length", "max_tokens", "length"},
		{"tool_use to tool_calls", "tool_use", "tool_calls"},
		{"refusal to content_filter", "refusal", "content_filter"},
		{"unknown passes through", "unknown_reason", "unknown_reason"},
		{"empty passes through", "", ""},
		{"case insensitive STOP_SEQUENCE", "STOP_SEQUENCE", "stop"},
		{"case insensitive End_Turn", "End_Turn", "stop"},
		{"case insensitive MAX_TOKENS", "MAX_TOKENS", "length"},
		{"case insensitive Tool_Use", "Tool_Use", "tool_calls"},
		{"case insensitive REFUSAL", "REFUSAL", "content_filter"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClaudeStopReasonToOpenAIFinishReason(tt.stopReason)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestOpenAIFinishReasonToClaudeStopReason(t *testing.T) {
	tests := []struct {
		name         string
		finishReason string
		want         string
	}{
		{"stop to end_turn", "stop", "end_turn"},
		{"stop_sequence preserved", "stop_sequence", "stop_sequence"},
		{"length to max_tokens", "length", "max_tokens"},
		{"max_tokens to max_tokens", "max_tokens", "max_tokens"},
		{"content_filter to refusal", "content_filter", "refusal"},
		{"tool_calls to tool_use", "tool_calls", "tool_use"},
		{"unknown passes through", "some_other_reason", "some_other_reason"},
		{"empty passes through", "", ""},
		{"case insensitive STOP", "STOP", "end_turn"},
		{"case insensitive LENGTH", "LENGTH", "max_tokens"},
		{"case insensitive TOOL_CALLS", "TOOL_CALLS", "tool_use"},
		{"case insensitive Content_Filter", "Content_Filter", "refusal"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := OpenAIFinishReasonToClaudeStopReason(tt.finishReason)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestRoundTripClaudeToOpenAIAndBack(t *testing.T) {
	claudeReasons := []struct {
		claude      string
		openai      string
		backClaude  string
	}{
		{"end_turn", "stop", "end_turn"},
		{"max_tokens", "length", "max_tokens"},
		{"tool_use", "tool_calls", "tool_use"},
	}

	for _, tt := range claudeReasons {
		t.Run(tt.claude, func(t *testing.T) {
			openai := ClaudeStopReasonToOpenAIFinishReason(tt.claude)
			assert.Equal(t, tt.openai, openai)
			back := OpenAIFinishReasonToClaudeStopReason(openai)
			assert.Equal(t, tt.backClaude, back)
		})
	}
}
