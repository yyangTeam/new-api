package passkey

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
)

func TestWebAuthnUser_NilReceiver(t *testing.T) {
	var u *WebAuthnUser
	assert.Nil(t, u.WebAuthnID())
	assert.Equal(t, "", u.WebAuthnName())
	assert.Equal(t, "", u.WebAuthnDisplayName())
	assert.Nil(t, u.WebAuthnCredentials())
	assert.Nil(t, u.ModelUser())
	assert.Nil(t, u.PasskeyCredential())
}

func TestWebAuthnUser_NilUser(t *testing.T) {
	u := &WebAuthnUser{user: nil}
	assert.Nil(t, u.WebAuthnID())
	assert.Equal(t, "", u.WebAuthnName())
	assert.Equal(t, "", u.WebAuthnDisplayName())
}

func TestWebAuthnUser_WebAuthnID(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 42}, nil)
	assert.Equal(t, []byte("42"), u.WebAuthnID())
}

func TestWebAuthnUser_WebAuthnName_Username(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 1, Username: "alice"}, nil)
	assert.Equal(t, "alice", u.WebAuthnName())
}

func TestWebAuthnUser_WebAuthnName_EmptyUsername(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 7, Username: ""}, nil)
	assert.Equal(t, "user-7", u.WebAuthnName())
}

func TestWebAuthnUser_WebAuthnName_WhitespaceUsername(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 3, Username: "   "}, nil)
	assert.Equal(t, "user-3", u.WebAuthnName())
}

func TestWebAuthnUser_WebAuthnDisplayName_WithDisplayName(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 1, Username: "alice", DisplayName: "Alice Smith"}, nil)
	assert.Equal(t, "Alice Smith", u.WebAuthnDisplayName())
}

func TestWebAuthnUser_WebAuthnDisplayName_FallbackToUsername(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 1, Username: "alice"}, nil)
	assert.Equal(t, "alice", u.WebAuthnDisplayName())
}

func TestWebAuthnUser_WebAuthnDisplayName_WhitespaceDisplayName(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 1, Username: "alice", DisplayName: "   "}, nil)
	assert.Equal(t, "alice", u.WebAuthnDisplayName())
}

func TestWebAuthnUser_WebAuthnCredentials_NilCredential(t *testing.T) {
	u := NewWebAuthnUser(&model.User{Id: 1}, nil)
	assert.Nil(t, u.WebAuthnCredentials())
}

func TestWebAuthnUser_ModelUser(t *testing.T) {
	user := &model.User{Id: 10}
	u := NewWebAuthnUser(user, nil)
	assert.Same(t, user, u.ModelUser())
}

func TestWebAuthnUser_PasskeyCredential(t *testing.T) {
	cred := &model.PasskeyCredential{}
	u := NewWebAuthnUser(&model.User{Id: 1}, cred)
	assert.Same(t, cred, u.PasskeyCredential())
}
