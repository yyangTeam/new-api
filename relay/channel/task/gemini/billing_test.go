package gemini

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseVeoDurationSeconds(t *testing.T) {
	tests := []struct {
		name     string
		metadata map[string]any
		want     int
	}{
		{"nil metadata", nil, 8},
		{"empty metadata", map[string]any{}, 8},
		{"missing key", map[string]any{"other": 10}, 8},
		{"float64 value", map[string]any{"durationSeconds": float64(12)}, 12},
		{"int value", map[string]any{"durationSeconds": 15}, 15},
		{"float64 zero returns default", map[string]any{"durationSeconds": float64(0)}, 8},
		{"negative float64 returns default", map[string]any{"durationSeconds": float64(-5)}, 8},
		{"int zero returns default", map[string]any{"durationSeconds": 0}, 8},
		{"negative int returns default", map[string]any{"durationSeconds": -3}, 8},
		{"string value returns default", map[string]any{"durationSeconds": "10"}, 8},
		{"bool value returns default", map[string]any{"durationSeconds": true}, 8},
		{"float64 1", map[string]any{"durationSeconds": float64(1)}, 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseVeoDurationSeconds(tt.metadata)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestParseVeoResolution(t *testing.T) {
	tests := []struct {
		name     string
		metadata map[string]any
		want     string
	}{
		{"nil metadata", nil, "720p"},
		{"empty metadata", map[string]any{}, "720p"},
		{"missing key", map[string]any{"other": "1080p"}, "720p"},
		{"valid 1080p", map[string]any{"resolution": "1080p"}, "1080p"},
		{"valid 4K uppercase", map[string]any{"resolution": "4K"}, "4k"},
		{"valid 720p", map[string]any{"resolution": "720p"}, "720p"},
		{"empty string returns default", map[string]any{"resolution": ""}, "720p"},
		{"non-string returns default", map[string]any{"resolution": 1080}, "720p"},
		{"mixed case", map[string]any{"resolution": "1080P"}, "1080p"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseVeoResolution(tt.metadata)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestVeoResolutionRatio(t *testing.T) {
	tests := []struct {
		name       string
		modelName  string
		resolution string
		want       float64
	}{
		{"720p any model", "veo-3.0-generate-001", "720p", 1.0},
		{"1080p any model", "veo-3.1-generate-preview", "1080p", 1.0},
		{"4k veo 3.1 fast generate", "veo-3.1-fast-generate-preview", "4k", 2.333333},
		{"4k veo 3.1 generate", "veo-3.1-generate-preview", "4k", 1.5},
		{"4k veo 3.1 shorthand", "models/veo-3.1/operations/x", "4k", 1.5},
		{"4k veo 3.0 no 4k support", "veo-3.0-generate-001", "4k", 1.0},
		{"4k unknown model", "some-model", "4k", 1.0},
		{"empty resolution", "veo-3.1-generate-preview", "", 1.0},
		{"4k fast before standard", "veo-3.1-fast-generate-001", "4k", 2.333333},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := VeoResolutionRatio(tt.modelName, tt.resolution)
			assert.InDelta(t, tt.want, got, 0.0001)
		})
	}
}

func TestSizeToVeoResolution(t *testing.T) {
	tests := []struct {
		name string
		size string
		want string
	}{
		{"720p landscape", "1280x720", "720p"},
		{"720p portrait", "720x1280", "720p"},
		{"1080p landscape", "1920x1080", "1080p"},
		{"1080p portrait", "1080x1920", "1080p"},
		{"4k landscape", "3840x2160", "4k"},
		{"4k portrait", "2160x3840", "4k"},
		{"above 4k", "7680x4320", "4k"},
		{"between 1080p and 4k", "2560x1440", "1080p"},
		{"small resolution", "640x480", "720p"},
		{"exactly 1920", "1920x1080", "1080p"},
		{"exactly 3840", "3840x2160", "4k"},
		{"invalid format no x", "1920", "720p"},
		{"three parts SplitN keeps remainder", "1920x1080x30", "1080p"},
		{"empty string", "", "720p"},
		{"uppercase X", "1920X1080", "1080p"},
		{"non-numeric", "widexhigh", "720p"},
		{"zero dimensions", "0x0", "720p"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SizeToVeoResolution(tt.size)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestSizeToVeoAspectRatio(t *testing.T) {
	tests := []struct {
		name string
		size string
		want string
	}{
		{"landscape 16:9", "1920x1080", "16:9"},
		{"portrait 9:16", "1080x1920", "9:16"},
		{"square defaults to 16:9", "1080x1080", "16:9"},
		{"wide aspect", "3840x2160", "16:9"},
		{"tall aspect", "720x1280", "9:16"},
		{"invalid no x", "1920", "16:9"},
		{"empty", "", "16:9"},
		{"zero width", "0x1080", "16:9"},
		{"zero height", "1920x0", "16:9"},
		{"both zero", "0x0", "16:9"},
		{"negative width", "-1920x1080", "16:9"},
		{"non-numeric", "axb", "16:9"},
		{"uppercase X", "1080X1920", "9:16"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SizeToVeoAspectRatio(tt.size)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestExtractModelFromOperationName(t *testing.T) {
	tests := []struct {
		name string
		op   string
		want string
	}{
		{"standard format", "projects/123/locations/us/models/veo-3.0-generate-001/operations/op-abc", "veo-3.0-generate-001"},
		{"short format", "models/veo-3.1/operations/xyz", "veo-3.1"},
		{"no models prefix", "operations/xyz", ""},
		{"empty", "", ""},
		{"no operations suffix", "models/veo-3.0", ""},
		{"models only", "models/", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractModelFromOperationName(tt.op)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestParseImageInput(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantNil bool
	}{
		{"empty string", "", true},
		{"whitespace only", "   ", true},
		{"invalid base64", "not-valid-base64!!!", true},
		{"data URI with base64", "data:image/png;base64,iVBORw0KGgo=", false},
		{"data URI no data after comma", "data:image/png;base64,", true},
		{"data URI no comma", "data:image/png;base64", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseImageInput(tt.input)
			if tt.wantNil {
				assert.Nil(t, got)
			} else {
				assert.NotNil(t, got)
			}
		})
	}
}

func TestParseImageInputDataURI(t *testing.T) {
	result := ParseImageInput("data:image/jpeg;base64,/9j/4AAQ")
	assert.NotNil(t, result)
	assert.Equal(t, "image/jpeg", result.MimeType)
	assert.Equal(t, "/9j/4AAQ", result.BytesBase64Encoded)
}

func TestParseImageInputDataURINoMime(t *testing.T) {
	result := ParseImageInput("data:;base64,AAAA")
	assert.NotNil(t, result)
	assert.Equal(t, "application/octet-stream", result.MimeType)
}
