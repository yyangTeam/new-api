package jimeng

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHmacSHA256(t *testing.T) {
	tests := []struct {
		name string
		key  []byte
		data []byte
	}{
		{
			name: "basic hmac",
			key:  []byte("secret-key"),
			data: []byte("hello world"),
		},
		{
			name: "empty data",
			key:  []byte("key"),
			data: []byte(""),
		},
		{
			name: "empty key",
			key:  []byte(""),
			data: []byte("data"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := hmacSHA256(tc.key, tc.data)
			assert.Len(t, result, 32)
		})
	}
}

func TestHmacSHA256Deterministic(t *testing.T) {
	key := []byte("test-key")
	data := []byte("test-data")
	r1 := hmacSHA256(key, data)
	r2 := hmacSHA256(key, data)
	assert.Equal(t, r1, r2)
}

func TestHmacSHA256KnownVector(t *testing.T) {
	key := []byte("key")
	data := []byte("The quick brown fox jumps over the lazy dog")
	result := hmacSHA256(key, data)
	hexResult := hex.EncodeToString(result)
	assert.Equal(t, "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8", hexResult)
}

func TestPayloadHashComputation(t *testing.T) {
	body := []byte(`{"req_key":"jimeng_high_aes_general_v21_L","prompt":"a cat"}`)
	hash := sha256.Sum256(body)
	hexHash := hex.EncodeToString(hash[:])

	require.Len(t, hexHash, 64)
	assert.NotEqual(t, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", hexHash)

	emptyHash := sha256.Sum256([]byte{})
	emptyHex := hex.EncodeToString(emptyHash[:])
	assert.Equal(t, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", emptyHex)
}

func TestApiKeyParsingForSign(t *testing.T) {
	tests := []struct {
		name      string
		apiKey    string
		wantParts int
	}{
		{
			name:      "valid ak|sk format",
			apiKey:    "myAccessKey|mySecretKey",
			wantParts: 2,
		},
		{
			name:      "missing separator",
			apiKey:    "noSeparator",
			wantParts: 1,
		},
		{
			name:      "too many separators",
			apiKey:    "a|b|c",
			wantParts: 3,
		},
		{
			name:      "empty string",
			apiKey:    "",
			wantParts: 1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			parts := strings.Split(tc.apiKey, "|")
			assert.Len(t, parts, tc.wantParts)
		})
	}
}

func TestHmacSHA256DifferentInputsProduceDifferentOutputs(t *testing.T) {
	key := []byte("same-key")
	r1 := hmacSHA256(key, []byte("data-a"))
	r2 := hmacSHA256(key, []byte("data-b"))
	assert.NotEqual(t, r1, r2)
}

func TestHmacSHA256DifferentKeysProduceDifferentOutputs(t *testing.T) {
	data := []byte("same-data")
	r1 := hmacSHA256([]byte("key-a"), data)
	r2 := hmacSHA256([]byte("key-b"), data)
	assert.NotEqual(t, r1, r2)
}
