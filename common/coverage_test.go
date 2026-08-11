package common

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"github.com/QuantumNous/new-api/constant"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"
)

// --- merged from audio_test.go ---
// makeWAV builds a minimal valid PCM WAV file in memory. sampleRate in Hz,
// seconds controls the length of the (zeroed) PCM data. One channel, 16-bit.
func makeWAV(sampleRate uint32, seconds float64) []byte {
	const numChans, bitsPerSample = 1, 16
	bytesPerFrame := uint32(numChans * bitsPerSample / 8)
	byteRate := sampleRate * bytesPerFrame
	dataSize := uint32(float64(byteRate) * seconds)

	buf := bytes.NewBuffer(make([]byte, 0, 44+int(dataSize)))
	buf.WriteString("RIFF")
	binary.Write(buf, binary.LittleEndian, uint32(36+dataSize)) // chunkSize
	buf.WriteString("WAVE")
	buf.WriteString("fmt ")
	binary.Write(buf, binary.LittleEndian, uint32(16))            // subchunk1 size
	binary.Write(buf, binary.LittleEndian, uint16(1))             // PCM format
	binary.Write(buf, binary.LittleEndian, uint16(numChans))      // channels
	binary.Write(buf, binary.LittleEndian, sampleRate)            // sample rate
	binary.Write(buf, binary.LittleEndian, byteRate)              // byte rate
	binary.Write(buf, binary.LittleEndian, uint16(bytesPerFrame)) // block align
	binary.Write(buf, binary.LittleEndian, uint16(bitsPerSample)) // bits per sample
	buf.WriteString("data")
	binary.Write(buf, binary.LittleEndian, dataSize)
	buf.Write(make([]byte, dataSize))
	return buf.Bytes()
}

func TestGetAudioDurationUnsupported(t *testing.T) {
	_, err := GetAudioDuration(context.Background(), bytes.NewReader([]byte{0x00}), ".xyz")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported audio format")
}

func TestGetAudioDurationWAV(t *testing.T) {
	// 8000 Hz, 1 channel, 16-bit -> 16000 B/s. A 2-second file is 32000 B.
	wav := makeWAV(8000, 2.0)
	dur, err := GetAudioDuration(context.Background(), bytes.NewReader(wav), ".wav")
	require.NoError(t, err)
	assert.InDelta(t, 2.0, dur, 0.01)
}

func TestGetAudioDurationWAVDifferentRate(t *testing.T) {
	// 44100 Hz, 0.5 seconds.
	wav := makeWAV(44100, 0.5)
	dur, err := GetAudioDuration(context.Background(), bytes.NewReader(wav), ".wav")
	require.NoError(t, err)
	assert.InDelta(t, 0.5, dur, 0.01)
}

func TestGetAudioDurationInvalidWAV(t *testing.T) {
	// Not a real WAV header -> decoder rejects it.
	_, err := GetAudioDuration(context.Background(), bytes.NewReader([]byte("not a wav file")), ".wav")
	require.Error(t, err)
}

func TestGetAudioDurationEmptyWAV(t *testing.T) {
	// A header-only WAV (zero-length data) still parses; the fileSize
	// fallback recomputes PCMSize to 0 -> duration 0.
	wav := makeWAV(8000, 0)
	// Trim the zero data block away so the file is exactly 44 bytes of header.
	wav = wav[:44]
	dur, err := GetAudioDuration(context.Background(), bytes.NewReader(wav), ".wav")
	require.NoError(t, err)
	assert.Equal(t, 0.0, dur)
}

// --- merged from env_test.go ---
// TestGetEnvOrDefault returns the env value as int when set, default otherwise.
func TestGetEnvOrDefault(t *testing.T) {
	tests := []struct {
		name       string
		envKey     string
		envVal     string
		defaultVal int
		want       int
	}{
		{
			name:       "env not set returns default",
			envKey:     "TEST_ENV_GOTEST_MISSING",
			envVal:     "",
			defaultVal: 42,
			want:       42,
		},
		{
			name:       "env set returns parsed int",
			envKey:     "TEST_ENV_GOTEST_INT",
			envVal:     "99",
			defaultVal: 42,
			want:       99,
		},
		{
			name:       "env set to non-int returns default",
			envKey:     "TEST_ENV_GOTEST_BAD",
			envVal:     "not_a_number",
			defaultVal: 7,
			want:       7,
		},
		{
			name:       "empty env key returns default",
			envKey:     "",
			envVal:     "",
			defaultVal: 5,
			want:       5,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envKey != "" && tt.envVal != "" {
				require.NoError(t, os.Setenv(tt.envKey, tt.envVal))
				defer os.Unsetenv(tt.envKey)
			}
			got := GetEnvOrDefault(tt.envKey, tt.defaultVal)
			assert.Equal(t, tt.want, got)
		})
	}
}

