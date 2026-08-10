package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCalculateAudioQuotaUsePrice guards the price-based audio billing path:
// quota = modelPrice * QuotaPerUnit * groupRatio, with no ratio-map lookup.
func TestCalculateAudioQuotaUsePrice(t *testing.T) {
	// modelPrice in $/1K tokens; QuotaPerUnit=500000 quota per $1.
	// $0.002/1K * 500000 = 1000 quota per 1K tokens.
	quota, clamp := calculateAudioQuota(QuotaInfo{
		UsePrice:   true,
		ModelPrice: 0.002,
		GroupRatio: 1.0,
	})
	require.Nil(t, clamp, "no saturation for a normal price product")
	assert.Equal(t, 1000, quota)

	// groupRatio scales linearly.
	quota2, clamp2 := calculateAudioQuota(QuotaInfo{
		UsePrice:   true,
		ModelPrice: 0.002,
		GroupRatio: 0.5,
	})
	require.Nil(t, clamp2)
	assert.Equal(t, 500, quota2)
}

// TestCalculateAudioQuotaTokenBased exercises the token-multiplier path with the
// real default ratios for gpt-4o-audio-preview: audioRatio=16 (from the audio
// ratio map), audioCompletionRatio=1 (default fallback), and
// completionRatio=4 (hardcoded gpt-4o fallback).
func TestCalculateAudioQuotaTokenBased(t *testing.T) {
	ratio_setting.InitRatioSettings()
	// quota = inputText(10)
	//       + outputText(20) * completionRatio(4)
	//       + inputAudio(5) * audioRatio(16)
	//       + outputAudio(5) * audioRatio(16) * audioCompletionRatio(1)
	//       = 10 + 80 + 80 + 80 = 250; ratio = groupRatio*modelRatio = 1.
	quota, clamp := calculateAudioQuota(QuotaInfo{
		ModelName:  "gpt-4o-audio-preview",
		ModelRatio: 1.0,
		GroupRatio: 1.0,
		InputDetails: TokenDetails{
			TextTokens:  10,
			AudioTokens: 5,
		},
		OutputDetails: TokenDetails{
			TextTokens:  20,
			AudioTokens: 5,
		},
	})
	require.Nil(t, clamp)
	assert.Equal(t, 250, quota)
}

// TestCalculateAudioQuotaFloorToOne locks the billing invariant that when the
// effective ratio is nonzero but the computed quota rounds down to <=0, a
// minimum charge of 1 is applied instead of zero (no free ride).
func TestCalculateAudioQuotaFloorToOne(t *testing.T) {
	// all tokens zero, but ratio nonzero -> quota floored to 1.
	quota, clamp := calculateAudioQuota(QuotaInfo{
		ModelName: "unknown-model",
		ModelRatio: 1.0,
		GroupRatio: 1.0,
	})
	require.Nil(t, clamp)
	assert.Equal(t, 1, quota)
}

// TestCalculateAudioQuotaZeroRatioNoFloor confirms that when ratio is zero the
// floor does NOT apply (a genuinely free model yields 0 quota, not 1).
func TestCalculateAudioQuotaZeroRatioNoFloor(t *testing.T) {
	quota, clamp := calculateAudioQuota(QuotaInfo{
		ModelName:  "unknown-model",
		ModelRatio: 0.0,
		GroupRatio: 0.0,
		InputDetails: TokenDetails{
			TextTokens: 100,
		},
	})
	require.Nil(t, clamp)
	assert.Equal(t, 0, quota)
}

// TestCalculateAudioQuotaSaturation guards the overflow invariant: an absurd
// modelPrice multiplied by huge token counts must saturate to MaxQuota and
// surface a QuotaClamp, never wrap to a negative charge.
func TestCalculateAudioQuotaSaturation(t *testing.T) {
	info := QuotaInfo{
		UsePrice:   true,
		ModelPrice: 1.8e19,
		GroupRatio: 1.0,
	}
	quota, clamp := calculateAudioQuota(info)
	require.NotNil(t, clamp, "oversized audio quota must surface a saturation clamp")
	assert.Equal(t, common.MaxQuota, quota)
}
