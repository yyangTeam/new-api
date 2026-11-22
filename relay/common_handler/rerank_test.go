package common_handler

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ---------------------------------------------------------------------------
// RerankHandler — standard Jina-compatible response
// ---------------------------------------------------------------------------

func TestRerankHandler_StandardJinaResponse(t *testing.T) {
	responseBody := `{
		"results": [
			{"index": 0, "relevance_score": 0.95, "document": {"text": "doc1"}},
			{"index": 1, "relevance_score": 0.80, "document": {"text": "doc2"}}
		],
		"usage": {"total_tokens": 150, "prompt_tokens": 0}
	}`

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(responseBody)),
		Header:     make(http.Header),
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/rerank", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelType: 0, // not Xinference
	}

	usage, apiErr := RerankHandler(c, info, resp)
	require.Nil(t, apiErr)
	require.NotNil(t, usage)
	// Jina path sets PromptTokens = TotalTokens
	assert.Equal(t, 150, usage.PromptTokens)
	assert.Equal(t, 150, usage.TotalTokens)

	// Verify response was written
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
}

// ---------------------------------------------------------------------------
// RerankHandler — Xinference response conversion
// ---------------------------------------------------------------------------

func TestRerankHandler_XinferenceResponse(t *testing.T) {
	responseBody := `{
		"results": [
			{"index": 0, "relevance_score": 0.92, "document": "document text 0"},
			{"index": 1, "relevance_score": 0.75, "document": ""}
		]
	}`

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(responseBody)),
		Header:     make(http.Header),
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/rerank", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelType: constant.ChannelTypeXinference,
	}
	info.RerankerInfo = &relaycommon.RerankerInfo{
		ReturnDocuments: true,
		Documents:       []any{"original doc 0", "original doc 1"},
	}

	usage, apiErr := RerankHandler(c, info, resp)
	require.Nil(t, apiErr)
	require.NotNil(t, usage)
	// Xinference path uses estimate prompt tokens (0 by default for new RelayInfo)
	assert.Equal(t, 0, usage.PromptTokens)
	assert.Equal(t, 0, usage.TotalTokens)

	// Response body should contain the converted results
	body := w.Body.String()
	assert.Contains(t, body, "relevance_score")
	// document at index 0 should be the actual text (non-empty string)
	assert.Contains(t, body, "document text 0")
	// document at index 1 has empty string → should use fallback from Documents
	assert.Contains(t, body, "original doc 1")
}

func TestRerankHandler_XinferenceNoReturnDocuments(t *testing.T) {
	responseBody := `{
		"results": [
			{"index": 0, "relevance_score": 0.88, "document": "some text"}
		]
	}`

	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(responseBody)),
		Header:     make(http.Header),
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/rerank", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelType: constant.ChannelTypeXinference,
	}
	info.RerankerInfo = &relaycommon.RerankerInfo{
		ReturnDocuments: false,
	}

	usage, apiErr := RerankHandler(c, info, resp)
	require.Nil(t, apiErr)
	require.NotNil(t, usage)

	// When ReturnDocuments is false, document fields should be nil in output
	body := w.Body.String()
	// The JSON should still have results but no document content
	assert.Contains(t, body, "relevance_score")
}

// ---------------------------------------------------------------------------
// RerankHandler — invalid response body
// ---------------------------------------------------------------------------

func TestRerankHandler_InvalidJSON(t *testing.T) {
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(`not valid json`)),
		Header:     make(http.Header),
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/rerank", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelType: 0,
	}

	usage, apiErr := RerankHandler(c, info, resp)
	assert.Nil(t, usage)
	require.NotNil(t, apiErr)
	assert.Equal(t, http.StatusInternalServerError, apiErr.StatusCode)
}

func TestRerankHandler_InvalidJSON_Xinference(t *testing.T) {
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(`{broken`)),
		Header:     make(http.Header),
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/rerank", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{
		ChannelType: constant.ChannelTypeXinference,
	}
	info.RerankerInfo = &relaycommon.RerankerInfo{}

	usage, apiErr := RerankHandler(c, info, resp)
	assert.Nil(t, usage)
	require.NotNil(t, apiErr)
}

// ---------------------------------------------------------------------------
// RerankHandler — read body error
// ---------------------------------------------------------------------------

func TestRerankHandler_ReadBodyError(t *testing.T) {
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(&errorReader{}),
		Header:     make(http.Header),
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/rerank", nil)

	info := &relaycommon.RelayInfo{}
	info.ChannelMeta = &relaycommon.ChannelMeta{}

	usage, apiErr := RerankHandler(c, info, resp)
	assert.Nil(t, usage)
	require.NotNil(t, apiErr)
	assert.Equal(t, http.StatusInternalServerError, apiErr.StatusCode)
}

// errorReader always returns an error on Read
type errorReader struct{}

func (e *errorReader) Read(p []byte) (n int, err error) {
	return 0, errors.New("simulated read error")
}
