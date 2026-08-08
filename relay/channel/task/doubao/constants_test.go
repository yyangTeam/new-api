package doubao

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetVideoInputRatio(t *testing.T) {
	tests := []struct {
		name       string
		modelName  string
		resolution string
		hasVideo   bool
		wantRatio  float64
		wantOk     bool
	}{
		{
			name:       "seedance-2-0 baseline 480p no video",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "",
			hasVideo:   false,
			wantRatio:  1.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0 with video input",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "",
			hasVideo:   true,
			wantRatio:  28.0 / 46.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0 1080p no video",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "1080p",
			hasVideo:   false,
			wantRatio:  51.0 / 46.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0 1080p with video",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "1080p",
			hasVideo:   true,
			wantRatio:  31.0 / 46.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0 4k no video",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "4k",
			hasVideo:   false,
			wantRatio:  26.0 / 46.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0 4k with video",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "4k",
			hasVideo:   true,
			wantRatio:  16.0 / 46.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0-fast baseline no video",
			modelName:  "doubao-seedance-2-0-fast-260128",
			resolution: "",
			hasVideo:   false,
			wantRatio:  1.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0-fast with video",
			modelName:  "doubao-seedance-2-0-fast-260128",
			resolution: "",
			hasVideo:   true,
			wantRatio:  22.0 / 37.0,
			wantOk:     true,
		},
		{
			name:       "seedance-2-0-fast 1080p no video falls back to baseline",
			modelName:  "doubao-seedance-2-0-fast-260128",
			resolution: "1080p",
			hasVideo:   false,
			wantRatio:  1.0,
			wantOk:     true,
		},
		{
			name:       "unknown model returns not ok",
			modelName:  "doubao-unknown-model",
			resolution: "",
			hasVideo:   false,
			wantRatio:  0,
			wantOk:     false,
		},
		{
			name:       "case insensitive resolution matching",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "1080P",
			hasVideo:   false,
			wantRatio:  51.0 / 46.0,
			wantOk:     true,
		},
		{
			name:       "resolution with spaces trimmed",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "  4k  ",
			hasVideo:   false,
			wantRatio:  26.0 / 46.0,
			wantOk:     true,
		},
		{
			name:       "4K uppercase",
			modelName:  "doubao-seedance-2-0-260128",
			resolution: "4K",
			hasVideo:   true,
			wantRatio:  16.0 / 46.0,
			wantOk:     true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ratio, ok := GetVideoInputRatio(tc.modelName, tc.resolution, tc.hasVideo)
			assert.Equal(t, tc.wantOk, ok)
			if tc.wantOk {
				assert.InDelta(t, tc.wantRatio, ratio, 0.0001)
			}
		})
	}
}

func TestHasVideoInMetadata(t *testing.T) {
	tests := []struct {
		name     string
		metadata map[string]interface{}
		want     bool
	}{
		{
			name:     "nil metadata",
			metadata: nil,
			want:     false,
		},
		{
			name:     "empty metadata",
			metadata: map[string]interface{}{},
			want:     false,
		},
		{
			name: "no content key",
			metadata: map[string]interface{}{
				"model": "some-model",
			},
			want: false,
		},
		{
			name: "content is not a slice",
			metadata: map[string]interface{}{
				"content": "string-value",
			},
			want: false,
		},
		{
			name: "content with video_url type",
			metadata: map[string]interface{}{
				"content": []interface{}{
					map[string]interface{}{
						"type": "text",
						"text": "describe this",
					},
					map[string]interface{}{
						"type": "video_url",
						"video_url": map[string]interface{}{
							"url": "https://example.com/video.mp4",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "content with video_url key but no type",
			metadata: map[string]interface{}{
				"content": []interface{}{
					map[string]interface{}{
						"video_url": map[string]interface{}{
							"url": "https://example.com/video.mp4",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "content with only text items",
			metadata: map[string]interface{}{
				"content": []interface{}{
					map[string]interface{}{
						"type": "text",
						"text": "hello world",
					},
				},
			},
			want: false,
		},
		{
			name: "content with image but no video",
			metadata: map[string]interface{}{
				"content": []interface{}{
					map[string]interface{}{
						"type": "image_url",
						"image_url": map[string]interface{}{
							"url": "https://example.com/image.png",
						},
					},
				},
			},
			want: false,
		},
		{
			name: "content with non-map items",
			metadata: map[string]interface{}{
				"content": []interface{}{
					"not-a-map",
					42,
				},
			},
			want: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := hasVideoInMetadata(tc.metadata)
			assert.Equal(t, tc.want, result)
		})
	}
}

func TestGetVideoInputRatioBaselineIsOne(t *testing.T) {
	for modelName := range videoPriceTable {
		ratio, ok := GetVideoInputRatio(modelName, "", false)
		require.True(t, ok, "model %s should have a price table", modelName)
		assert.InDelta(t, 1.0, ratio, 0.0001, "baseline ratio for %s should be 1.0", modelName)
	}
}
