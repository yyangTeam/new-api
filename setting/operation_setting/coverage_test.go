package operation_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/QuantumNous/new-api/relaykit/types"
)

// ---------------------------------------------------------------------------
// general_setting.go — currency display getters
// ---------------------------------------------------------------------------

func TestGetGeneralSetting_Defaults(t *testing.T) {
	orig := generalSetting
	t.Cleanup(func() { generalSetting = orig })

	generalSetting = GeneralSetting{
		DocsLink:                   "https://docs.newapi.pro",
		PingIntervalEnabled:        false,
		PingIntervalSeconds:        60,
		QuotaDisplayType:           QuotaDisplayTypeUSD,
		CustomCurrencySymbol:       "¤",
		CustomCurrencyExchangeRate: 1.0,
	}
	s := GetGeneralSetting()
	require.NotNil(t, s)
	assert.Equal(t, "https://docs.newapi.pro", s.DocsLink)
	assert.False(t, s.PingIntervalEnabled)
	assert.Equal(t, 60, s.PingIntervalSeconds)
	assert.Equal(t, QuotaDisplayTypeUSD, s.QuotaDisplayType)
}

func TestCurrencyDisplayFlags_AllQuotaDisplayTypes(t *testing.T) {
	orig := generalSetting
	t.Cleanup(func() { generalSetting = orig })

	cases := []struct {
		displayType     string
		isCurrency      bool
		isCNY           bool
		currencySymbol  string
		usdToCnyRate    float64
		expectedRateOut float64
	}{
		{QuotaDisplayTypeUSD, true, false, "$", 7.3, 1},
		{QuotaDisplayTypeCNY, true, true, "¥", 7.3, 7.3},
		{QuotaDisplayTypeTokens, false, false, "", 7.3, 1},
		// Custom: symbol is admin-configured; rate is the custom exchange rate.
		{QuotaDisplayTypeCustom, true, false, "€", 0.9, 0.9},
	}
	for _, c := range cases {
		t.Run(c.displayType, func(t *testing.T) {
			generalSetting = GeneralSetting{
				QuotaDisplayType:           c.displayType,
				CustomCurrencySymbol:       "€",
				CustomCurrencyExchangeRate: 0.9,
			}
			assert.Equal(t, c.isCurrency, IsCurrencyDisplay())
			assert.Equal(t, c.isCNY, IsCNYDisplay())
			assert.Equal(t, c.displayType, GetQuotaDisplayType())
			assert.Equal(t, c.currencySymbol, GetCurrencySymbol())
			assert.InDelta(t, c.expectedRateOut, GetUsdToCurrencyRate(c.usdToCnyRate), 0.0001)
		})
	}
}

func TestGetCurrencySymbol_CustomEmptyFallsBackToGenericCurrency(t *testing.T) {
	orig := generalSetting
	t.Cleanup(func() { generalSetting = orig })

	generalSetting = GeneralSetting{
		QuotaDisplayType:     QuotaDisplayTypeCustom,
		CustomCurrencySymbol: "",
	}
	assert.Equal(t, "¤", GetCurrencySymbol())
}

func TestGetUsdToCurrencyRate_CustomNonPositiveFallsBackToOne(t *testing.T) {
	orig := generalSetting
	t.Cleanup(func() { generalSetting = orig })

	// A non-positive custom rate must never be used as a billing multiplier; it
	// falls back to 1 so no charge is silently inflated or zeroed.
	generalSetting = GeneralSetting{
		QuotaDisplayType:           QuotaDisplayTypeCustom,
		CustomCurrencyExchangeRate: 0,
	}
	assert.InDelta(t, 1.0, GetUsdToCurrencyRate(7.3), 0.0001)

	generalSetting.CustomCurrencyExchangeRate = -2
	assert.InDelta(t, 1.0, GetUsdToCurrencyRate(7.3), 0.0001)
}

// ---------------------------------------------------------------------------
// checkin_setting.go
// ---------------------------------------------------------------------------

func TestCheckin_GettersAndDefaults(t *testing.T) {
	orig := checkinSetting
	t.Cleanup(func() { checkinSetting = orig })

	checkinSetting = CheckinSetting{Enabled: false, MinQuota: 1000, MaxQuota: 10000}
	s := GetCheckinSetting()
	require.NotNil(t, s)
	assert.False(t, IsCheckinEnabled())
	min, max := GetCheckinQuotaRange()
	assert.Equal(t, 1000, min)
	assert.Equal(t, 10000, max)

	checkinSetting.Enabled = true
	assert.True(t, IsCheckinEnabled())
}