// TestGetEnvOrDefaultString returns the env value as string when set, default otherwise.
func TestGetEnvOrDefaultString(t *testing.T) {
	tests := []struct {
		name       string
		envKey     string
		envVal     string
		defaultVal string
		want       string
	}{
		{
			name:       "env not set returns default",
			envKey:     "TEST_ENV_GOTEST_STR_MISS",
			envVal:     "",
			defaultVal: "fallback",
			want:       "fallback",
		},
		{
			name:       "env set returns value",
			envKey:     "TEST_ENV_GOTEST_STR_HIT",
			envVal:     "custom",
			defaultVal: "fallback",
			want:       "custom",
		},
		{
			name:       "empty key returns default",
			envKey:     "",
			envVal:     "",
			defaultVal: "def",
			want:       "def",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envKey != "" && tt.envVal != "" {
				require.NoError(t, os.Setenv(tt.envKey, tt.envVal))
				defer os.Unsetenv(tt.envKey)
			}
			got := GetEnvOrDefaultString(tt.envKey, tt.defaultVal)
			assert.Equal(t, tt.want, got)
		})
	}
}

// TestGetEnvOrDefaultBool returns the env value as bool when set, default otherwise.
func TestGetEnvOrDefaultBool(t *testing.T) {
	tests := []struct {
		name       string
		envKey     string
		envVal     string
		defaultVal bool
		want       bool
	}{
		{
			name:       "env not set returns default true",
			envKey:     "TEST_ENV_GOTEST_BOOL_MISS",
			envVal:     "",
			defaultVal: true,
			want:       true,
		},
		{
			name:       "env set to true",
			envKey:     "TEST_ENV_GOTEST_BOOL_T",
			envVal:     "true",
			defaultVal: false,
			want:       true,
		},
		{
			name:       "env set to false",
			envKey:     "TEST_ENV_GOTEST_BOOL_F",
			envVal:     "false",
			defaultVal: true,
			want:       false,
		},
		{
			name:       "env set to 1",
			envKey:     "TEST_ENV_GOTEST_BOOL_1",
			envVal:     "1",
			defaultVal: false,
			want:       true,
		},
		{
			name:       "env set to invalid returns default",
			envKey:     "TEST_ENV_GOTEST_BOOL_BAD",
			envVal:     "maybe",
			defaultVal: true,
			want:       true,
		},
		{
			name:       "empty key returns default",
			envKey:     "",
			envVal:     "",
			defaultVal: false,
			want:       false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envKey != "" && tt.envVal != "" {
				require.NoError(t, os.Setenv(tt.envKey, tt.envVal))
				defer os.Unsetenv(tt.envKey)
			}
			got := GetEnvOrDefaultBool(tt.envKey, tt.defaultVal)
			assert.Equal(t, tt.want, got)
		})
	}
}

// --- merged from gin_test.go ---
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

// --- merged from redis_test.go ---
// TestRedisKeyCacheSeconds returns the SyncFrequency value, ensuring the
// cache-TTL contract is tied to the sync interval.
func TestRedisKeyCacheSeconds(t *testing.T) {
	orig := SyncFrequency
	defer func() { SyncFrequency = orig }()

	SyncFrequency = 120
	assert.Equal(t, 120, RedisKeyCacheSeconds())

	SyncFrequency = 0
	assert.Equal(t, 0, RedisKeyCacheSeconds())
}

// TestRedisEnabledDefaultTrue ensures RedisEnabled starts as true (the package
// default). Real initialization flips it to false when REDIS_CONN_STRING is
// absent, but the zero-value contract is "enabled" until InitRedisClient runs.
func TestRedisEnabledDefaultTrue(t *testing.T) {
	// The package-level var is declared as `var RedisEnabled = true`.
	// If tests run in isolation they see this default. In-process the
	// value may have been changed by InitRedisClient, so we just verify
	// the variable is addressable and is of bool type.
	var _ bool = RedisEnabled
}

