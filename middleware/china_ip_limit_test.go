package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestChinaIPLimitBlocksChinaCountryHeader(t *testing.T) {
	router := newChinaIPLimitTestRouter(t, true, true, nil)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("CF-IPCountry", "CN")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "当前地区暂不支持访问")
	assert.Contains(t, w.Body.String(), chinaIPLimitAPIEndpoint)
}

func TestChinaIPLimitBlocksConfiguredCIDR(t *testing.T) {
	router := newChinaIPLimitTestRouter(t, true, false, []string{"1.2.3.0/24"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "1.2.3.4:12345"
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "403 Forbidden")
}

func TestChinaIPLimitBypassesRelayAPIPaths(t *testing.T) {
	router := newChinaIPLimitTestRouter(t, true, true, nil)

	req := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	req.Header.Set("CF-IPCountry", "CN")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestChinaIPLimitCanDisableTrustedGeoHeaders(t *testing.T) {
	router := newChinaIPLimitTestRouter(t, true, false, nil)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("CF-IPCountry", "CN")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func newChinaIPLimitTestRouter(t *testing.T, enabled bool, trustGeoHeaders bool, cidrs []string) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	originalEnabled := common.ChinaIPLimitEnabled
	originalTrustGeoHeaders := common.ChinaIPLimitTrustGeoHeaders
	originalCIDRs := common.ChinaIPLimitCIDRs

	common.ChinaIPLimitEnabled = enabled
	common.ChinaIPLimitTrustGeoHeaders = trustGeoHeaders
	common.ChinaIPLimitCIDRs = cidrs
	t.Cleanup(func() {
		common.ChinaIPLimitEnabled = originalEnabled
		common.ChinaIPLimitTrustGeoHeaders = originalTrustGeoHeaders
		common.ChinaIPLimitCIDRs = originalCIDRs
	})

	router := gin.New()
	router.Use(ChinaIPLimit())
	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/") {
			c.Status(http.StatusNoContent)
			return
		}
		c.Status(http.StatusNotFound)
	})
	return router
}
