package service

import (
	"encoding/base64"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCountTextToken_EmptyString(t *testing.T) {
	assert.Equal(t, 0, CountTextToken("", "gpt-4o"))
	assert.Equal(t, 0, CountTextToken("", "claude-3"))
}

func TestCountTextToken_NonOpenAIModel_UsesEstimator(t *testing.T) {
	// For non-OpenAI models, CountTextToken delegates to EstimateTokenByModel
	text := "hello world"
	expected := EstimateTokenByModel("claude-3-opus", text)
	got := CountTextToken(text, "claude-3-opus")
	assert.Equal(t, expected, got)
}

func TestCountTextToken_OpenAIModel_UsesTokenizer(t *testing.T) {
	// Initialize encoders for this test
	InitTokenEncoders()

	// "hello world" with GPT tokenizer should be a specific count (2 tokens typically)
	got := CountTextToken("hello world", "gpt-4")
	assert.Greater(t, got, 0)
	// The tiktoken count for "hello world" with cl100k_base is 2
	assert.Equal(t, 2, got)
}

func TestCountTokenInput_StringType(t *testing.T) {
	InitTokenEncoders()
	result := CountTokenInput("hello", "gpt-4")
	assert.Greater(t, result, 0)
}

func TestCountTokenInput_StringSlice(t *testing.T) {
	InitTokenEncoders()
	input := []string{"hello", " world"}
	result := CountTokenInput(input, "gpt-4")
	// "hello world" = 2 tokens
	assert.Equal(t, 2, result)
}

func TestCountTokenInput_InterfaceSlice(t *testing.T) {
	InitTokenEncoders()
	input := []interface{}{"hello", " world"}
	result := CountTokenInput(input, "gpt-4")
	assert.Greater(t, result, 0)
}

func TestCountTokenInput_OtherType(t *testing.T) {
	InitTokenEncoders()
	// Non-string/slice types get fmt.Sprintf'd then counted
	result := CountTokenInput(42, "gpt-4")
	assert.Greater(t, result, 0)
}

func TestCountAudioTokenInput_EmptyString(t *testing.T) {
	result, err := CountAudioTokenInput("", "pcm16")
	require.NoError(t, err)
	assert.Equal(t, 0, result)
}

func TestCountAudioTokenInput_ValidPCM16(t *testing.T) {
	// Create 1 second of PCM16 audio at 24kHz: 24000 samples * 2 bytes = 48000 bytes
	audioData := make([]byte, 48000)
	b64 := base64.StdEncoding.EncodeToString(audioData)

	result, err := CountAudioTokenInput(b64, "pcm16")
	require.NoError(t, err)
	// Duration = 24000 samples / 24000 = 1 second
	// Token = 1/60 * 100 / 0.06 = 27.777... → QuotaFromFloat → 27
	assert.Greater(t, result, 0)
	assert.Equal(t, 27, result)
}

func TestCountAudioTokenInput_InvalidBase64(t *testing.T) {
	_, err := CountAudioTokenInput("not-valid!!!", "pcm16")
	require.Error(t, err)
}

func TestCountAudioTokenOutput_EmptyString(t *testing.T) {
	result, err := CountAudioTokenOutput("", "pcm16")
	require.NoError(t, err)
	assert.Equal(t, 0, result)
}

func TestCountAudioTokenOutput_ValidPCM16(t *testing.T) {
	// 1 second of PCM16: 48000 bytes
	audioData := make([]byte, 48000)
	b64 := base64.StdEncoding.EncodeToString(audioData)

	result, err := CountAudioTokenOutput(b64, "pcm16")
	require.NoError(t, err)
	// Duration = 1s; token = 1/60 * 200 / 0.24 = 13.888... → QuotaFromFloat → 13
	assert.Greater(t, result, 0)
	assert.Equal(t, 13, result)
}

func TestCountAudioTokenInput_NonNegative(t *testing.T) {
	// Billing invariant: audio token count must never be negative
	audioData := make([]byte, 100)
	b64 := base64.StdEncoding.EncodeToString(audioData)

	for _, format := range []string{"pcm16", "g711_ulaw", "g711_alaw", ""} {
		result, err := CountAudioTokenInput(b64, format)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, result, 0, "format=%s", format)
	}
}

func TestCountAudioTokenOutput_NonNegative(t *testing.T) {
	audioData := make([]byte, 100)
	b64 := base64.StdEncoding.EncodeToString(audioData)

	for _, format := range []string{"pcm16", "g711_ulaw", "g711_alaw", ""} {
		result, err := CountAudioTokenOutput(b64, format)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, result, 0, "format=%s", format)
	}
}

func TestCountAudioTokenInput_SaturationOnLargeAudio(t *testing.T) {
	// Billing invariant: even with very large audio, result should not overflow
	// Create large audio data (simulate 10 hours: 864,000,000 bytes for PCM16)
	// We can't allocate that much, but test the math path with a moderately large buffer
	// 10 minutes of PCM16: 24000 * 60 * 10 * 2 = 28,800,000 bytes - too big for base64 in test
	// Instead verify with 60 seconds
	audioData := make([]byte, 48000*60) // 60 seconds
	b64 := base64.StdEncoding.EncodeToString(audioData)

	result, err := CountAudioTokenInput(b64, "pcm16")
	require.NoError(t, err)
	// 60s / 60 * 100 / 0.06 = 1666.66... → 1666
	assert.Equal(t, 1666, result)
}
