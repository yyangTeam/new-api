package taskcommon

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncodeDecodeLocalTaskID(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{"simple name", "operations/12345"},
		{"gemini operation name", "projects/123/locations/us-central1/models/veo-3/operations/op-abc"},
		{"empty string encodes to empty", ""},
		{"special characters", "models/veo-3.0-generate-001/operations/op_123-456"},
		{"unicode", "models/测试/operations/日本語"},
		{"long string", "projects/my-project/locations/us-central1/publishers/google/models/veo-3.0-generate-001/operations/very-long-operation-id-1234567890abcdef"},
		{"with slashes", "a/b/c/d/e/f"},
		{"with equals", "key=value&foo=bar"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			encoded := EncodeLocalTaskID(tt.input)

			decoded, err := DecodeLocalTaskID(encoded)
			require.NoError(t, err)
			assert.Equal(t, tt.input, decoded)
		})
	}
}

func TestEncodeLocalTaskIDIsURLSafe(t *testing.T) {
	input := "projects/123/locations/us-central1/models/veo-3/operations/op+abc/test"
	encoded := EncodeLocalTaskID(input)

	assert.NotContains(t, encoded, "+")
	assert.NotContains(t, encoded, "/")
	assert.NotContains(t, encoded, "=")
}

func TestDecodeLocalTaskIDInvalidBase64(t *testing.T) {
	_, err := DecodeLocalTaskID("!!!not-valid-base64!!!")
	assert.Error(t, err)
}

func TestDecodeLocalTaskIDPaddedBase64(t *testing.T) {
	_, err := DecodeLocalTaskID("aGVsbG8=")
	assert.Error(t, err)
}

func TestDefaultString(t *testing.T) {
	tests := []struct {
		name     string
		val      string
		fallback string
		want     string
	}{
		{"returns val when non-empty", "hello", "default", "hello"},
		{"returns fallback when empty", "", "default", "default"},
		{"empty val empty fallback", "", "", ""},
		{"whitespace is non-empty", " ", "default", " "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DefaultString(tt.val, tt.fallback)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestDefaultInt(t *testing.T) {
	tests := []struct {
		name     string
		val      int
		fallback int
		want     int
	}{
		{"returns val when non-zero", 42, 10, 42},
		{"returns fallback when zero", 0, 10, 10},
		{"negative is non-zero", -1, 10, -1},
		{"zero val zero fallback", 0, 0, 0},
		{"large value", 1000000, 1, 1000000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DefaultInt(tt.val, tt.fallback)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBuildProxyURL(t *testing.T) {
	got := BuildProxyURL("task_abc123")
	assert.Contains(t, got, "/v1/videos/task_abc123/content")
}

func TestProgressConstants(t *testing.T) {
	assert.Equal(t, "10%", ProgressSubmitted)
	assert.Equal(t, "20%", ProgressQueued)
	assert.Equal(t, "30%", ProgressInProgress)
	assert.Equal(t, "100%", ProgressComplete)
}