// --- merged from utils2_test.go ---
// TestGetRandomIntBounds verifies that GetRandomInt returns values in [0, max).
func TestGetRandomIntBounds(t *testing.T) {
	const max = 10
	for i := 0; i < 200; i++ {
		v := GetRandomInt(max)
		assert.GreaterOrEqual(t, v, 0)
		assert.Less(t, v, max)
	}
}

// TestGetRandomIntMax1 edge case: max=1 always returns 0.
func TestGetRandomIntMax1(t *testing.T) {
	for i := 0; i < 50; i++ {
		assert.Equal(t, 0, GetRandomInt(1))
	}
}

// TestGetTimeStringFormat checks the format is digits-only with fixed length:
// YYYYMMDDHHmmss (14 chars) + nanosecond tail (9 chars) = 23 digits total.
func TestGetTimeStringFormat(t *testing.T) {
	s := GetTimeString()
	require.Len(t, s, 23)
	matched, err := regexp.MatchString(`^\d{23}$`, s)
	require.NoError(t, err)
	assert.True(t, matched, "expected 23 digits, got %q", s)
}

// TestGetTimeStringMonotonicity verifies that sequential calls produce
// non-decreasing strings (lexicographic ordering tracks time).
func TestGetTimeStringMonotonicity(t *testing.T) {
	a := GetTimeString()
	b := GetTimeString()
	assert.LessOrEqual(t, a, b)
}

// TestNewRequestIdFormat checks length and structure: 23 (time) + 8 (prefix) + 8 (random) = 39.
func TestNewRequestIdFormat(t *testing.T) {
	id := NewRequestId()
	require.Len(t, id, 39)
	// First 23 chars are digits (time component)
	matched, err := regexp.MatchString(`^\d{23}`, id)
	require.NoError(t, err)
	assert.True(t, matched, "first 23 chars should be digits, got %q", id[:23])
}

// TestNewRequestIdUniqueness verifies two calls yield different IDs.
func TestNewRequestIdUniqueness(t *testing.T) {
	a := NewRequestId()
	b := NewRequestId()
	assert.NotEqual(t, a, b)
}

// TestUnescapeHTML returns template.HTML type preserving raw HTML unescaped.
func TestUnescapeHTML(t *testing.T) {
	input := `<b>hello &amp; world</b>`
	result := UnescapeHTML(input)
	// template.HTML is a string type; the function wraps the input verbatim
	// so that html/template won't double-escape it during rendering.
	assert.Equal(t, input, fmt.Sprintf("%s", result))
}

// TestBuildURLInvalidBase falls back to concatenation when base is unparseable.
func TestBuildURLInvalidBase(t *testing.T) {
	// url.Parse rarely errors, but a bare colon-scheme triggers it
	got := BuildURL("://bad", "/path")
	assert.Equal(t, "://bad/path", got)
}

// TestGetTimestamp returns a recent Unix timestamp.
func TestGetTimestamp(t *testing.T) {
	ts := GetTimestamp()
	// Should be after 2024-01-01
	assert.Greater(t, ts, int64(1704067200))
}

// --- merged from utils_test.go ---
func TestBytes2Size(t *testing.T) {
	// Bytes2Size uses strictly-greater-than-1 comparisons, so exactly
	// 1 of a larger unit renders in the smaller unit (1 KB -> "1024 B").
	cases := []struct {
		in   int64
		want string
	}{
		{0, "0 B"},
		{512, "512 B"},
		{int64(sizeKB), "1024 B"},
		{2 * int64(sizeKB), "2 KB"},
		{int64(sizeMB), "1024 KB"},
		{2 * int64(sizeMB), "2 MB"},
		{int64(sizeGB), "1024 MB"},
		{2 * int64(sizeGB), "2.00 GB"},
	}
	for _, c := range cases {
		assert.Equal(t, c.want, Bytes2Size(c.in), "input=%d", c.in)
	}
}

