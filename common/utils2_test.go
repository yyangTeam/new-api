package common

import (
	"fmt"
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
