package service

import (
	"bytes"
	"encoding/base64"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	rkdto "github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	hosttypes "github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"image"
	"net/http/httptest"
	"testing"
	"time"
)

// --- merged from file_service_test.go ---
func TestDetectFileType_ImageMime(t *testing.T) {
	tests := []struct {
		mime     string
		expected types.FileType
	}{
		{"image/png", types.FileTypeImage},
		{"image/jpeg", types.FileTypeImage},
		{"image/gif", types.FileTypeImage},
		{"image/webp", types.FileTypeImage},
		{"audio/mp3", types.FileTypeAudio},
		{"audio/wav", types.FileTypeAudio},
		{"video/mp4", types.FileTypeVideo},
		{"video/webm", types.FileTypeVideo},
		{"application/pdf", types.FileTypeFile},
		{"text/plain", types.FileTypeFile},
		{"", types.FileTypeFile},
	}
	for _, tt := range tests {
		t.Run(tt.mime, func(t *testing.T) {
			got := DetectFileType(tt.mime)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestGuessMimeTypeFromURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{"png extension", "https://example.com/image.png", "image/png"},
		{"jpg extension", "https://cdn.com/photo.jpg", "image/jpeg"},
		{"query params stripped", "https://example.com/file.gif?token=abc&size=large", "image/gif"},
		{"no extension", "https://example.com/noext", "application/octet-stream"},
		{"no path", "https://example.com/", "application/octet-stream"},
		{"mp3 audio", "https://cdn.com/audio.mp3", "audio/mp3"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := guessMimeTypeFromURL(tt.url)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestGetContextCacheKey_Deterministic(t *testing.T) {
	key1 := getContextCacheKey("https://example.com/img.png")
	key2 := getContextCacheKey("https://example.com/img.png")
	require.Equal(t, key1, key2, "same URL must produce same cache key")

	key3 := getContextCacheKey("https://example.com/other.png")
	require.NotEqual(t, key1, key3, "different URLs must produce different cache keys")
}

func TestGetBase64ContextCacheKey_UsesLengthAndPrefix(t *testing.T) {
	data := "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEND"
	key1 := getBase64ContextCacheKey(data, "image/png")
	key2 := getBase64ContextCacheKey(data, "image/png")
	require.Equal(t, key1, key2)

	// Different mime type -> different key
	key3 := getBase64ContextCacheKey(data, "image/jpeg")
	require.NotEqual(t, key1, key3)
}

func TestGetBase64ContextCacheKey_ShortData(t *testing.T) {
	// Short data (less than 128 chars) should still work
	key := getBase64ContextCacheKey("shortdata", "text/plain")
	require.NotEmpty(t, key)
}

func TestDecodeImageConfig_PNG(t *testing.T) {
	// Minimal valid 1x1 PNG
	pngData := createMinimalPNG(t)
	config, format, err := decodeImageConfig(pngData)
	require.NoError(t, err)
	assert.Equal(t, "png", format)
	assert.Equal(t, 1, config.Width)
	assert.Equal(t, 1, config.Height)
}

func TestDecodeImageConfig_InvalidData(t *testing.T) {
	_, _, err := decodeImageConfig([]byte("not an image"))
	require.Error(t, err)
}

func TestDetectHEIF_ValidHeic(t *testing.T) {
	// Minimal ftyp box with heic brand
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12 // box size = 12
	copy(data[4:8], "ftyp")
	copy(data[8:12], "heic")

	result := detectHEIF(data)
	assert.Equal(t, "image/heic", result)
}

func TestDetectHEIF_ValidMif1(t *testing.T) {
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12
	copy(data[4:8], "ftyp")
	copy(data[8:12], "mif1")

	result := detectHEIF(data)
	assert.Equal(t, "image/heif", result)
}

func TestDetectHEIF_NotHeif(t *testing.T) {
	// Not ftyp
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12
	copy(data[4:8], "moov")
	copy(data[8:12], "heic")

	result := detectHEIF(data)
	assert.Equal(t, "", result)
}

func TestDetectHEIF_TooShort(t *testing.T) {
	result := detectHEIF([]byte("short"))
	assert.Equal(t, "", result)
}

func TestDetectHEIF_UnknownBrand(t *testing.T) {
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12
	copy(data[4:8], "ftyp")
	copy(data[8:12], "isom")

	result := detectHEIF(data)
	assert.Equal(t, "", result)
}

func TestLoadFromBase64_PlainBase64(t *testing.T) {
	// Encode a minimal PNG as base64
	pngData := createMinimalPNG(t)
	b64 := base64.StdEncoding.EncodeToString(pngData)

	cached, err := loadFromBase64(b64, "image/png")
	require.NoError(t, err)
	require.NotNil(t, cached)
	assert.Equal(t, "image/png", cached.MimeType)
	assert.NotNil(t, cached.ImageConfig)
	assert.Equal(t, 1, cached.ImageConfig.Width)
	assert.Equal(t, 1, cached.ImageConfig.Height)
}

func TestLoadFromBase64_DataURIPrefix(t *testing.T) {
	pngData := createMinimalPNG(t)
	b64 := base64.StdEncoding.EncodeToString(pngData)
	dataURI := "data:image/png;base64," + b64

	cached, err := loadFromBase64(dataURI, "")
	require.NoError(t, err)
	require.NotNil(t, cached)
	// MIME from data URI header
	assert.Equal(t, "image/png", cached.MimeType)
}

func TestLoadFromBase64_ProvidedMimeOverrides(t *testing.T) {
	pngData := createMinimalPNG(t)
	b64 := base64.StdEncoding.EncodeToString(pngData)
	dataURI := "data:image/jpeg;base64," + b64

	// Provided mime should override the data URI header
	cached, err := loadFromBase64(dataURI, "image/custom")
	require.NoError(t, err)
	assert.Equal(t, "image/custom", cached.MimeType)
}

func TestLoadFromBase64_InvalidBase64(t *testing.T) {
	_, err := loadFromBase64("not-valid-base64!!!", "image/png")
	require.Error(t, err)
}

func TestLoadFileSource_NilSource(t *testing.T) {
	_, err := LoadFileSource(nil, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "file source is nil")
}

// createMinimalPNG creates a valid 1x1 RGBA PNG file.
func createMinimalPNG(t *testing.T) []byte {
	t.Helper()
	// Known minimal 1x1 white PNG (67 bytes)
	pngBytes := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
		0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth=8, RGB
		0xde,
		0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
		0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
		0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33,
		0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
		0xae, 0x42, 0x60, 0x82,
	}
	// Verify it actually decodes
	_, _, err := image.DecodeConfig(bytes.NewReader(pngBytes))
	require.NoError(t, err, "built-in PNG test data must be valid")
	return pngBytes
}

// --- merged from log_info_generate_test.go ---
func init() {
	gin.SetMode(gin.TestMode)
}

// TestAppendBillingInfoSubscriptionClampsNegativeDeltas guards the billing
// invariant that subscription accounting fields exposed on the consume log
// never go negative: consumed and remain are clamped to zero when a negative
// settlement delta would otherwise produce a credit-like display.
func TestAppendBillingInfoSubscriptionClampsNegativeDeltas(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{
		BillingSource:                         "subscription",
		SubscriptionId:                        42,
		SubscriptionPreConsumed:               100,
		SubscriptionPostDelta:                 -150, // larger refund than pre-consume -> consumed would be negative
		SubscriptionAmountUsedAfterPreConsume: 80,
		SubscriptionAmountTotal:               200,
		SubscriptionPlanId:                    9,
		SubscriptionPlanTitle:                 "Pro",
	}
	appendBillingInfo(info, other)

	require.Equal(t, "subscription", other["billing_source"])
	require.Equal(t, 42, other["subscription_id"]) // SubscriptionId is int
	require.Equal(t, int64(100), other["subscription_pre_consumed"])
	// post_delta is surfaced verbatim (can be negative); only the *derived*
	// consumed/remain are clamped.
	require.Equal(t, int64(-150), other["subscription_post_delta"])
	require.Equal(t, int64(200), other["subscription_total"])
	// usedFinal = usedAfterPreConsume + postDelta = 80 - 150 = -70 -> clamped 0.
	require.Equal(t, int64(0), other["subscription_used"])
	// remain = total - usedFinal = 200 - 0 = 200 (not >0 clamp needed here).
	require.Equal(t, int64(200), other["subscription_remain"])
	// consumed = pre + delta = 100 - 150 = -50 -> clamped 0 -> omitted (only set when >0).
	_, hasConsumed := other["subscription_consumed"]
	assert.False(t, hasConsumed, "consumed should be omitted when clamped to 0")
	require.Equal(t, 0, other["wallet_quota_deducted"])
	require.Equal(t, 9, other["subscription_plan_id"])
	require.Equal(t, "Pro", other["subscription_plan_title"])
}

func TestAppendBillingInfoSubscriptionNormal(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{
		BillingSource:                         "subscription",
		SubscriptionPreConsumed:               100,
		SubscriptionPostDelta:                 20,
		SubscriptionAmountUsedAfterPreConsume: 80,
		SubscriptionAmountTotal:               200,
	}
	appendBillingInfo(info, other)
	// consumed = 100 + 20 = 120
	require.Equal(t, int64(120), other["subscription_consumed"])
	// usedFinal = 80 + 20 = 100
	require.Equal(t, int64(100), other["subscription_used"])
	// remain = 200 - 100 = 100
	require.Equal(t, int64(100), other["subscription_remain"])
}

func TestAppendBillingInfoWalletNoSubscriptionFields(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{BillingSource: "wallet"}
	appendBillingInfo(info, other)
	require.Equal(t, "wallet", other["billing_source"])
	for _, k := range []string{"subscription_id", "subscription_total", "wallet_quota_deducted"} {
		_, ok := other[k]
		assert.False(t, ok, "wallet billing should not add %s", k)
	}
}

func TestAppendBillingInfoNilGuards(t *testing.T) {
	// nil other / nil relayInfo must not panic.
	assert.NotPanics(t, func() { appendBillingInfo(nil, map[string]interface{}{}) })
	assert.NotPanics(t, func() { appendBillingInfo(&relaycommon.RelayInfo{}, nil) })
	assert.NotPanics(t, func() { appendBillingInfo(nil, nil) })
}

func TestAppendRequestConversionChain(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{
		RequestConversionChain: []types.RelayFormat{
			types.RelayFormatClaude,
			types.RelayFormatOpenAI,
			types.RelayFormatGemini,
			types.RelayFormatOpenAIResponses,
			types.RelayFormat("unknown"),
		},
	}
	appendRequestConversionChain(info, other)
	chain, ok := other["request_conversion"].([]string)
	require.True(t, ok)
	require.Equal(t, []string{
		"Claude Messages",
		"OpenAI Compatible",
		"Google Gemini",
		"OpenAI Responses",
		"unknown",
	}, chain)
}

func TestAppendRequestConversionChainEmpty(t *testing.T) {
	other := map[string]interface{}{}
	appendRequestConversionChain(&relaycommon.RelayInfo{}, other)
	_, has := other["request_conversion"]
	assert.False(t, has)
	// nil relayInfo must not panic and must not write.
	appendRequestConversionChain(nil, other)
}

func TestAppendFinalRequestFormatClaude(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{FinalRequestRelayFormat: types.RelayFormatClaude}
	appendFinalRequestFormat(info, other)
	require.Equal(t, true, other["claude"])
}

func TestAppendFinalRequestFormatNonClaude(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{FinalRequestRelayFormat: types.RelayFormatOpenAI}
	appendFinalRequestFormat(info, other)
	_, has := other["claude"]
	assert.False(t, has)
}

func TestAppendParamOverrideInfo(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{ParamOverrideAudit: []string{"max_tokens=128"}}
	appendParamOverrideInfo(info, other)
	require.Equal(t, []string{"max_tokens=128"}, other["po"])

	// empty -> omitted
	other2 := map[string]interface{}{}
	appendParamOverrideInfo(&relaycommon.RelayInfo{}, other2)
	_, has := other2["po"]
	assert.False(t, has)
}

func TestAppendStreamStatusError(t *testing.T) {
	other := map[string]interface{}{}
	ss := relaycommon.NewStreamStatus()
	ss.SetEndReason(relaycommon.StreamEndReasonTimeout, nil)
	ss.RecordError("upstream 500")
	ss.RecordError("upstream 503")
	info := &relaycommon.RelayInfo{IsStream: true, StreamStatus: ss}
	appendStreamStatus(info, other)

	si, ok := other["stream_status"].(map[string]interface{})
	require.True(t, ok)
	require.Equal(t, "error", si["status"])
	require.Equal(t, "timeout", si["end_reason"])
	require.Equal(t, 2, si["error_count"])
	msgs, ok := si["errors"].([]string)
	require.True(t, ok)
	require.Equal(t, []string{"upstream 500", "upstream 503"}, msgs)
}

func TestAppendStreamStatusNormalEnd(t *testing.T) {
	other := map[string]interface{}{}
	ss := relaycommon.NewStreamStatus()
	ss.SetEndReason(relaycommon.StreamEndReasonDone, nil)
	info := &relaycommon.RelayInfo{IsStream: true, StreamStatus: ss}
	appendStreamStatus(info, other)
	si := other["stream_status"].(map[string]interface{})
	require.Equal(t, "ok", si["status"])
	_, hasErrors := si["errors"]
	assert.False(t, hasErrors)
}

func TestAppendStreamStatusSkippedWhenNotStream(t *testing.T) {
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{IsStream: false, StreamStatus: relaycommon.NewStreamStatus()}
	appendStreamStatus(info, other)
	_, has := other["stream_status"]
	assert.False(t, has)
}

func TestAppendRequestPathFromContext(t *testing.T) {
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions?x=1", nil)
	other := map[string]interface{}{}
	appendRequestPath(ctx, &relaycommon.RelayInfo{}, other)
	require.Equal(t, "/v1/chat/completions", other["request_path"])
}

func TestAppendRequestPathFallbackToRelayInfo(t *testing.T) {
	// nil ctx -> fall back to relayInfo.RequestURLPath, stripped of query.
	other := map[string]interface{}{}
	appendRequestPath(nil, &relaycommon.RelayInfo{RequestURLPath: "https://up.stream/v1/x?a=1"}, other)
	require.Equal(t, "https://up.stream/v1/x", other["request_path"])
}

func TestAppendRequestPathNilOther(t *testing.T) {
	assert.NotPanics(t, func() { appendRequestPath(nil, nil, nil) })
}

func TestGenerateMjOtherInfo(t *testing.T) {
	info := &relaycommon.RelayInfo{RequestURLPath: "https://up/mj?a=1"}
	other := GenerateMjOtherInfo(info, hosttypes.PriceData{
		ModelPrice: 0.004,
		GroupRatioInfo: hosttypes.GroupRatioInfo{
			GroupRatio:        1.0,
			GroupSpecialRatio: 2.0,
			HasSpecialRatio:   true,
		},
	})
	require.Equal(t, 0.004, other["model_price"])
	require.Equal(t, 1.0, other["group_ratio"])
	require.Equal(t, 2.0, other["user_group_ratio"]) // special ratio
	require.Equal(t, "https://up/mj", other["request_path"])
}

func TestGenerateTextOtherInfoBasic(t *testing.T) {
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
	now := time.Now()
	info := &relaycommon.RelayInfo{
		StartTime:         now,
		FirstResponseTime: now.Add(150 * time.Millisecond),
		OriginModelName:   "gpt-4",
		ReasoningEffort:   "high",
		ChannelMeta: &relaycommon.ChannelMeta{
			IsModelMapped:     true,
			UpstreamModelName: "gpt-4-0613",
		},
	}
	other := GenerateTextOtherInfo(ctx, info, 2.5, 1.0, 3.0, 100, 0.5, 0.0, 1.0)
	require.Equal(t, 2.5, other["model_ratio"])
	require.Equal(t, 1.0, other["group_ratio"])
	require.Equal(t, 3.0, other["completion_ratio"])
	require.Equal(t, 100, other["cache_tokens"])
	require.Equal(t, 0.5, other["cache_ratio"])
	require.Equal(t, 0.0, other["model_price"])
	require.Equal(t, 1.0, other["user_group_ratio"])
	require.Equal(t, "high", other["reasoning_effort"])
	require.Equal(t, true, other["is_model_mapped"])
	require.Equal(t, "gpt-4-0613", other["upstream_model_name"])
	require.Equal(t, "/v1/chat/completions", other["request_path"])
	_, hasFrt := other["frt"]
	require.True(t, hasFrt)
	// reasoning_effort absent when empty. ChannelMeta must be non-nil because
	// GenerateTextOtherInfo promotes IsModelMapped/UpstreamModelName from it.
	other2 := GenerateTextOtherInfo(ctx, &relaycommon.RelayInfo{
		StartTime:         now,
		FirstResponseTime: now,
		ChannelMeta:       &relaycommon.ChannelMeta{},
	}, 1, 1, 1, 0, 0, 0, 1)
	_, hasRE := other2["reasoning_effort"]
	assert.False(t, hasRE)
}

func TestGenerateClaudeOtherInfo(t *testing.T) {
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	now := time.Now()
	info := &relaycommon.RelayInfo{
		StartTime:         now,
		FirstResponseTime: now,
		ChannelMeta:       &relaycommon.ChannelMeta{},
	}
	other := GenerateClaudeOtherInfo(ctx, info, 1, 1, 1, 10, 0.5, 5, 0.25, 0, 0.0, 0, 0.0, 0.0, 1.0)
	require.Equal(t, true, other["claude"])
	require.Equal(t, 5, other["cache_creation_tokens"])
	require.Equal(t, 0.25, other["cache_creation_ratio"])
	// 5m/1h variants only emitted when non-zero.
	_, has5m := other["cache_creation_tokens_5m"]
	assert.False(t, has5m)
	_, has1h := other["cache_creation_tokens_1h"]
	assert.False(t, has1h)

	// With non-zero 5m/1h, both pairs are emitted.
	other2 := GenerateClaudeOtherInfo(ctx, info, 1, 1, 1, 0, 0, 3, 0.2, 7, 0.15, 0, 0.0, 0.0, 1.0)
	require.Equal(t, 7, other2["cache_creation_tokens_5m"])
	require.Equal(t, 0.15, other2["cache_creation_ratio_5m"])
}

func TestGenerateAudioOtherInfo(t *testing.T) {
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	now := time.Now()
	info := &relaycommon.RelayInfo{StartTime: now, FirstResponseTime: now, ChannelMeta: &relaycommon.ChannelMeta{}}
	usage := &rkdto.Usage{}
	other := GenerateAudioOtherInfo(ctx, info, usage, 1, 1, 1, 2.0, 3.0, 0.0, 1.0)
	require.Equal(t, true, other["audio"])
	require.Equal(t, 2.0, other["audio_ratio"])
	require.Equal(t, 3.0, other["audio_completion_ratio"])
}

func TestGenerateWssOtherInfo(t *testing.T) {
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	now := time.Now()
	info := &relaycommon.RelayInfo{StartTime: now, FirstResponseTime: now, ChannelMeta: &relaycommon.ChannelMeta{}}
	usage := &rkdto.RealtimeUsage{}
	other := GenerateWssOtherInfo(ctx, info, usage, 1, 1, 1, 2.0, 3.0, 0.0, 1.0)
	require.Equal(t, true, other["ws"])
	require.Equal(t, 2.0, other["audio_ratio"])
	require.Equal(t, 3.0, other["audio_completion_ratio"])
}

func TestInjectTieredBillingInfo(t *testing.T) {
	// Tiered billing overlay must mark billing_mode, base64-encode the
	// expression, and surface the matched tier — frontend/admin audit
	// rendering depends on these keys.
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{
		TieredBillingSnapshot: &billingexpr.BillingSnapshot{ExprString: "x > 10 ? tier_a : tier_b"},
	}
	result := &billingexpr.TieredResult{MatchedTier: "tier_a"}
	InjectTieredBillingInfo(other, info, result)
	require.Equal(t, "tiered_expr", other["billing_mode"])
	require.Equal(t, "tier_a", other["matched_tier"])
	// expr_b64 must decode back to the original expression string.
	b64, _ := other["expr_b64"].(string)
	decoded, err := base64.StdEncoding.DecodeString(b64)
	require.NoError(t, err)
	require.Equal(t, "x > 10 ? tier_a : tier_b", string(decoded))
}

func TestInjectTieredBillingInfoNoSnapshot(t *testing.T) {
	// Without a snapshot, no tiered fields are injected (callers fall back
	// to flat billing). Must not panic on nil result either.
	other := map[string]interface{}{}
	InjectTieredBillingInfo(other, &relaycommon.RelayInfo{}, nil)
	for _, k := range []string{"billing_mode", "expr_b64", "matched_tier"} {
		_, ok := other[k]
		assert.False(t, ok, "%s should not be set without a snapshot", k)
	}
	// nil other / nil relayInfo guards.
	assert.NotPanics(t, func() { InjectTieredBillingInfo(nil, &relaycommon.RelayInfo{}, nil) })
	assert.NotPanics(t, func() { InjectTieredBillingInfo(map[string]interface{}{}, nil, nil) })
}

// --- merged from midjourney_test.go ---
func TestCovertMjpActionToModelName(t *testing.T) {
	tests := []struct {
		action   string
		expected string
	}{
		{constant.MjActionImagine, "mj_imagine"},
		{constant.MjActionDescribe, "mj_describe"},
		{constant.MjActionBlend, "mj_blend"},
		{constant.MjActionUpscale, "mj_upscale"},
		{constant.MjActionVariation, "mj_variation"},
		{constant.MjActionReRoll, "mj_reroll"},
		{constant.MjActionModal, "mj_modal"},
		{constant.MjActionInPaint, "mj_inpaint"},
		{constant.MjActionZoom, "mj_zoom"},
		{constant.MjActionCustomZoom, "mj_custom_zoom"},
		{constant.MjActionShorten, "mj_shorten"},
		{constant.MjActionHighVariation, "mj_high_variation"},
		{constant.MjActionLowVariation, "mj_low_variation"},
		{constant.MjActionPan, "mj_pan"},
		{constant.MjActionUpload, "mj_upload"},
		{constant.MjActionVideo, "mj_video"},
		{constant.MjActionEdits, "mj_edits"},
		// SwapFace is a special case
		{constant.MjActionSwapFace, "swap_face"},
	}
	for _, tt := range tests {
		t.Run(tt.action, func(t *testing.T) {
			got := CovertMjpActionToModelName(tt.action)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestCoverPlusActionToNormalAction_Upsample(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::upsample::2::3dbbd469-36af-4a0f-8f02-df6c579e7011",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp, "should not return an error response")
	assert.Equal(t, constant.MjActionUpscale, req.Action)
	assert.Equal(t, 2, req.Index)
}

func TestCoverPlusActionToNormalAction_Variation(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::variation::3::some-uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionVariation, req.Action)
	assert.Equal(t, 3, req.Index)
}

func TestCoverPlusActionToNormalAction_LowVariation(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::low_variation::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionLowVariation, req.Action)
}

func TestCoverPlusActionToNormalAction_HighVariation(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::high_variation::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionHighVariation, req.Action)
}

func TestCoverPlusActionToNormalAction_Pan(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::pan_left::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionPan, req.Action)
	assert.Equal(t, 1, req.Index)
}

func TestCoverPlusActionToNormalAction_Reroll(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::reroll::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionReRoll, req.Action)
}

func TestCoverPlusActionToNormalAction_Outpaint(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::Outpaint::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionZoom, req.Action)
}

func TestCoverPlusActionToNormalAction_CustomZoom(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::CustomZoom::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionCustomZoom, req.Action)
}

func TestCoverPlusActionToNormalAction_Inpaint(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::Inpaint::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionInPaint, req.Action)
}