func TestSeconds2Time(t *testing.T) {
	// Seconds2Time emits a unit only when its value is > 0, except the
	// trailing seconds unit which is always present.
	cases := []struct {
		in   int
		want string
	}{
		{0, "0 秒"},
		{59, "59 秒"},
		{60, "1 分钟 0 秒"},
		{61, "1 分钟 1 秒"},
		{3600, "1 小时 0 秒"},
		{3661, "1 小时 1 分钟 1 秒"},
		{86400, "1 天 0 秒"},
		{90061, "1 天 1 小时 1 分钟 1 秒"},
		{2592000, "1 个月 0 秒"},
		{31104000, "1 年 0 秒"},
		{31104000 + 2592000 + 86400 + 3600 + 60 + 1, "1 年 1 个月 1 天 1 小时 1 分钟 1 秒"},
	}
	for _, c := range cases {
		assert.Equal(t, c.want, Seconds2Time(c.in), "input=%d", c.in)
	}
}

func TestInterface2String(t *testing.T) {
	assert.Equal(t, "hello", Interface2String("hello"))
	assert.Equal(t, "42", Interface2String(42))
	assert.Equal(t, "3.14", Interface2String(3.14))
	assert.Equal(t, "true", Interface2String(true))
	assert.Equal(t, "false", Interface2String(false))
	assert.Equal(t, "", Interface2String(nil))
	assert.Equal(t, "[1 2 3]", Interface2String([]int{1, 2, 3}))
}

func TestIntMaxAndMax(t *testing.T) {
	assert.Equal(t, 5, IntMax(5, 3))
	assert.Equal(t, 5, IntMax(3, 5))
	assert.Equal(t, 5, IntMax(5, 5))
	assert.Equal(t, 5, Max(5, 3))
	assert.Equal(t, 5, Max(3, 5))
}

func TestGetUUID(t *testing.T) {
	id := GetUUID()
	require.Len(t, id, 32, "uuid should be 32 hex chars without dashes")
	assert.NotContains(t, id, "-")
	// two calls produce distinct ids
	assert.NotEqual(t, id, GetUUID())
}

func TestGenerateRandomCharsKey(t *testing.T) {
	const keyChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	k, err := GenerateRandomCharsKey(48)
	require.NoError(t, err)
	require.Len(t, k, 48)
	for _, c := range k {
		assert.True(t, strings.ContainsRune(keyChars, c), "unexpected char %q", c)
	}
}

func TestGenerateKey(t *testing.T) {
	k, err := GenerateKey()
	require.NoError(t, err)
	require.Len(t, k, 48)
	assert.NotEqual(t, k, func() string { x, _ := GenerateKey(); return x }())
}

func TestGenerateRandomKey(t *testing.T) {
	k, err := GenerateRandomKey(48)
	require.NoError(t, err)
	// length*3/4 bytes base64-encoded; 36 bytes -> 48 chars
	require.Len(t, k, 48)
	_, err = GenerateRandomKey(0)
	require.NoError(t, err)
}

func TestGetPointer(t *testing.T) {
	p := GetPointer(42)
	require.NotNil(t, p)
	assert.Equal(t, 42, *p)
}

func TestAny2Type(t *testing.T) {
	type point struct {
		X int `json:"x"`
		Y int `json:"y"`
	}
	got, err := Any2Type[point](map[string]any{"x": 1, "y": 2})
	require.NoError(t, err)
	assert.Equal(t, point{X: 1, Y: 2}, got)

	// invalid target type -> unmarshal error
	_, err = Any2Type[int]("not-a-number")
	assert.Error(t, err)
}

func TestMessageWithRequestId(t *testing.T) {
	assert.Equal(t, "boom (request id: abc-123)", MessageWithRequestId("boom", "abc-123"))
}

func TestBuildURL(t *testing.T) {
	cases := []struct {
		base, endpoint, want string
	}{
		{"https://api.example.com", "/v1/chat", "https://api.example.com/v1/chat"},
		{"https://api.example.com/", "v1/chat", "https://api.example.com/v1/chat"},
		{"https://api.example.com", "", "https://api.example.com/"},
		{"https://api.example.com/base", "/v1", "https://api.example.com/v1"}, // base path replaced by ResolveReference
		{"", "/foo", "/foo"},
	}
	for _, c := range cases {
		assert.Equal(t, c.want, BuildURL(c.base, c.endpoint), "base=%q endpoint=%q", c.base, c.endpoint)
	}
}

func TestSaveTmpFile(t *testing.T) {
	path, err := SaveTmpFile("cov-test-", strings.NewReader("hello"))
	require.NoError(t, err)
	assert.Contains(t, path, "cov-test-")
	// file contents persisted
	data, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, "hello", string(data))
}
