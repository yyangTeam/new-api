package service

import (
	"encoding/base64"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/pkg/billingexpr"

	hosttypes "github.com/QuantumNous/new-api/types"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/types"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
		BillingSource:                          "subscription",
		SubscriptionId:                         42,
		SubscriptionPreConsumed:                100,
		SubscriptionPostDelta:                  -150, // larger refund than pre-consume -> consumed would be negative
		SubscriptionAmountUsedAfterPreConsume:  80,
		SubscriptionAmountTotal:                200,
		SubscriptionPlanId:                    9,
		SubscriptionPlanTitle:                  "Pro",
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
		BillingSource:                          "subscription",
		SubscriptionPreConsumed:                100,
		SubscriptionPostDelta:                 20,
		SubscriptionAmountUsedAfterPreConsume:  80,
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
	usage := &dto.Usage{}
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
	usage := &dto.RealtimeUsage{}
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