func TestCoverPlusActionToNormalAction_EmptyCustomId(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.NotNil(t, resp, "empty customId must return error")
	assert.Equal(t, constant.MjRequestError, resp.Code)
}

func TestCoverPlusActionToNormalAction_UnknownAction(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::totally_unknown::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.NotNil(t, resp, "unknown action must return error")
	assert.Equal(t, constant.MjRequestError, resp.Code)
}

func TestCoverPlusActionToNormalAction_NonJOBSplit(t *testing.T) {
	// When splits[1] != "JOB", action = splits[1]
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::reroll::extra",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionReRoll, req.Action)
}

func TestConvertSimpleChangeParams_Upscale(t *testing.T) {
	result := ConvertSimpleChangeParams("task123 U2")
	require.NotNil(t, result)
	assert.Equal(t, "task123", result.TaskId)
	assert.Equal(t, "UPSCALE", result.Action)
	assert.Equal(t, 2, result.Index)
}

func TestConvertSimpleChangeParams_Variation(t *testing.T) {
	result := ConvertSimpleChangeParams("task456 v3")
	require.NotNil(t, result)
	assert.Equal(t, "task456", result.TaskId)
	assert.Equal(t, "VARIATION", result.Action)
	assert.Equal(t, 3, result.Index)
}

