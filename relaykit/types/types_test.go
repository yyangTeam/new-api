package types

import (
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// NewAPIError construction and Error() method
// ---------------------------------------------------------------------------

func TestNewError_Basic(t *testing.T) {
	err := NewError(errors.New("something went wrong"), ErrorCodeBadResponseBody)
	require.NotNil(t, err)
	assert.Equal(t, "something went wrong", err.Error())
	assert.Equal(t, ErrorCodeBadResponseBody, err.GetErrorCode())
	assert.Equal(t, ErrorTypeNewAPIError, err.GetErrorType())
	assert.Equal(t, http.StatusInternalServerError, err.StatusCode)
}

func TestNewError_NilError(t *testing.T) {
	var e *NewAPIError
	assert.Equal(t, "", e.Error())
	assert.Equal(t, ErrorCode(""), e.GetErrorCode())
	assert.Equal(t, ErrorType(""), e.GetErrorType())
}

func TestNewAPIError_ErrorFallback(t *testing.T) {
	// When Err is nil, Error() should fall back to errorCode string
	e := &NewAPIError{
		errorCode: ErrorCodeBadResponseBody,
	}
	assert.Equal(t, string(ErrorCodeBadResponseBody), e.Error())
}

func TestNewError_PreservesWrappedNewAPIError(t *testing.T) {
	inner := NewError(errors.New("inner"), ErrorCodeDoRequestFailed)
	// Wrapping a NewAPIError with another error that wraps it
	wrapped := errors.New("outer: " + inner.Error())
	_ = wrapped
	// Direct wrapping via errors.As path
	outer := NewError(inner, ErrorCodeBadResponseBody)
	// Should return the inner error preserved
	assert.Equal(t, ErrorCodeDoRequestFailed, outer.GetErrorCode())
}

func TestNewOpenAIError(t *testing.T) {
	err := NewOpenAIError(errors.New("test error"), ErrorCodeBadResponseBody, http.StatusBadGateway)
	require.NotNil(t, err)
	assert.Equal(t, http.StatusBadGateway, err.StatusCode)
	assert.Equal(t, ErrorTypeOpenAIError, err.GetErrorType())

	openaiErr := err.ToOpenAIError()
	assert.Contains(t, openaiErr.Message, "test error")
}

func TestNewErrorWithStatusCode(t *testing.T) {
	err := NewErrorWithStatusCode(errors.New("not found"), ErrorCodeModelNotFound, http.StatusNotFound)
	assert.Equal(t, http.StatusNotFound, err.StatusCode)
	assert.Equal(t, ErrorCodeModelNotFound, err.GetErrorCode())
	assert.Equal(t, "not found", err.Error())
}

// ---------------------------------------------------------------------------
// ErrorWithStatusCode formatting
// ---------------------------------------------------------------------------

func TestErrorWithStatusCode_Formatting(t *testing.T) {
	tests := []struct {
		name       string
		err        *NewAPIError
		wantSubstr string
	}{
		{
			name:       "nil error",
			err:        nil,
			wantSubstr: "",
		},
		{
			name: "with status code and message",
			err: &NewAPIError{
				Err:        errors.New("bad thing"),
				StatusCode: 502,
				errorCode:  ErrorCodeBadResponse,
			},
			wantSubstr: "status_code=502",
		},
		{
			name: "zero status code",
			err: &NewAPIError{
				Err:       errors.New("oops"),
				errorCode: ErrorCodeBadResponse,
			},
			wantSubstr: "oops",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.err.ErrorWithStatusCode()
			if tc.wantSubstr == "" {
				assert.Equal(t, "", result)
			} else {
				assert.Contains(t, result, tc.wantSubstr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Unwrap for errors.Is / errors.As
// ---------------------------------------------------------------------------

func TestNewAPIError_Unwrap(t *testing.T) {
	sentinel := errors.New("sentinel")
	apiErr := NewError(sentinel, ErrorCodeDoRequestFailed)
	assert.True(t, errors.Is(apiErr, sentinel))
}

func TestNewAPIError_Unwrap_Nil(t *testing.T) {
	var e *NewAPIError
	assert.Nil(t, e.Unwrap())
}

// ---------------------------------------------------------------------------
// ToOpenAIError / ToClaudeError conversion
// ---------------------------------------------------------------------------

func TestWithOpenAIError_Conversion(t *testing.T) {
	oaiErr := OpenAIError{
		Message: "rate limit exceeded",
		Type:    "rate_limit_error",
		Code:    "rate_limit",
	}
	apiErr := WithOpenAIError(oaiErr, http.StatusTooManyRequests)
	assert.Equal(t, http.StatusTooManyRequests, apiErr.StatusCode)
	assert.Equal(t, ErrorTypeOpenAIError, apiErr.GetErrorType())
	assert.Equal(t, ErrorCode("rate_limit"), apiErr.GetErrorCode())

	converted := apiErr.ToOpenAIError()
	assert.Contains(t, converted.Message, "rate limit")
}

func TestWithClaudeError_Conversion(t *testing.T) {
	claudeErr := ClaudeError{
		Type:    "overloaded_error",
		Message: "Overloaded",
	}
	apiErr := WithClaudeError(claudeErr, http.StatusServiceUnavailable)
	assert.Equal(t, http.StatusServiceUnavailable, apiErr.StatusCode)
	assert.Equal(t, ErrorTypeClaudeError, apiErr.GetErrorType())

	converted := apiErr.ToClaudeError()
	assert.Equal(t, "overloaded_error", converted.Type)
	assert.Contains(t, converted.Message, "Overloaded")
}

func TestNewAPIError_ToOpenAIError_DefaultType(t *testing.T) {
	apiErr := NewError(errors.New("generic"), ErrorCodeBadResponseBody)
	oai := apiErr.ToOpenAIError()
	assert.Equal(t, string(ErrorTypeNewAPIError), oai.Type)
}

func TestNewAPIError_ToClaudeError_FromOpenAI(t *testing.T) {
	oaiErr := OpenAIError{
		Message: "invalid model",
		Type:    "invalid_request_error",
		Code:    "model_not_found",
	}
	apiErr := WithOpenAIError(oaiErr, http.StatusBadRequest)
	claude := apiErr.ToClaudeError()
	assert.Contains(t, claude.Message, "invalid model")
	assert.Equal(t, "model_not_found", claude.Type)
}

// ---------------------------------------------------------------------------
// WithOpenAIError edge cases
// ---------------------------------------------------------------------------

func TestWithOpenAIError_NilCode(t *testing.T) {
	oaiErr := OpenAIError{
		Message: "unknown",
		Type:    "",
		Code:    nil,
	}
	apiErr := WithOpenAIError(oaiErr, 500)
	assert.Equal(t, ErrorCode("unknown_error"), apiErr.GetErrorCode())
	assert.Equal(t, "upstream_error", apiErr.ToOpenAIError().Type)
}

func TestWithOpenAIError_NumericCode(t *testing.T) {
	oaiErr := OpenAIError{
		Message: "error",
		Type:    "server_error",
		Code:    float64(500),
	}
	apiErr := WithOpenAIError(oaiErr, 500)
	assert.Equal(t, ErrorCode("500"), apiErr.GetErrorCode())
}

// ---------------------------------------------------------------------------
// IsChannelError / IsSkipRetryError
// ---------------------------------------------------------------------------

func TestIsChannelError(t *testing.T) {
	tests := []struct {
		code ErrorCode
		want bool
	}{
		{ErrorCodeChannelNoAvailableKey, true},
		{ErrorCodeChannelAwsClientError, true},
		{ErrorCodeBadResponseBody, false},
		{ErrorCodeDoRequestFailed, false},
	}
	for _, tc := range tests {
		t.Run(string(tc.code), func(t *testing.T) {
			e := &NewAPIError{errorCode: tc.code}
			assert.Equal(t, tc.want, IsChannelError(e))
		})
	}
	assert.False(t, IsChannelError(nil))
}

func TestIsSkipRetryError(t *testing.T) {
	assert.False(t, IsSkipRetryError(nil))

	e := NewError(errors.New("skip"), ErrorCodeBadResponseBody, ErrOptionWithSkipRetry())
	assert.True(t, IsSkipRetryError(e))

	e2 := NewError(errors.New("retry ok"), ErrorCodeBadResponseBody)
	assert.False(t, IsSkipRetryError(e2))
}

// ---------------------------------------------------------------------------
// Error options
// ---------------------------------------------------------------------------

func TestErrOptionWithStatusCode(t *testing.T) {
	e := NewError(errors.New("err"), ErrorCodeBadResponseBody, ErrOptionWithStatusCode(http.StatusGatewayTimeout))
	assert.Equal(t, http.StatusGatewayTimeout, e.StatusCode)
}

func TestErrOptionWithNoRecordErrorLog(t *testing.T) {
	e := NewError(errors.New("err"), ErrorCodeBadResponseBody, ErrOptionWithNoRecordErrorLog())
	assert.False(t, IsRecordErrorLog(e))
}

func TestIsRecordErrorLog_Default(t *testing.T) {
	e := NewError(errors.New("err"), ErrorCodeBadResponseBody)
	assert.True(t, IsRecordErrorLog(e))
	assert.False(t, IsRecordErrorLog(nil))
}

func TestErrOptionWithHideErrMsg(t *testing.T) {
	e := NewError(errors.New("secret details"), ErrorCodeBadResponseBody, ErrOptionWithHideErrMsg("hidden"))
	assert.Equal(t, "hidden", e.Error())
}

// ---------------------------------------------------------------------------
// InitOpenAIError
// ---------------------------------------------------------------------------

func TestInitOpenAIError(t *testing.T) {
	e := InitOpenAIError(ErrorCodeInvalidRequest, http.StatusBadRequest)
	require.NotNil(t, e)
	assert.Equal(t, http.StatusBadRequest, e.StatusCode)
	assert.Equal(t, ErrorTypeOpenAIError, e.GetErrorType())
}

// ---------------------------------------------------------------------------
// ChannelError construction
// ---------------------------------------------------------------------------

func TestNewChannelError(t *testing.T) {
	ce := NewChannelError(1, 2, "test-channel", true, "sk-xxx", false)
	require.NotNil(t, ce)
	assert.Equal(t, 1, ce.ChannelId)
	assert.Equal(t, 2, ce.ChannelType)
	assert.Equal(t, "test-channel", ce.ChannelName)
	assert.True(t, ce.IsMultiKey)
	assert.Equal(t, "sk-xxx", ce.UsingKey)
	assert.False(t, ce.AutoBan)
}

// ---------------------------------------------------------------------------
// RelayFormat constants
// ---------------------------------------------------------------------------

func TestRelayFormat_Values(t *testing.T) {
	// Ensure key relay format constants have expected string values
	assert.Equal(t, RelayFormat("openai"), RelayFormatOpenAI)
	assert.Equal(t, "claude", string(RelayFormatClaude))
	assert.Equal(t, "gemini", string(RelayFormatGemini))
	assert.Equal(t, "openai_responses", string(RelayFormatOpenAIResponses))
}

// ---------------------------------------------------------------------------
// EndpointType constants
// ---------------------------------------------------------------------------

func TestEndpointType_Values(t *testing.T) {
	assert.Equal(t, EndpointType("openai"), EndpointTypeOpenAI)
	assert.Equal(t, EndpointType("anthropic"), EndpointTypeAnthropic)
	assert.Equal(t, EndpointType("gemini"), EndpointTypeGemini)
}

// ---------------------------------------------------------------------------
// FinishReason vars (addressable)
// ---------------------------------------------------------------------------

func TestFinishReason_Addressable(t *testing.T) {
	// These are vars so that relay code can take &FinishReasonStop as *string
	ptr := &FinishReasonStop
	assert.Equal(t, "stop", *ptr)
	ptr2 := &FinishReasonToolCalls
	assert.Equal(t, "tool_calls", *ptr2)
}

// ---------------------------------------------------------------------------
// FileSource implementations
// ---------------------------------------------------------------------------

func TestURLSource(t *testing.T) {
	src := NewURLFileSource("https://example.com/image.png")
	assert.True(t, src.IsURL())
	assert.Equal(t, "https://example.com/image.png", src.GetRawData())
	assert.Equal(t, "https://example.com/image.png", src.GetIdentifier())

	// ClearRawData is a no-op for URL sources
	src.ClearRawData()
	assert.Equal(t, "https://example.com/image.png", src.GetRawData())
}

func TestURLSource_LongURL(t *testing.T) {
	longURL := "https://example.com/" + string(make([]byte, 200))
	src := NewURLFileSource(longURL)
	id := src.GetIdentifier()
	assert.LessOrEqual(t, len(id), 104) // 100 + "..."
	assert.Contains(t, id, "...")
}

func TestBase64Source(t *testing.T) {
	src := NewBase64FileSource("SGVsbG8=", "image/png")
	assert.False(t, src.IsURL())
	assert.Equal(t, "SGVsbG8=", src.GetRawData())
	assert.Contains(t, src.GetIdentifier(), "base64:")
}

func TestBase64Source_ClearRawData_LargeData(t *testing.T) {
	largeData := string(make([]byte, 2048))
	src := NewBase64FileSource(largeData, "image/jpeg")
	src.ClearRawData()
	assert.Equal(t, "", src.GetRawData())
}

func TestBase64Source_ClearRawData_SmallData(t *testing.T) {
	src := NewBase64FileSource("small", "text/plain")
	src.ClearRawData()
	// Small data should not be cleared
	assert.Equal(t, "small", src.GetRawData())
}

func TestNewFileSourceFromData(t *testing.T) {
	tests := []struct {
		name   string
		data   string
		isURL  bool
	}{
		{"http url", "http://example.com/file", true},
		{"https url", "https://example.com/file", true},
		{"base64 data", "aGVsbG8=", false},
		{"random string", "not-a-url", false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			src := NewFileSourceFromData(tc.data, "application/octet-stream")
			assert.Equal(t, tc.isURL, src.IsURL())
		})
	}
}

// ---------------------------------------------------------------------------
// CachedFileData
// ---------------------------------------------------------------------------

func TestCachedFileData_Memory(t *testing.T) {
	cd := NewMemoryCachedData("base64content", "image/png", 1024)
	assert.False(t, cd.IsDisk())

	data, err := cd.GetBase64Data()
	require.NoError(t, err)
	assert.Equal(t, "base64content", data)

	// Close clears memory data
	err = cd.Close()
	require.NoError(t, err)
	data, err = cd.GetBase64Data()
	require.NoError(t, err)
	assert.Equal(t, "", data)
}

func TestCachedFileData_SetBase64Data(t *testing.T) {
	cd := NewMemoryCachedData("original", "text/plain", 100)
	cd.SetBase64Data("updated")
	data, err := cd.GetBase64Data()
	require.NoError(t, err)
	assert.Equal(t, "updated", data)
}

func TestBaseFileSource_CacheOperations(t *testing.T) {
	src := NewURLFileSource("https://example.com/test")

	assert.False(t, src.HasCache())
	assert.Nil(t, src.GetCache())

	cache := NewMemoryCachedData("cached", "image/png", 512)
	src.SetCache(cache)
	assert.True(t, src.HasCache())
	assert.Same(t, cache, src.GetCache())

	src.ClearCache()
	assert.False(t, src.HasCache())
}

func TestBaseFileSource_RegisteredState(t *testing.T) {
	src := NewBase64FileSource("data", "text/plain")
	assert.False(t, src.IsRegistered())
	src.SetRegistered(true)
	assert.True(t, src.IsRegistered())
}

func TestBaseFileSource_Mutex(t *testing.T) {
	src := NewURLFileSource("https://example.com")
	mu := src.Mu()
	require.NotNil(t, mu)
	// Verify it can be locked/unlocked
	mu.Lock()
	mu.Unlock()
}

// ---------------------------------------------------------------------------
// FileMeta
// ---------------------------------------------------------------------------

func TestFileMeta_NewFileMeta(t *testing.T) {
	src := NewURLFileSource("https://example.com/audio.mp3")
	fm := NewFileMeta(FileTypeAudio, src)
	assert.Equal(t, FileTypeAudio, fm.FileType)
	assert.True(t, fm.IsURL())
	assert.Equal(t, "https://example.com/audio.mp3", fm.GetRawData())
}

func TestFileMeta_NewImageFileMeta(t *testing.T) {
	src := NewBase64FileSource("imgdata", "image/jpeg")
	fm := NewImageFileMeta(src, "high")
	assert.Equal(t, FileTypeImage, fm.FileType)
	assert.Equal(t, "high", fm.Detail)
	assert.False(t, fm.IsURL())
}

func TestFileMeta_NilSource(t *testing.T) {
	fm := &FileMeta{FileType: FileTypeFile}
	assert.Equal(t, "unknown", fm.GetIdentifier())
	assert.False(t, fm.IsURL())
	assert.Equal(t, "", fm.GetRawData())
}
