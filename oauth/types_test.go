package oauth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOAuthError_Error(t *testing.T) {
	e := &OAuthError{MsgKey: "msg.key", RawError: "raw error detail"}
	assert.Equal(t, "raw error detail", e.Error())
}

func TestOAuthError_ErrorFallbackToMsgKey(t *testing.T) {
	e := &OAuthError{MsgKey: "msg.key"}
	assert.Equal(t, "msg.key", e.Error())
}

func TestNewOAuthError(t *testing.T) {
	e := NewOAuthError("msg.key", map[string]any{"Provider": "GitHub"})
	require.NotNil(t, e)
	assert.Equal(t, "msg.key", e.MsgKey)
	assert.Equal(t, "GitHub", e.Params["Provider"])
	assert.Empty(t, e.RawError)
}

func TestNewOAuthErrorWithRaw(t *testing.T) {
	e := NewOAuthErrorWithRaw("msg.key", map[string]any{"Provider": "Discord"}, "underlying error")
	require.NotNil(t, e)
	assert.Equal(t, "msg.key", e.MsgKey)
	assert.Equal(t, "Discord", e.Params["Provider"])
	assert.Equal(t, "underlying error", e.RawError)
	assert.Equal(t, "underlying error", e.Error())
}

func TestAccessDeniedError(t *testing.T) {
	e := &AccessDeniedError{Message: "access denied"}
	assert.Equal(t, "access denied", e.Error())
}

func TestTrustLevelError(t *testing.T) {
	e := &TrustLevelError{Required: 3, Current: 1}
	assert.Equal(t, "trust level too low", e.Error())
	assert.Equal(t, 3, e.Required)
	assert.Equal(t, 1, e.Current)
}