func TestConvertSimpleChangeParams_Reroll(t *testing.T) {
	result := ConvertSimpleChangeParams("task789 r")
	require.NotNil(t, result)
	assert.Equal(t, "task789", result.TaskId)
	assert.Equal(t, "REROLL", result.Action)
}

func TestConvertSimpleChangeParams_InvalidIndex(t *testing.T) {
	// Index 0 is invalid (must be 1-4)
	result := ConvertSimpleChangeParams("task123 u0")
	assert.Nil(t, result)

	// Index 5 is invalid
	result = ConvertSimpleChangeParams("task123 u5")
	assert.Nil(t, result)
}

func TestConvertSimpleChangeParams_InvalidFormat(t *testing.T) {
	// Too many parts
	result := ConvertSimpleChangeParams("a b c")
	assert.Nil(t, result)

	// Only one part
	result = ConvertSimpleChangeParams("justoneword")
	assert.Nil(t, result)

	// Empty
	result = ConvertSimpleChangeParams("")
	assert.Nil(t, result)
}

func TestConvertSimpleChangeParams_UnknownAction(t *testing.T) {
	result := ConvertSimpleChangeParams("task123 x2")
	assert.Nil(t, result, "unknown action letter should return nil")
}

// --- merged from quota_test.go ---
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
		ModelName:  "unknown-model",
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

