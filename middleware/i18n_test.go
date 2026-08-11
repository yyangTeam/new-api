package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestDetectLanguageFromAcceptLanguageHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		acceptLanguage string
		expected       string
	}{
		{
			name:           "Chinese simplified",
			acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8",
			expected:       "zh-CN",
		},
		{
			name:           "English",
			acceptLanguage: "en-US,en;q=0.9",
			expected:       "en",
		},
		{
			name:           "empty header defaults to English",
			acceptLanguage: "",
			expected:       i18n.DefaultLang,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			req := httptest.NewRequest("GET", "/", nil)
			if tt.acceptLanguage != "" {
				req.Header.Set("Accept-Language", tt.acceptLanguage)
			}
			ctx.Request = req

			lang := detectLanguage(ctx)
			assert.Equal(t, tt.expected, lang)
		})
	}
}

func TestDetectLanguageFromUserSetting(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	ctx.Request = req
	// User setting takes priority over Accept-Language
	common.SetContextKey(ctx, constant.ContextKeyUserSetting, dto.UserSetting{Language: "zh-CN"})

	lang := detectLanguage(ctx)

	assert.Equal(t, "zh-CN", lang)
}

func TestGetLanguageDefaultsWhenNotSet(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())

	lang := GetLanguage(ctx)

	assert.Equal(t, i18n.DefaultLang, lang)
}

func TestGetLanguageReturnsSetValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set(string(constant.ContextKeyLanguage), "zh-TW")

	lang := GetLanguage(ctx)

	assert.Equal(t, "zh-TW", lang)
}
