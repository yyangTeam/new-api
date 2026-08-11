package common

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/constant"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestSetAndGetContextKeyString verifies round-trip for string context values.
func TestSetAndGetContextKeyString(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("test_string_key")
	SetContextKey(c, key, "hello")

	got := GetContextKeyString(c, key)
	assert.Equal(t, "hello", got)
}

// TestGetContextKeyStringMissing returns empty string for absent keys.
func TestGetContextKeyStringMissing(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	got := GetContextKeyString(c, constant.ContextKey("nonexistent"))
	assert.Equal(t, "", got)
}

// TestSetAndGetContextKeyInt verifies round-trip for int context values.
func TestSetAndGetContextKeyInt(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("test_int_key")
	SetContextKey(c, key, 42)

	got := GetContextKeyInt(c, key)
	assert.Equal(t, 42, got)
}

// TestSetAndGetContextKeyBool verifies round-trip for bool context values.
func TestSetAndGetContextKeyBool(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("test_bool_key")
	SetContextKey(c, key, true)

	got := GetContextKeyBool(c, key)
	assert.True(t, got)
}

// TestGetContextKeyBoolMissingIsFalse ensures absent bool keys default to false.
func TestGetContextKeyBoolMissingIsFalse(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	got := GetContextKeyBool(c, constant.ContextKey("missing"))
	assert.False(t, got)
}

// TestSetAndGetContextKeyTime verifies round-trip for time.Time context values.
func TestSetAndGetContextKeyTime(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("test_time_key")
	now := time.Now().Truncate(time.Second)
	SetContextKey(c, key, now)

	got := GetContextKeyTime(c, key)
	assert.Equal(t, now, got)
}

// TestSetAndGetContextKeyStringSlice verifies round-trip for string slice values.
func TestSetAndGetContextKeyStringSlice(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("test_slice_key")
	SetContextKey(c, key, []string{"a", "b", "c"})

	got := GetContextKeyStringSlice(c, key)
	assert.Equal(t, []string{"a", "b", "c"}, got)
}

// TestSetAndGetContextKeyStringMap verifies round-trip for map[string]any values.
func TestSetAndGetContextKeyStringMap(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("test_map_key")
	m := map[string]any{"foo": "bar"}
	SetContextKey(c, key, m)

	got := GetContextKeyStringMap(c, key)
	assert.Equal(t, m, got)
}

// TestGetContextKeyType verifies the generic typed getter.
func TestGetContextKeyType(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("typed_key")
	type myStruct struct {
		Val int
	}
	SetContextKey(c, key, myStruct{Val: 99})

	got, ok := GetContextKeyType[myStruct](c, key)
	require.True(t, ok)
	assert.Equal(t, 99, got.Val)

	// Wrong type returns false
	_, ok = GetContextKeyType[int](c, key)
	assert.False(t, ok)

	// Missing key returns false
	_, ok = GetContextKeyType[int](c, constant.ContextKey("missing"))
	assert.False(t, ok)
}

// TestGetContextKey verifies the raw (any, bool) getter.
func TestGetContextKey(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	key := constant.ContextKey("raw_key")
	SetContextKey(c, key, "value")

	val, exists := GetContextKey(c, key)
	assert.True(t, exists)
	assert.Equal(t, "value", val)

	_, exists = GetContextKey(c, constant.ContextKey("nope"))
	assert.False(t, exists)
}

// TestApiError writes a JSON error response with success=false.
func TestApiError(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	ApiError(c, errors.New("something broke"))

	assert.Equal(t, http.StatusOK, w.Code)
	body := w.Body.String()
	assert.Contains(t, body, `"success":false`)
	assert.Contains(t, body, `"message":"something broke"`)
}

// TestApiErrorMsg writes a JSON error response from a plain string.
func TestApiErrorMsg(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	ApiErrorMsg(c, "bad input")

	assert.Equal(t, http.StatusOK, w.Code)
	body := w.Body.String()
	assert.Contains(t, body, `"success":false`)
	assert.Contains(t, body, `"message":"bad input"`)
}

// TestApiSuccess writes a JSON success response with data.
func TestApiSuccess(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	ApiSuccess(c, map[string]int{"count": 5})

	assert.Equal(t, http.StatusOK, w.Code)
	body := w.Body.String()
	assert.Contains(t, body, `"success":true`)
	assert.Contains(t, body, `"count":5`)
}

// TestIsRequestBodyTooLargeError detects both sentinel and MaxBytesError.
func TestIsRequestBodyTooLargeError(t *testing.T) {
	assert.False(t, IsRequestBodyTooLargeError(nil))
	assert.False(t, IsRequestBodyTooLargeError(errors.New("random error")))
	assert.True(t, IsRequestBodyTooLargeError(ErrRequestBodyTooLarge))

	// Wrapped sentinel
	wrapped := errors.Wrap(ErrRequestBodyTooLarge, "context")
	assert.True(t, IsRequestBodyTooLargeError(wrapped))

	// http.MaxBytesError
	mbe := &http.MaxBytesError{Limit: 1024}
	assert.True(t, IsRequestBodyTooLargeError(mbe))
}

// TestParseBoundary extracts the multipart boundary from Content-Type header.
func TestParseBoundary(t *testing.T) {
	tests := []struct {
		name        string
		contentType string
		wantBound   string
		wantErr     bool
	}{
		{
			name:        "valid multipart",
			contentType: "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
			wantBound:   "----WebKitFormBoundary7MA4YWxkTrZu0gW",
		},
		{
			name:        "empty content type",
			contentType: "",
			wantErr:     true,
		},
		{
			name:        "no boundary param",
			contentType: "multipart/form-data",
			wantErr:     true,
		},
		{
			name:        "application/json has no boundary",
			contentType: "application/json",
			wantErr:     true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseBoundary(tt.contentType)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantBound, got)
			}
		})
	}
}

// TestParseFormData decodes URL-encoded form bodies into a struct.
func TestParseFormData(t *testing.T) {
	type target struct {
		Model  string `json:"model"`
		Stream string `json:"stream"`
	}

	data := []byte("model=gpt-4&stream=true")
	var out target
	err := parseFormData(data, &out)
	require.NoError(t, err)
	assert.Equal(t, "gpt-4", out.Model)
	assert.Equal(t, "true", out.Stream)
}

// TestParseFormDataMultipleValues handles repeated keys as arrays.
func TestParseFormDataMultipleValues(t *testing.T) {
	type target struct {
		Tags []string `json:"tags"`
	}

	data := []byte("tags=a&tags=b&tags=c")
	var out target
	err := parseFormData(data, &out)
	require.NoError(t, err)
	assert.Equal(t, []string{"a", "b", "c"}, out.Tags)
}

// TestMultipartMemoryLimit returns a positive memory limit.
func TestMultipartMemoryLimit(t *testing.T) {
	limit := multipartMemoryLimit()
	assert.Greater(t, limit, int64(0))
}