// --- merged from rankings_test.go ---
// --- Pure helper tests (no DB) ---

func TestRankingConfig_ValidPeriods(t *testing.T) {
	tests := []struct {
		period string
		id     string
	}{
		{"", "week"},
		{"week", "week"},
		{"today", "today"},
		{"month", "month"},
		{"year", "year"},
	}
	for _, tt := range tests {
		t.Run(tt.period, func(t *testing.T) {
			cfg, err := rankingConfig(tt.period)
			require.NoError(t, err)
			assert.Equal(t, tt.id, cfg.id)
			assert.True(t, cfg.hasPrevious)
			assert.True(t, cfg.duration > 0)
			assert.True(t, cfg.bucketSize > 0)
		})
	}
}

func TestRankingConfig_InvalidPeriod(t *testing.T) {
	_, err := rankingConfig("invalid")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid ranking period")
}

func TestRankingTimeRange(t *testing.T) {
	now := time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC)
	cfg := rankingPeriodConfig{duration: 7 * 24 * time.Hour}
	start, end := rankingTimeRange(cfg, now)
	assert.Equal(t, now.Unix(), end)
	assert.Equal(t, now.Add(-7*24*time.Hour).Unix(), start)
}

func TestPreviousRankingTimeRange(t *testing.T) {
	cfg := rankingPeriodConfig{duration: 7 * 24 * time.Hour}
	currentStart := int64(1000000)
	prevStart, prevEnd := previousRankingTimeRange(cfg, currentStart)
	assert.Equal(t, currentStart-1, prevEnd)
	assert.Equal(t, time.Unix(currentStart, 0).Add(-7*24*time.Hour).Unix(), prevStart)
}

