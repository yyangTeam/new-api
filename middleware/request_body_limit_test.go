package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadAnonymousRequestBodyUnderLimit(t *testing.T) {
	body := []byte("hello world")
	result, err := readAnonymousRequestBody(bytes.NewReader(body), 1024)

	require.NoError(t, err)
	assert.Equal(t, body, result)
}

func TestReadAnonymousRequestBodyExactLimit(t *testing.T) {
	body := []byte("12345")
	result, err := readAnonymousRequestBody(bytes.NewReader(body), 5)

	require.NoError(t, err)
	assert.Equal(t, body, result)
}

func TestReadAnonymousRequestBodyExceedsLimit(t *testing.T) {
	body := []byte("123456")
	_, err := readAnonymousRequestBody(bytes.NewReader(body), 5)

	require.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "too large") || err.Error() == "request body too large")
}

func TestReadAnonymousRequestBodyEmpty(t *testing.T) {
	result, err := readAnonymousRequestBody(bytes.NewReader(nil), 1024)

	require.NoError(t, err)
	assert.Empty(t, result)
}

func TestReadAnonymousRequestBodyReaderError(t *testing.T) {
	_, err := readAnonymousRequestBody(&errorReader{}, 1024)

	require.Error(t, err)
}

type errorReader struct{}

func (e *errorReader) Read(p []byte) (n int, err error) {
	return 0, io.ErrUnexpectedEOF
}

func TestAnonymousRequestBodyLimitMiddlewarePassesUnderLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Set a known limit for testing (512KB by default if env not set)
	previousValue := constant.AnonymousRequestBodyLimitKB
	constant.AnonymousRequestBodyLimitKB = 1 // 1KB = 1024 bytes
	t.Cleanup(func() { constant.AnonymousRequestBodyLimitKB = previousValue })

	router := gin.New()
	router.POST("/upload", AnonymousRequestBodyLimit(), func(c *gin.Context) {
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		c.String(http.StatusOK, string(body))
	})

	smallBody := strings.Repeat("a", 512)
	request := httptest.NewRequest(http.MethodPost, "/upload", strings.NewReader(smallBody))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusOK, response.Code)
	assert.Equal(t, smallBody, response.Body.String())
}

func TestAnonymousRequestBodyLimitMiddlewareRejectsOverLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousValue := constant.AnonymousRequestBodyLimitKB
	constant.AnonymousRequestBodyLimitKB = 1 // 1KB = 1024 bytes
	t.Cleanup(func() { constant.AnonymousRequestBodyLimitKB = previousValue })

	router := gin.New()
	router.POST("/upload", AnonymousRequestBodyLimit(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	largeBody := strings.Repeat("a", 2048)
	request := httptest.NewRequest(http.MethodPost, "/upload", strings.NewReader(largeBody))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusRequestEntityTooLarge, response.Code)
}

func TestAnonymousRequestBodyLimitMiddlewareDisabledWhenZero(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousValue := constant.AnonymousRequestBodyLimitKB
	constant.AnonymousRequestBodyLimitKB = 0 // disabled
	t.Cleanup(func() { constant.AnonymousRequestBodyLimitKB = previousValue })

	router := gin.New()
	router.POST("/upload", AnonymousRequestBodyLimit(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	largeBody := strings.Repeat("a", 10000)
	request := httptest.NewRequest(http.MethodPost, "/upload", strings.NewReader(largeBody))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusOK, response.Code)
}

func TestAnonymousRequestBodyLimitMiddlewareNilBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousValue := constant.AnonymousRequestBodyLimitKB
	constant.AnonymousRequestBodyLimitKB = 1
	t.Cleanup(func() { constant.AnonymousRequestBodyLimitKB = previousValue })

	router := gin.New()
	router.POST("/upload", AnonymousRequestBodyLimit(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodPost, "/upload", nil)
	request.Body = nil
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusOK, response.Code)
}
