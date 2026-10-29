// Fork-added coverage tests for the relay/constant package. Appended here per
// the fork-aware convention (one coverage_test.go per package). These protect
// the fork's Midjourney relay-mode mapping, which upstream's relay_mode_test.go
// does not cover.
package constant

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestPath2RelayModeMidjourney covers the fork's Midjourney path→relay-mode
// mapping. Migrated from the fork's prior relay_mode_test.go when that
// upstream test file was restored to the upstream version.
func TestPath2RelayModeMidjourney(t *testing.T) {
	tests := []struct {
		name string
		path string
		want int
	}{
		{"action", "/mj/submit/action", RelayModeMidjourneyAction},
		{"modal", "/mj/submit/modal", RelayModeMidjourneyModal},
		{"shorten", "/mj/submit/shorten", RelayModeMidjourneyShorten},
		{"swap face", "/mj/insight-face/swap", RelayModeSwapFace},
		{"upload discord images", "/submit/upload-discord-images", RelayModeMidjourneyUpload},
		{"imagine", "/mj/submit/imagine", RelayModeMidjourneyImagine},
		{"video", "/mj/submit/video", RelayModeMidjourneyVideo},
		{"edits", "/mj/submit/edits", RelayModeMidjourneyEdits},
		{"blend", "/mj/submit/blend", RelayModeMidjourneyBlend},
		{"describe", "/mj/submit/describe", RelayModeMidjourneyDescribe},
		{"notify", "/mj/notify", RelayModeMidjourneyNotify},
		{"change", "/mj/submit/change", RelayModeMidjourneyChange},
		{"simple-change", "/mj/submit/simple-change", RelayModeMidjourneyChange},
		{"fetch", "/mj/task/123/fetch", RelayModeMidjourneyTaskFetch},
		{"image-seed", "/mj/task/123/image-seed", RelayModeMidjourneyTaskImageSeed},
		{"list-by-condition", "/mj/task/list-by-condition", RelayModeMidjourneyTaskFetchByCondition},
		{"unknown mj path", "/mj/unknown", RelayModeUnknown},
		{"empty", "", RelayModeUnknown},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Path2RelayModeMidjourney(tt.path)
			assert.Equal(t, tt.want, got)
		})
	}
}

// TestPath2RelayModeMidjourneyDispatch confirms the top-level Path2RelayMode
// routes /mj paths into the Midjourney mapper rather than dropping them.
func TestPath2RelayModeMidjourneyDispatch(t *testing.T) {
	tests := []struct {
		name string
		path string
		want int
	}{
		{"imagine", "/mj/submit/imagine", RelayModeMidjourneyImagine},
		{"describe", "/mj/submit/describe", RelayModeMidjourneyDescribe},
		{"action", "/mj/submit/action", RelayModeMidjourneyAction},
		{"notify", "/mj/notify", RelayModeMidjourneyNotify},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, Path2RelayMode(tt.path))
		})
	}
}

// TestPath2RelayModeConstants guards the relay-mode enum ordering invariants
// the fork relies on.
func TestPath2RelayModeConstants(t *testing.T) {
	assert.Equal(t, 0, RelayModeUnknown)
	assert.NotEqual(t, RelayModeChatCompletions, RelayModeCompletions)
	assert.NotEqual(t, RelayModeResponses, RelayModeResponsesCompact)
}