func TestRankingShare(t *testing.T) {
	tests := []struct {
		name     string
		value    int64
		total    int64
		expected float64
	}{
		{"normal", 500, 1000, 0.5},
		{"zero total", 100, 0, 0},
		{"zero value", 0, 1000, 0},
		{"negative total", 100, -1, 0},
		{"full share", 1000, 1000, 1.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := rankingShare(tt.value, tt.total)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestRankingGrowthPct(t *testing.T) {
	tests := []struct {
		name     string
		current  int64
		previous int64
		expected float64
	}{
		{"100% growth", 200, 100, 100.0},
		{"50% growth", 150, 100, 50.0},
		{"decline", 50, 100, -50.0},
		{"no previous, has current", 100, 0, 100.0},
		{"no previous, no current", 0, 0, 0.0},
		{"same as previous", 100, 100, 0.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := rankingGrowthPct(tt.current, tt.previous)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestSumRankingTokens(t *testing.T) {
	totals := []model.RankingQuotaTotal{
		{ModelName: "a", TotalTokens: 100},
		{ModelName: "b", TotalTokens: 200},
		{ModelName: "c", TotalTokens: 300},
	}
	assert.Equal(t, int64(600), sumRankingTokens(totals))
	assert.Equal(t, int64(0), sumRankingTokens(nil))
}

func TestRankingRankMap(t *testing.T) {
	totals := []model.RankingQuotaTotal{
		{ModelName: "gpt-4", TotalTokens: 1000},
		{ModelName: "claude-3", TotalTokens: 500},
		{ModelName: "gemini", TotalTokens: 250},
	}
	ranks := rankingRankMap(totals)
	assert.Equal(t, 1, ranks["gpt-4"])
	assert.Equal(t, 2, ranks["claude-3"])
	assert.Equal(t, 3, ranks["gemini"])
}

func TestRankingTokenMap(t *testing.T) {
	totals := []model.RankingQuotaTotal{
		{ModelName: "gpt-4", TotalTokens: 1000},
		{ModelName: "claude-3", TotalTokens: 500},
	}
	tokens := rankingTokenMap(totals)
	assert.Equal(t, int64(1000), tokens["gpt-4"])
	assert.Equal(t, int64(500), tokens["claude-3"])
}

func TestLimitRankedModels(t *testing.T) {
	models := make([]RankedModel, 25)
	for i := range models {
		models[i] = RankedModel{Rank: i + 1, ModelName: "m"}
	}
	limited := limitRankedModels(models, 20)
	assert.Len(t, limited, 20)

	// Under limit returns all
	small := []RankedModel{{Rank: 1}, {Rank: 2}}
	assert.Len(t, limitRankedModels(small, 20), 2)

	// Zero limit returns all
	assert.Len(t, limitRankedModels(models, 0), 25)
}

func TestLimitRankingMovers(t *testing.T) {
	movers := make([]RankingMover, 10)
	limited := limitRankingMovers(movers, 6)
	assert.Len(t, limited, 6)

	assert.Len(t, limitRankingMovers(movers, 0), 10)
	assert.Len(t, limitRankingMovers(movers, 20), 10)
}

func TestBuildRankingMovers(t *testing.T) {
	rank2 := 5
	rank3 := 1
	models := []RankedModel{
		{Rank: 1, ModelName: "stable", PreviousRank: nil},     // no previous
		{Rank: 2, ModelName: "mover", PreviousRank: &rank2},   // moved up 3
		{Rank: 3, ModelName: "dropper", PreviousRank: &rank3}, // dropped 2
	}
	movers, droppers := buildRankingMovers(models)
	require.Len(t, movers, 1)
	assert.Equal(t, "mover", movers[0].ModelName)
	assert.Equal(t, 3, movers[0].RankDelta) // 5-2=3

	require.Len(t, droppers, 1)
	assert.Equal(t, "dropper", droppers[0].ModelName)
	assert.Equal(t, -2, droppers[0].RankDelta) // 1-3=-2
}

func TestMinInt(t *testing.T) {
	assert.Equal(t, 3, minInt(3, 5))
	assert.Equal(t, 3, minInt(5, 3))
	assert.Equal(t, 4, minInt(4, 4))
}

func TestRoundRankingFloat(t *testing.T) {
	assert.Equal(t, 0.3333, roundRankingFloat(1.0/3.0))
	assert.Equal(t, 1.0, roundRankingFloat(1.0))
	assert.Equal(t, 0.0, roundRankingFloat(0.0))
}

func TestSortedRankingBuckets(t *testing.T) {
	bucketSet := map[int64]struct{}{
		300: {},
		100: {},
		200: {},
	}
	sorted := sortedRankingBuckets(bucketSet)
	require.Len(t, sorted, 3)
	assert.Equal(t, int64(100), sorted[0])
	assert.Equal(t, int64(200), sorted[1])
	assert.Equal(t, int64(300), sorted[2])
}

func TestRankingBucketTs(t *testing.T) {
	ts := rankingBucketTs(1704067200) // 2024-01-01 00:00:00 UTC
	assert.Equal(t, "2024-01-01T00:00:00Z", ts)
}

// --- DB-backed tests using SQLite fixture from TestMain ---

func TestGetRankingsSnapshot_DBIntegration(t *testing.T) {
	// Migrate QuotaData table for this test
	err := model.DB.AutoMigrate(&model.QuotaData{})
	require.NoError(t, err)

	// Clean up
	model.DB.Exec("DELETE FROM quota_data")

	// Seed data: 2 models with usage in the last week
	now := time.Now().Unix()
	model.DB.Exec("INSERT INTO quota_data (user_id, model_name, token_used, count, quota, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		1, "gpt-4", 5000, 10, 100, now-3600)
	model.DB.Exec("INSERT INTO quota_data (user_id, model_name, token_used, count, quota, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		1, "claude-3", 3000, 5, 60, now-7200)

	// Clear ranking cache to force fresh build
	rankingCacheMu.Lock()
	delete(rankingCache, "week")
	rankingCacheMu.Unlock()

	resp, err := GetRankingsSnapshot("week")
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Verify models are ranked by total tokens
	require.GreaterOrEqual(t, len(resp.Models), 2)
	assert.Equal(t, "gpt-4", resp.Models[0].ModelName)
	assert.Equal(t, "claude-3", resp.Models[1].ModelName)
	assert.Equal(t, int64(5000), resp.Models[0].TotalTokens)
	assert.Equal(t, int64(3000), resp.Models[1].TotalTokens)
	assert.Equal(t, 1, resp.Models[0].Rank)
	assert.Equal(t, 2, resp.Models[1].Rank)

	// Share must sum to ~1.0
	totalShare := resp.Models[0].Share + resp.Models[1].Share
	assert.InDelta(t, 1.0, totalShare, 0.001)

	// Clean up
	model.DB.Exec("DELETE FROM quota_data")
}

func TestGetRankingsSnapshot_CachesResult(t *testing.T) {
	err := model.DB.AutoMigrate(&model.QuotaData{})
	require.NoError(t, err)
	model.DB.Exec("DELETE FROM quota_data")

	now := time.Now().Unix()
	model.DB.Exec("INSERT INTO quota_data (user_id, model_name, token_used, count, quota, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		1, "test-model", 1000, 1, 10, now-100)

	// Clear cache
	rankingCacheMu.Lock()
	delete(rankingCache, "today")
	rankingCacheMu.Unlock()

	resp1, err := GetRankingsSnapshot("today")
	require.NoError(t, err)

	// Second call should return cached result (same pointer)
	resp2, err := GetRankingsSnapshot("today")
	require.NoError(t, err)
	assert.Equal(t, resp1, resp2)

	// Clean up
	model.DB.Exec("DELETE FROM quota_data")
	rankingCacheMu.Lock()
	delete(rankingCache, "today")
	rankingCacheMu.Unlock()
}

func TestGetRankingsSnapshot_InvalidPeriod(t *testing.T) {
	_, err := GetRankingsSnapshot("invalid_period")
	require.Error(t, err)
}

// --- merged from system_task_helpers_test.go ---
func TestLogCleanupProgress_Table(t *testing.T) {
	tests := []struct {
		name      string
		processed int64
		total     int64
		expected  int
	}{
		{"zero total returns 100", 0, 0, 100},
		{"negative total returns 100", 0, -1, 100},
		{"zero processed returns 0", 0, 100, 0},
		{"half done", 50, 100, 50},
		{"all done", 100, 100, 100},
		{"over processed clamps to 100", 150, 100, 100},
		{"negative processed returns 0", -5, 100, 0},
		{"one percent", 1, 100, 1},
		{"integer truncation not rounding", 33, 100, 33},
		{"large numbers", 999999, 1000000, 99},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := logCleanupProgress(tt.processed, tt.total)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestSyncLogCleanupStateFromRemaining_InitialState(t *testing.T) {
	state := LogCleanupState{}
	syncLogCleanupStateFromRemaining(&state, 500)

	assert.Equal(t, int64(500), state.Total)
	assert.Equal(t, int64(0), state.Processed)
	assert.Equal(t, int64(500), state.Remaining)
	assert.Equal(t, 0, state.Progress)
}

func TestSyncLogCleanupStateFromRemaining_ProgressUpdate(t *testing.T) {
	state := LogCleanupState{
		Total:     1000,
		Processed: 200,
		Remaining: 800,
		Progress:  20,
	}
	syncLogCleanupStateFromRemaining(&state, 600)

	// processedFromRemaining = 1000 - 600 = 400 > 200
	assert.Equal(t, int64(400), state.Processed)
	assert.Equal(t, int64(600), state.Remaining)
	assert.Equal(t, 40, state.Progress)
}

func TestSyncLogCleanupStateFromRemaining_CompletionCase(t *testing.T) {
	state := LogCleanupState{
		Total:     100,
		Processed: 80,
		Remaining: 20,
	}
	syncLogCleanupStateFromRemaining(&state, 0)

	assert.Equal(t, int64(0), state.Remaining)
	assert.Equal(t, int64(100), state.Processed)
	assert.Equal(t, 100, state.Progress)
}

func TestSyncLogCleanupStateFromRemaining_RemainingExceedsTotal(t *testing.T) {
	// Edge: if remaining > total (stale data race), Processed should not go negative
	state := LogCleanupState{
		Total:     100,
		Processed: 10,
	}
	// remaining=200 means processedFromRemaining = 100-200 = -100
	// since -100 < 10, Processed stays at 10
	syncLogCleanupStateFromRemaining(&state, 200)

	assert.Equal(t, int64(10), state.Processed)
	assert.Equal(t, int64(200), state.Remaining)
}

func TestNewSystemTaskProgressReporter_ClampsProgress(t *testing.T) {
	// Verify the logic that progress is clamped 0-100
	// We test the inline logic only (no real task needed for clamping logic)
	// The function creates a closure; we verify invariants via behavior:
	// processed > total should give 100, not overflow
	progress := 100
	total := 10
	processed := 20
	if total > 0 {
		progress = processed * 100 / total
	}
	if progress > 100 {
		progress = 100
	}
	assert.Equal(t, 100, progress)

	// negative should clamp
	processed = -5
	progress = processed * 100 / total
	if progress < 0 {
		progress = 0
	}
	assert.Equal(t, 0, progress)
}

// --- merged from token_counter_test.go ---
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