// ---------------------------------------------------------------------------
// quota_setting.go
// ---------------------------------------------------------------------------

func TestGetQuotaSetting_Default(t *testing.T) {
	orig := quotaSetting
	t.Cleanup(func() { quotaSetting = orig })

	quotaSetting = QuotaSetting{EnableFreeModelPreConsume: true}
	s := GetQuotaSetting()
	require.NotNil(t, s)
	assert.True(t, s.EnableFreeModelPreConsume)
}

// ---------------------------------------------------------------------------
// token_setting.go
// ---------------------------------------------------------------------------

func TestToken_GettersAndDefaults(t *testing.T) {
	orig := tokenSetting
	t.Cleanup(func() { tokenSetting = orig })

	tokenSetting = TokenSetting{MaxUserTokens: 1000}
	require.NotNil(t, GetTokenSetting())
	assert.Equal(t, 1000, GetMaxUserTokens())

	tokenSetting.MaxUserTokens = 42
	assert.Equal(t, 42, GetMaxUserTokens())
}

// ---------------------------------------------------------------------------
// payment_setting.go
// ---------------------------------------------------------------------------

func TestGetPaymentSetting_Default(t *testing.T) {
	orig := paymentSetting
	t.Cleanup(func() { paymentSetting = orig })

	paymentSetting = PaymentSetting{
		AmountOptions:            []int{10, 20, 50, 100, 200, 500},
		AmountDiscount:           map[int]float64{},
		ComplianceConfirmed:      false,
		ComplianceTermsVersion:   "",
	}
	s := GetPaymentSetting()
	require.NotNil(t, s)
	assert.Equal(t, []int{10, 20, 50, 100, 200, 500}, s.AmountOptions)
	// Default (unconfirmed + wrong version) must report compliance as false.
	assert.False(t, IsPaymentComplianceConfirmed())
}

func TestIsPaymentComplianceConfirmed_VersionGate(t *testing.T) {
	orig := paymentSetting
	t.Cleanup(func() { paymentSetting = orig })

	// Confirmed but stale version → not compliant (must match current version).
	paymentSetting = PaymentSetting{
		ComplianceConfirmed:      true,
		ComplianceTermsVersion:   "v0",
	}
	assert.False(t, IsPaymentComplianceConfirmed())

	// Confirmed with current version → compliant.
	paymentSetting.ComplianceTermsVersion = CurrentComplianceTermsVersion
	assert.True(t, IsPaymentComplianceConfirmed())

	// Confirmed with matching version but flag flipped off → not compliant.
	paymentSetting.ComplianceConfirmed = false
	assert.False(t, IsPaymentComplianceConfirmed())
}

// ---------------------------------------------------------------------------
// payment_setting_old.go — pay methods serialization
// ---------------------------------------------------------------------------

func TestPayMethods_RoundTripAndContains(t *testing.T) {
	orig := PayMethods
	t.Cleanup(func() { PayMethods = orig })

	// Default PayMethods contains alipay and wxpay.
	assert.True(t, ContainsPayMethod("alipay"))
	assert.True(t, ContainsPayMethod("wxpay"))
	assert.False(t, ContainsPayMethod("nonexistent"))

	// JSON round trip via the public helpers preserves the structure.
	jsonStr := PayMethods2JsonString()
	assert.Contains(t, jsonStr, "alipay")
	require.NoError(t, UpdatePayMethodsByJsonString(`[{"name":"Card","icon":"LuCreditCard","type":"custom1","min_topup":"50"}]`))
	assert.False(t, ContainsPayMethod("alipay"))
	assert.True(t, ContainsPayMethod("custom1"))
}

// ---------------------------------------------------------------------------
// channel_affinity_setting.go
// ---------------------------------------------------------------------------

