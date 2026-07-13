package cohere

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestOpenAI2Cohere(t *testing.T) {
	common.CohereSafetySetting = "NONE"

	tests := []struct {
		name     string
		request  dto.GeneralOpenAIRequest
		validate func(t *testing.T, result *CohereRequest)
	}{
		{
			name: "last user message becomes Message, non-user go to ChatHistory",
			request: dto.GeneralOpenAIRequest{
				Model: "command-r",
				Messages: []dto.Message{
					{Role: "system", Content: "You are helpful."},
					{Role: "user", Content: "First question"},
					{Role: "assistant", Content: "First answer"},
					{Role: "user", Content: "Second question"},
				},
				Stream:    lo.ToPtr(false),
				MaxTokens: lo.ToPtr(uint(500)),
			},
			validate: func(t *testing.T, result *CohereRequest) {
				assert.Equal(t, "command-r", result.Model)
				assert.Equal(t, "Second question", result.Message)
				assert.False(t, result.Stream)
				assert.Equal(t, uint(500), result.MaxTokens)
				require.Len(t, result.ChatHistory, 2)
				assert.Equal(t, "SYSTEM", result.ChatHistory[0].Role)
				assert.Equal(t, "You are helpful.", result.ChatHistory[0].Message)
				assert.Equal(t, "CHATBOT", result.ChatHistory[1].Role)
				assert.Equal(t, "First answer", result.ChatHistory[1].Message)
			},
		},
		{
			name: "default max_tokens to 4000 when zero",
			request: dto.GeneralOpenAIRequest{
				Model: "command-r-plus",
				Messages: []dto.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			validate: func(t *testing.T, result *CohereRequest) {
				assert.Equal(t, uint(4000), result.MaxTokens)
			},
		},
		{
			name: "safety mode not set when NONE",
			request: dto.GeneralOpenAIRequest{
				Model: "command",
				Messages: []dto.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			validate: func(t *testing.T, result *CohereRequest) {
				assert.Empty(t, result.SafetyMode)
			},
		},
		{
			name: "only system messages and no user messages",
			request: dto.GeneralOpenAIRequest{
				Model: "command",
				Messages: []dto.Message{
					{Role: "system", Content: "System prompt"},
				},
			},
			validate: func(t *testing.T, result *CohereRequest) {
				assert.Equal(t, "", result.Message)
				require.Len(t, result.ChatHistory, 1)
				assert.Equal(t, "SYSTEM", result.ChatHistory[0].Role)
			},
		},
		{
			name: "streaming enabled",
			request: dto.GeneralOpenAIRequest{
				Model: "command-r",
				Messages: []dto.Message{
					{Role: "user", Content: "test"},
				},
				Stream: lo.ToPtr(true),
			},
			validate: func(t *testing.T, result *CohereRequest) {
				assert.True(t, result.Stream)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := requestOpenAI2Cohere(tc.request)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestRequestOpenAI2CohereSafetyMode(t *testing.T) {
	originalSetting := common.CohereSafetySetting
	defer func() { common.CohereSafetySetting = originalSetting }()

	common.CohereSafetySetting = "CONTEXTUAL"
	req := dto.GeneralOpenAIRequest{
		Model: "command",
		Messages: []dto.Message{
			{Role: "user", Content: "Hello"},
		},
	}

	result := requestOpenAI2Cohere(req)
	assert.Equal(t, "CONTEXTUAL", result.SafetyMode)
}

func TestRequestConvertRerank2Cohere(t *testing.T) {
	tests := []struct {
		name     string
		request  dto.RerankRequest
		validate func(t *testing.T, result *CohereRerankRequest)
	}{
		{
			name: "basic rerank request",
			request: dto.RerankRequest{
				Query:     "What is AI?",
				Documents: []any{"doc1", "doc2", "doc3"},
				Model:     "rerank-english-v3.0",
				TopN:      lo.ToPtr(3),
			},
			validate: func(t *testing.T, result *CohereRerankRequest) {
				assert.Equal(t, "What is AI?", result.Query)
				assert.Equal(t, "rerank-english-v3.0", result.Model)
				assert.Equal(t, 3, result.TopN)
				assert.True(t, result.ReturnDocuments)
				require.Len(t, result.Documents, 3)
			},
		},
		{
			name: "nil TopN defaults to 1",
			request: dto.RerankRequest{
				Query:     "test",
				Documents: []any{"a"},
				Model:     "rerank-english-v2.0",
			},
			validate: func(t *testing.T, result *CohereRerankRequest) {
				assert.Equal(t, 1, result.TopN)
			},
		},
		{
			name: "negative TopN clamped to 1",
			request: dto.RerankRequest{
				Query:     "test",
				Documents: []any{"a"},
				Model:     "rerank-english-v2.0",
				TopN:      lo.ToPtr(-5),
			},
			validate: func(t *testing.T, result *CohereRerankRequest) {
				assert.Equal(t, 1, result.TopN)
			},
		},
		{
			name: "zero TopN clamped to 1",
			request: dto.RerankRequest{
				Query:     "test",
				Documents: []any{"a"},
				TopN:      lo.ToPtr(0),
			},
			validate: func(t *testing.T, result *CohereRerankRequest) {
				assert.Equal(t, 1, result.TopN)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := requestConvertRerank2Cohere(tc.request)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestStopReasonCohere2OpenAI(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"COMPLETE", "stop"},
		{"MAX_TOKENS", "max_tokens"},
		{"ERROR", "ERROR"},
		{"", ""},
		{"UNKNOWN_REASON", "UNKNOWN_REASON"},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			assert.Equal(t, tc.want, stopReasonCohere2OpenAI(tc.input))
		})
	}
}
