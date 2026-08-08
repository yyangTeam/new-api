package i18n

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseAcceptLanguage(t *testing.T) {
	tests := []struct {
		name   string
		header string
		want   string
	}{
		{"empty header", "", LangEn},
		{"simple zh-CN", "zh-CN", LangZhCN},
		{"simple en", "en", LangEn},
		{"en-US", "en-US", LangEn},
		{"zh-TW", "zh-TW", LangZhTW},
		{"zh without region", "zh", LangZhCN},
		{"with quality value", "zh-CN;q=0.9", LangZhCN},
		{"multiple languages first wins", "zh-TW,en;q=0.9,zh-CN;q=0.8", LangZhTW},
		{"en first", "en,zh-CN;q=0.9", LangEn},
		{"with spaces", " zh-CN ", LangZhCN},
		{"unknown language defaults", "fr-FR,en;q=0.5", LangEn},
		{"ja defaults to en", "ja", LangEn},
		{"zh-tw lowercase", "zh-tw", LangZhTW},
		{"zh-Hant", "zh-Hant", LangZhCN},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseAcceptLanguage(tt.header)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestNormalizeLang(t *testing.T) {
	tests := []struct {
		name string
		lang string
		want string
	}{
		{"zh-CN", "zh-CN", LangZhCN},
		{"zh-cn lowercase", "zh-cn", LangZhCN},
		{"ZH-CN uppercase", "ZH-CN", LangZhCN},
		{"zh-TW", "zh-TW", LangZhTW},
		{"zh-tw lowercase", "zh-tw", LangZhTW},
		{"zh bare", "zh", LangZhCN},
		{"en", "en", LangEn},
		{"en-US", "en-US", LangEn},
		{"EN uppercase", "EN", LangEn},
		{"unknown language", "fr", LangEn},
		{"empty", "", LangEn},
		{"whitespace", "  zh-CN  ", LangZhCN},
		{"ja defaults", "ja", LangEn},
		{"ko defaults", "ko", LangEn},
		{"zh-tw-extra", "zh-tw-extra", LangZhTW},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeLang(tt.lang)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestIsSupported(t *testing.T) {
	tests := []struct {
		name string
		lang string
		want bool
	}{
		{"zh-CN supported", "zh-CN", true},
		{"zh-TW supported", "zh-TW", true},
		{"en supported", "en", true},
		{"en-US normalizes to en", "en-US", true},
		{"zh normalizes to zh-CN", "zh", true},
		{"fr not supported but normalizes to en", "fr", true},
		{"empty normalizes to en", "", true},
		{"ja normalizes to en", "ja", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsSupported(tt.lang)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestSupportedLanguages(t *testing.T) {
	langs := SupportedLanguages()
	assert.Contains(t, langs, LangZhCN)
	assert.Contains(t, langs, LangZhTW)
	assert.Contains(t, langs, LangEn)
	assert.Len(t, langs, 3)
}

func TestLanguageConstants(t *testing.T) {
	assert.Equal(t, "zh-CN", LangZhCN)
	assert.Equal(t, "zh-TW", LangZhTW)
	assert.Equal(t, "en", LangEn)
	assert.Equal(t, LangEn, DefaultLang)
}