func TestGetChannelAffinitySetting_DefaultRules(t *testing.T) {
	orig := channelAffinitySetting
	t.Cleanup(func() { channelAffinitySetting = orig })

	s := GetChannelAffinitySetting()
	require.NotNil(t, s)
	assert.True(t, s.Enabled)
	assert.True(t, s.SwitchOnSuccess)
	assert.Equal(t, 100_000, s.MaxEntries)
	assert.Equal(t, 3600, s.DefaultTTLSeconds)
	// Two default rules: codex cli trace + claude cli trace.
	require.Len(t, s.Rules, 2)
	assert.Equal(t, "codex cli trace", s.Rules[0].Name)
	assert.Equal(t, "claude cli trace", s.Rules[1].Name)
	// Pass-header templates carry the documented header lists.
	require.Contains(t, s.Rules[0].ParamOverrideTemplate, "operations")
	assert.True(t, s.Rules[0].SkipRetryOnFailure)
	assert.True(t, s.Rules[0].IncludeUsingGroup)
}

// ---------------------------------------------------------------------------
// operation_setting.go — automatic disable keywords
// ---------------------------------------------------------------------------

func TestAutomaticDisableKeywords_RoundTripLowercasesAndDedupsEmpty(t *testing.T) {
	orig := AutomaticDisableKeywords
	t.Cleanup(func() { AutomaticDisableKeywords = orig })

	// Blank lines and whitespace-only lines are dropped; entries are lowercased.
	AutomaticDisableKeywordsFromString("  Quota Exceeded  \n\n  permission DENIED  \n   ")
	// Each stored keyword is trimmed, lowercased, non-empty.
	for _, k := range AutomaticDisableKeywords {
		assert.NotEmpty(t, k)
		assert.Equal(t, k, toLowerASCII(k))
	}
	require.Contains(t, AutomaticDisableKeywords, "quota exceeded")
	require.Contains(t, AutomaticDisableKeywords, "permission denied")

	// ToString joins with newline.
	out := AutomaticDisableKeywordsToString()
	assert.Contains(t, out, "quota exceeded")
	assert.Contains(t, out, "permission denied")
}

func TestAutomaticDisableKeywords_EmptyInputClears(t *testing.T) {
	orig := AutomaticDisableKeywords
	t.Cleanup(func() { AutomaticDisableKeywords = orig })

	AutomaticDisableKeywordsFromString("")
	assert.Empty(t, AutomaticDisableKeywords)
	assert.Equal(t, "", AutomaticDisableKeywordsToString())
}

// ---------------------------------------------------------------------------
// status_code_ranges.go — ToString / FromString for both rule sets
// ---------------------------------------------------------------------------

func TestAutomaticDisableStatusCodes_RoundTrip(t *testing.T) {
	orig := AutomaticDisableStatusCodeRanges
	t.Cleanup(func() { AutomaticDisableStatusCodeRanges = orig })

	require.NoError(t, AutomaticDisableStatusCodesFromString("401,403,500-502"))
	// ToString produces a compact, sorted representation.
	assert.Equal(t, "401,403,500-502", AutomaticDisableStatusCodesToString())
}

func TestAutomaticDisableStatusCodes_FromStringInvalidErrors(t *testing.T) {
	orig := AutomaticDisableStatusCodeRanges
	t.Cleanup(func() { AutomaticDisableStatusCodeRanges = orig })

	assert.Error(t, AutomaticDisableStatusCodesFromString("foo,99"))
}

func TestAutomaticRetryStatusCodes_RoundTrip(t *testing.T) {
	orig := AutomaticRetryStatusCodeRanges
	t.Cleanup(func() { AutomaticRetryStatusCodeRanges = orig })

	require.NoError(t, AutomaticRetryStatusCodesFromString("429,503-504"))
	assert.Equal(t, "429,503-504", AutomaticRetryStatusCodesToString())
}

func TestAutomaticRetryStatusCodes_EmptyStringClears(t *testing.T) {
	orig := AutomaticRetryStatusCodeRanges
	t.Cleanup(func() { AutomaticRetryStatusCodeRanges = orig })

	require.NoError(t, AutomaticRetryStatusCodesFromString(""))
	assert.Empty(t, AutomaticRetryStatusCodeRanges)
	assert.Equal(t, "", AutomaticRetryStatusCodesToString())
}

func TestIsAlwaysSkipRetryCode_BadResponseBody(t *testing.T) {
	assert.True(t, IsAlwaysSkipRetryCode(types.ErrorCodeBadResponseBody))
	assert.False(t, IsAlwaysSkipRetryCode(types.ErrorCode("some-other-code")))
}

