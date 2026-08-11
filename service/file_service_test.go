package service

import (
	"bytes"
	"encoding/base64"
	"image"
	"testing"

	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDetectFileType_ImageMime(t *testing.T) {
	tests := []struct {
		mime     string
		expected types.FileType
	}{
		{"image/png", types.FileTypeImage},
		{"image/jpeg", types.FileTypeImage},
		{"image/gif", types.FileTypeImage},
		{"image/webp", types.FileTypeImage},
		{"audio/mp3", types.FileTypeAudio},
		{"audio/wav", types.FileTypeAudio},
		{"video/mp4", types.FileTypeVideo},
		{"video/webm", types.FileTypeVideo},
		{"application/pdf", types.FileTypeFile},
		{"text/plain", types.FileTypeFile},
		{"", types.FileTypeFile},
	}
	for _, tt := range tests {
		t.Run(tt.mime, func(t *testing.T) {
			got := DetectFileType(tt.mime)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestGuessMimeTypeFromURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{"png extension", "https://example.com/image.png", "image/png"},
		{"jpg extension", "https://cdn.com/photo.jpg", "image/jpeg"},
		{"query params stripped", "https://example.com/file.gif?token=abc&size=large", "image/gif"},
		{"no extension", "https://example.com/noext", "application/octet-stream"},
		{"no path", "https://example.com/", "application/octet-stream"},
		{"mp3 audio", "https://cdn.com/audio.mp3", "audio/mp3"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := guessMimeTypeFromURL(tt.url)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestGetContextCacheKey_Deterministic(t *testing.T) {
	key1 := getContextCacheKey("https://example.com/img.png")
	key2 := getContextCacheKey("https://example.com/img.png")
	require.Equal(t, key1, key2, "same URL must produce same cache key")

	key3 := getContextCacheKey("https://example.com/other.png")
	require.NotEqual(t, key1, key3, "different URLs must produce different cache keys")
}

func TestGetBase64ContextCacheKey_UsesLengthAndPrefix(t *testing.T) {
	data := "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEND"
	key1 := getBase64ContextCacheKey(data, "image/png")
	key2 := getBase64ContextCacheKey(data, "image/png")
	require.Equal(t, key1, key2)

	// Different mime type -> different key
	key3 := getBase64ContextCacheKey(data, "image/jpeg")
	require.NotEqual(t, key1, key3)
}

func TestGetBase64ContextCacheKey_ShortData(t *testing.T) {
	// Short data (less than 128 chars) should still work
	key := getBase64ContextCacheKey("shortdata", "text/plain")
	require.NotEmpty(t, key)
}

func TestDecodeImageConfig_PNG(t *testing.T) {
	// Minimal valid 1x1 PNG
	pngData := createMinimalPNG(t)
	config, format, err := decodeImageConfig(pngData)
	require.NoError(t, err)
	assert.Equal(t, "png", format)
	assert.Equal(t, 1, config.Width)
	assert.Equal(t, 1, config.Height)
}

func TestDecodeImageConfig_InvalidData(t *testing.T) {
	_, _, err := decodeImageConfig([]byte("not an image"))
	require.Error(t, err)
}

func TestDetectHEIF_ValidHeic(t *testing.T) {
	// Minimal ftyp box with heic brand
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12 // box size = 12
	copy(data[4:8], "ftyp")
	copy(data[8:12], "heic")

	result := detectHEIF(data)
	assert.Equal(t, "image/heic", result)
}

func TestDetectHEIF_ValidMif1(t *testing.T) {
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12
	copy(data[4:8], "ftyp")
	copy(data[8:12], "mif1")

	result := detectHEIF(data)
	assert.Equal(t, "image/heif", result)
}

func TestDetectHEIF_NotHeif(t *testing.T) {
	// Not ftyp
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12
	copy(data[4:8], "moov")
	copy(data[8:12], "heic")

	result := detectHEIF(data)
	assert.Equal(t, "", result)
}

func TestDetectHEIF_TooShort(t *testing.T) {
	result := detectHEIF([]byte("short"))
	assert.Equal(t, "", result)
}

func TestDetectHEIF_UnknownBrand(t *testing.T) {
	data := make([]byte, 12)
	data[0] = 0
	data[1] = 0
	data[2] = 0
	data[3] = 12
	copy(data[4:8], "ftyp")
	copy(data[8:12], "isom")

	result := detectHEIF(data)
	assert.Equal(t, "", result)
}

func TestLoadFromBase64_PlainBase64(t *testing.T) {
	// Encode a minimal PNG as base64
	pngData := createMinimalPNG(t)
	b64 := base64.StdEncoding.EncodeToString(pngData)

	cached, err := loadFromBase64(b64, "image/png")
	require.NoError(t, err)
	require.NotNil(t, cached)
	assert.Equal(t, "image/png", cached.MimeType)
	assert.NotNil(t, cached.ImageConfig)
	assert.Equal(t, 1, cached.ImageConfig.Width)
	assert.Equal(t, 1, cached.ImageConfig.Height)
}

func TestLoadFromBase64_DataURIPrefix(t *testing.T) {
	pngData := createMinimalPNG(t)
	b64 := base64.StdEncoding.EncodeToString(pngData)
	dataURI := "data:image/png;base64," + b64

	cached, err := loadFromBase64(dataURI, "")
	require.NoError(t, err)
	require.NotNil(t, cached)
	// MIME from data URI header
	assert.Equal(t, "image/png", cached.MimeType)
}

func TestLoadFromBase64_ProvidedMimeOverrides(t *testing.T) {
	pngData := createMinimalPNG(t)
	b64 := base64.StdEncoding.EncodeToString(pngData)
	dataURI := "data:image/jpeg;base64," + b64

	// Provided mime should override the data URI header
	cached, err := loadFromBase64(dataURI, "image/custom")
	require.NoError(t, err)
	assert.Equal(t, "image/custom", cached.MimeType)
}

func TestLoadFromBase64_InvalidBase64(t *testing.T) {
	_, err := loadFromBase64("not-valid-base64!!!", "image/png")
	require.Error(t, err)
}

func TestLoadFileSource_NilSource(t *testing.T) {
	_, err := LoadFileSource(nil, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "file source is nil")
}

// createMinimalPNG creates a valid 1x1 RGBA PNG file.
func createMinimalPNG(t *testing.T) []byte {
	t.Helper()
	// Known minimal 1x1 white PNG (67 bytes)
	pngBytes := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
		0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth=8, RGB
		0xde,
		0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
		0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
		0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33,
		0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
		0xae, 0x42, 0x60, 0x82,
	}
	// Verify it actually decodes
	_, _, err := image.DecodeConfig(bytes.NewReader(pngBytes))
	require.NoError(t, err, "built-in PNG test data must be valid")
	return pngBytes
}
