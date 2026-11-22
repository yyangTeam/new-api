package oauth

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOAuthError_Error(t *testing.T) {
	e := &OAuthError{Message: common.NewMessage("msg.key"), RawError: "raw error detail"}
	assert.Equal(t, "raw error detail", e.Error())
}

func TestOAuthError_ErrorFallbackToMsgKey(t *testing.T) {
	e := &OAuthError{Message: common.NewMessage("msg.key")}
	assert.Equal(t, "msg.key", e.Error())
}

func TestNewOAuthError(t *testing.T) {
	e := NewOAuthError(common.NewMessage("msg.key", map[string]any{"provider": "GitHub"}))
	require.NotNil(t, e)
	require.NotNil(t, e.Message)
	assert.Equal(t, "msg.key", e.Message.Key)
	assert.Equal(t, "GitHub", e.Message.Params["provider"])
	assert.Empty(t, e.RawError)
}

func TestNewOAuthErrorWithRaw(t *testing.T) {
	e := NewOAuthErrorWithRaw(common.NewMessage("msg.key", map[string]any{"provider": "Discord"}), "underlying error")
	require.NotNil(t, e)
	require.NotNil(t, e.Message)
	assert.Equal(t, "msg.key", e.Message.Key)
	assert.Equal(t, "Discord", e.Message.Params["provider"])
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
