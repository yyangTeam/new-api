package tencent

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestOpenAI2Tencent(t *testing.T) {
	adaptor := &Adaptor{}

	tests := []struct {
		name     string
		request  dto.GeneralOpenAIRequest
		validate func(t *testing.T, result *TencentChatRequest)
	}{
		{
			name: "basic message conversion",
			request: dto.GeneralOpenAIRequest{
				Model: "hunyuan-pro",
				Messages: []dto.Message{
					{Role: "system", Content: "You are a helpful assistant."},
					{Role: "user", Content: "Hello!"},
					{Role: "assistant", Content: "Hi there!"},
					{Role: "user", Content: "How are you?"},
				},
				Stream:      lo.ToPtr(true),
				TopP:        lo.ToPtr(0.9),
				Temperature: lo.ToPtr(0.7),
			},
			validate: func(t *testing.T, result *TencentChatRequest) {
				require.NotNil(t, result.Model)
				assert.Equal(t, "hunyuan-pro", *result.Model)
				require.Len(t, result.Messages, 4)
				assert.Equal(t, "system", result.Messages[0].Role)
				assert.Equal(t, "You are a helpful assistant.", result.Messages[0].Content)
				assert.Equal(t, "user", result.Messages[1].Role)
				assert.Equal(t, "Hello!", result.Messages[1].Content)
				require.NotNil(t, result.Stream)
				assert.True(t, *result.Stream)
				require.NotNil(t, result.TopP)
				assert.InDelta(t, 0.9, *result.TopP, 0.001)
				require.NotNil(t, result.Temperature)
				assert.InDelta(t, 0.7, *result.Temperature, 0.001)
			},
		},
		{
			name: "nil TopP not set",
			request: dto.GeneralOpenAIRequest{
				Model: "hunyuan-lite",
				Messages: []dto.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			validate: func(t *testing.T, result *TencentChatRequest) {
				assert.Nil(t, result.TopP)
			},
		},
		{
			name: "empty messages",
			request: dto.GeneralOpenAIRequest{
				Model:    "hunyuan-standard",
				Messages: []dto.Message{},
			},
			validate: func(t *testing.T, result *TencentChatRequest) {
				assert.Empty(t, result.Messages)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := requestOpenAI2Tencent(adaptor, tc.request)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestResponseTencent2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		response TencentChatResponse
		validate func(t *testing.T, result *dto.OpenAITextResponse)
	}{
		{
			name: "basic response with choices",
			response: TencentChatResponse{
				Id: "resp-123",
				Choices: []TencentResponseChoices{
					{
						FinishReason: "stop",
						Messages: TencentMessage{
							Role:    "assistant",
							Content: "Hello there!",
						},
					},
				},
				Usage: TencentUsage{
					PromptTokens:     10,
					CompletionTokens: 5,
					TotalTokens:      15,
				},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				assert.Equal(t, "resp-123", result.Id)
				assert.Equal(t, "chat.completion", result.Object)
				require.Len(t, result.Choices, 1)
				assert.Equal(t, 0, result.Choices[0].Index)
				assert.Equal(t, "assistant", result.Choices[0].Message.Role)
				assert.Equal(t, "Hello there!", result.Choices[0].Message.StringContent())
				assert.Equal(t, "stop", result.Choices[0].FinishReason)
				assert.Equal(t, 10, result.Usage.PromptTokens)
				assert.Equal(t, 5, result.Usage.CompletionTokens)
				assert.Equal(t, 15, result.Usage.TotalTokens)
			},
		},
		{
			name: "empty choices",
			response: TencentChatResponse{
				Id:      "resp-empty",
				Choices: []TencentResponseChoices{},
			},
			validate: func(t *testing.T, result *dto.OpenAITextResponse) {
				assert.Empty(t, result.Choices)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := responseTencent2OpenAI(&tc.response)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestStreamResponseTencent2OpenAI(t *testing.T) {
	tests := []struct {
		name     string
		response TencentChatResponse
		validate func(t *testing.T, result *dto.ChatCompletionsStreamResponse)
	}{
		{
			name: "streaming chunk with content",
			response: TencentChatResponse{
				Choices: []TencentResponseChoices{
					{
						Delta: TencentMessage{
							Content: "Hello",
						},
					},
				},
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				assert.Equal(t, "chat.completion.chunk", result.Object)
				assert.Equal(t, "tencent-hunyuan", result.Model)
				require.Len(t, result.Choices, 1)
				assert.Equal(t, "Hello", result.Choices[0].Delta.GetContentString())
				assert.Nil(t, result.Choices[0].FinishReason)
			},
		},
		{
			name: "streaming chunk with stop finish reason",
			response: TencentChatResponse{
				Choices: []TencentResponseChoices{
					{
						FinishReason: "stop",
						Delta: TencentMessage{
							Content: "",
						},
					},
				},
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				require.Len(t, result.Choices, 1)
				require.NotNil(t, result.Choices[0].FinishReason)
				assert.Equal(t, constant.FinishReasonStop, *result.Choices[0].FinishReason)
			},
		},
		{
			name: "streaming chunk with non-stop finish reason",
			response: TencentChatResponse{
				Choices: []TencentResponseChoices{
					{
						FinishReason: "length",
						Delta: TencentMessage{
							Content: "partial",
						},
					},
				},
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				require.Len(t, result.Choices, 1)
				assert.Nil(t, result.Choices[0].FinishReason)
			},
		},
		{
			name: "empty choices",
			response: TencentChatResponse{
				Choices: []TencentResponseChoices{},
			},
			validate: func(t *testing.T, result *dto.ChatCompletionsStreamResponse) {
				assert.Empty(t, result.Choices)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := streamResponseTencent2OpenAI(&tc.response)
			require.NotNil(t, result)
			tc.validate(t, result)
		})
	}
}

func TestParseTencentConfig(t *testing.T) {
	tests := []struct {
		name      string
		config    string
		wantAppId int64
		wantSecId string
		wantSecKy string
		wantErr   bool
	}{
		{
			name:      "valid config",
			config:    "12345|sec-id-abc|sec-key-xyz",
			wantAppId: 12345,
			wantSecId: "sec-id-abc",
			wantSecKy: "sec-key-xyz",
		},
		{
			name:    "too few parts",
			config:  "12345|sec-id-abc",
			wantErr: true,
		},
		{
			name:    "too many parts",
			config:  "12345|sec-id|sec-key|extra",
			wantErr: true,
		},
		{
			name:    "empty config",
			config:  "",
			wantErr: true,
		},
		{
			name:    "invalid appId not a number",
			config:  "notanumber|sec-id|sec-key",
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			appId, secId, secKey, err := parseTencentConfig(tc.config)
			if tc.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantAppId, appId)
			assert.Equal(t, tc.wantSecId, secId)
			assert.Equal(t, tc.wantSecKy, secKey)
		})
	}
}

func TestSha256hex(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{
			input: "",
			want:  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		},
		{
			input: "hello",
			want:  "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			assert.Equal(t, tc.want, sha256hex(tc.input))
		})
	}
}

func TestGetTencentSign(t *testing.T) {
	adaptor := &Adaptor{
		Action:    "ChatCompletions",
		Version:   "2023-09-01",
		Timestamp: 1700000000,
	}

	req := TencentChatRequest{
		Model: lo.ToPtr("hunyuan-pro"),
		Messages: []*TencentMessage{
			{Role: "user", Content: "Hello"},
		},
	}

	sign := getTencentSign(req, adaptor, "test-sec-id", "test-sec-key")
	assert.Contains(t, sign, "TC3-HMAC-SHA256")
	assert.Contains(t, sign, "Credential=test-sec-id/")
	assert.Contains(t, sign, "SignedHeaders=content-type;host;x-tc-action")
	assert.Contains(t, sign, "Signature=")
}

func TestGetTencentSignDeterministic(t *testing.T) {
	adaptor := &Adaptor{
		Action:    "ChatCompletions",
		Version:   "2023-09-01",
		Timestamp: 1700000000,
	}

	req := TencentChatRequest{
		Model:    lo.ToPtr("hunyuan-lite"),
		Messages: []*TencentMessage{{Role: "user", Content: "Test"}},
	}

	sign1 := getTencentSign(req, adaptor, "id", "key")
	sign2 := getTencentSign(req, adaptor, "id", "key")
	assert.Equal(t, sign1, sign2)
}