func TestShouldMatchStatusCodeRanges_OutOfBoundsNeverMatches(t *testing.T) {
	// HTTP status codes are 1xx-5xx; below/above must never match.
	assert.False(t, shouldMatchStatusCodeRanges([]StatusCodeRange{{Start: 100, End: 599}}, 99))
	assert.False(t, shouldMatchStatusCodeRanges([]StatusCodeRange{{Start: 100, End: 599}}, 600))
}

// ---------------------------------------------------------------------------
// tools.go — test-only helpers, nil-index fallback, gemini audio, gpt image1
// ---------------------------------------------------------------------------

func TestSetAndDeleteToolPriceForTest_RebuildIndex(t *testing.T) {
	preserveToolPrices(t)

	// SetToolPriceForTest injects and rebuilds so the read path sees it.
	SetToolPriceForTest("lookup_customer", 9.5)
	assert.InDelta(t, 9.5, GetToolPrice("lookup_customer"), 0.0001)

	// DeleteToolPriceForTest removes the override; with no hardcoded fallback
	// the price returns to 0.
	DeleteToolPriceForTest("lookup_customer")
	assert.InDelta(t, 0.0, GetToolPrice("lookup_customer"), 0.0001)
}

func TestGetToolPriceForModel_LongestPrefixWins(t *testing.T) {
	preserveToolPrices(t)
	toolPriceSetting.Prices = map[string]float64{
		"web_search_preview:gpt-4o*":      30,
		"web_search_preview:gpt-4o-mini*": 0,
	}
	RebuildToolPriceIndex()

	// gpt-4o-mini matches the longer, more specific prefix first.
	assert.InDelta(t, 0.0, GetToolPriceForModel("web_search_preview", "gpt-4o-mini-2024"), 0.0001)
	// gpt-4o matches the shorter prefix.
	assert.InDelta(t, 30.0, GetToolPriceForModel("web_search_preview", "gpt-4o"), 0.0001)
	// Empty model name skips prefix matching, falls back to default.
	assert.InDelta(t, 10.0, GetToolPriceForModel("web_search_preview", ""), 0.0001)
}

func TestGetGeminiInputAudioPricePerMillionTokens_ModelPrefixes(t *testing.T) {
	cases := []struct {
		model string
		want  float64
	}{
		{"gemini-2.5-flash-preview-native-audio", Gemini25FlashNativeAudioInputAudioPrice},
		{"gemini-2.5-flash-preview-lite-foo", Gemini25FlashLitePreviewInputAudioPrice},
		{"gemini-2.5-flash-preview-bar", Gemini25FlashPreviewInputAudioPrice},
		{"gemini-2.5-flash-baz", Gemini25FlashProductionInputAudioPrice},
		{"gemini-2.0-flash-quux", Gemini20FlashInputAudioPrice},
		{"gemini-robotics-er-1.5-preview", GeminiRoboticsER15InputAudioPrice},
		{"unknown-model", 0},
	}
	for _, c := range cases {
		t.Run(c.model, func(t *testing.T) {
			assert.InDelta(t, c.want, GetGeminiInputAudioPricePerMillionTokens(c.model), 0.0001)
		})
	}
}

func TestGetGPTImage1PriceOnceCall_QualityAndSizeMatrix(t *testing.T) {
	cases := []struct {
		name     string
		quality  string
		size     string
		want     float64
	}{
		{"low 1024x1024", "low", "1024x1024", GPTImage1Low1024x1024},
		{"low 1024x1536", "low", "1024x1536", GPTImage1Low1024x1536},
		{"medium 1536x1024", "medium", "1536x1024", GPTImage1Medium1536x1024},
		{"high 1024x1024", "high", "1024x1024", GPTImage1High1024x1024},
		{"high 1024x1536", "high", "1024x1536", GPTImage1High1024x1536},
		// Unknown quality/size falls back to the documented default.
		{"unknown quality", "ultra", "1024x1024", GPTImage1High1024x1024},
		{"unknown size", "high", "1x1", GPTImage1High1024x1024},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			assert.InDelta(t, c.want, GetGPTImage1PriceOnceCall(c.quality, c.size), 0.0001)
		})
	}
}

// toLowerASCII lowercases ASCII letters without importing strings (keeps the
// helper local to the test file for the keyword invariant check).
func toLowerASCII(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}
