package common

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
