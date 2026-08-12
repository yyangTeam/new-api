package oauth

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

// mockRoundTripper is a minimal http.RoundTripper that returns a canned
// response based on the request, without making any real network call. It
// captures the last request so tests can assert on method, headers, and body.
type mockRoundTripper struct {
	respStatus  int
	respBody    string
	respHeaders http.Header
	lastReq     *http.Request
	lastBody    []byte
	callCount   int
	err         error
}

func (m *mockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	m.callCount++
	m.lastReq = req
	if req.Body != nil {
		body, _ := io.ReadAll(req.Body)
		req.Body.Close()
		m.lastBody = body
	} else {
		m.lastBody = nil
	}
	if m.err != nil {
		return nil, m.err
	}
	resp := &http.Response{
		StatusCode: m.respStatus,
		Body:       io.NopCloser(strings.NewReader(m.respBody)),
		Header:     http.Header{},
	}
	for k, vs := range m.respHeaders {
		for _, v := range vs {
			resp.Header.Add(k, v)
		}
	}
	return resp, nil
}

// withMockTransport swaps http.DefaultTransport for a mock and restores it on
// cleanup. Provider code creates http.Client{Timeout: x} which uses
// http.DefaultTransport when its own Transport is nil.
func withMockTransport(t *testing.T, rt *mockRoundTripper) {
	t.Helper()
	orig := http.DefaultTransport
	http.DefaultTransport = rt
	t.Cleanup(func() { http.DefaultTransport = orig })
}

// --- GitHub provider --------------------------------------------------------

func TestGitHubProvider_Metadata(t *testing.T) {
	p := &GitHubProvider{}
	assert.Equal(t, "GitHub", p.GetName())
	assert.Equal(t, "github_", p.GetProviderPrefix())

	t.Run("IsEnabled reflects flag", func(t *testing.T) {
		orig := common.GitHubOAuthEnabled
		t.Cleanup(func() { common.GitHubOAuthEnabled = orig })
		common.GitHubOAuthEnabled = false
		assert.False(t, p.IsEnabled())
		common.GitHubOAuthEnabled = true
		assert.True(t, p.IsEnabled())
	})
}

func TestGitHubProvider_SetProviderUserID(t *testing.T) {
	p := &GitHubProvider{}
	u := &model.User{}
	p.SetProviderUserID(u, "12345")
	assert.Equal(t, "12345", u.GitHubId)
}

func TestGitHubProvider_ExchangeToken_EmptyCode(t *testing.T) {
	p := &GitHubProvider{}
	_, err := p.ExchangeToken(context.Background(), "", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthInvalidCode, oe.MsgKey)
}

func TestGitHubProvider_ExchangeToken_Success(t *testing.T) {
	origClientID := common.GitHubClientId
	origClientSecret := common.GitHubClientSecret
	t.Cleanup(func() {
		common.GitHubClientId = origClientID
		common.GitHubClientSecret = origClientSecret
	})
	common.GitHubClientId = "gh-client-id"
	common.GitHubClientSecret = "gh-secret"

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"access_token":"gho_token","scope":"user","token_type":"bearer"}`,
	}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	tok, err := p.ExchangeToken(context.Background(), "the-code", nil)
	require.NoError(t, err)
	require.NotNil(t, tok)
	assert.Equal(t, "gho_token", tok.AccessToken)
	assert.Equal(t, "user", tok.Scope)
	assert.Equal(t, "bearer", tok.TokenType)

	// Verify the request was built correctly: POST to GitHub, JSON body with
	// client_id/client_secret/code, JSON accept header.
	require.NotNil(t, rt.lastReq)
	assert.Equal(t, http.MethodPost, rt.lastReq.Method)
	assert.Equal(t, "https://github.com/login/oauth/access_token", rt.lastReq.URL.String())
	assert.Equal(t, "application/json", rt.lastReq.Header.Get("Content-Type"))
	assert.Equal(t, "application/json", rt.lastReq.Header.Get("Accept"))

	var body map[string]string
	require.NoError(t, json.Unmarshal(rt.lastBody, &body))
	assert.Equal(t, "gh-client-id", body["client_id"])
	assert.Equal(t, "gh-secret", body["client_secret"])
	assert.Equal(t, "the-code", body["code"])
}

func TestGitHubProvider_ExchangeToken_TransportError_MapsToOAuthError(t *testing.T) {
	rt := &mockRoundTripper{err: errors.New("dial tcp: connection refused")}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "GitHub", oe.Params["Provider"])
	assert.NotEmpty(t, oe.RawError)
}

func TestGitHubProvider_ExchangeToken_EmptyToken_MapsToTokenFailed(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":"","scope":"","token_type":""}`}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthTokenFailed, oe.MsgKey)
	assert.Equal(t, "GitHub", oe.Params["Provider"])
}

func TestGitHubProvider_ExchangeToken_InvalidJSON(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 200, respBody: `not-json`}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
}

func TestGitHubProvider_GetUserInfo_Success_NumericIDMapping(t *testing.T) {
	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"id":9876543210,"login":"octocat","name":"The Octocat","email":"octo@example.com"}`,
	}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	u, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "gho_token"})
	require.NoError(t, err)
	require.NotNil(t, u)
	// Numeric GitHub ID must be serialized as a string for stable storage.
	assert.Equal(t, "9876543210", u.ProviderUserID)
	assert.Equal(t, "octocat", u.Username)
	assert.Equal(t, "The Octocat", u.DisplayName)
	assert.Equal(t, "octo@example.com", u.Email)
	assert.Equal(t, "octocat", u.Extra["legacy_id"])

	// Authorization must be Bearer <token>.
	require.NotNil(t, rt.lastReq)
	assert.Equal(t, "Bearer gho_token", rt.lastReq.Header.Get("Authorization"))
	assert.Equal(t, "https://api.github.com/user", rt.lastReq.URL.String())
}

func TestGitHubProvider_GetUserInfo_Non200_MapsToGetUserErr(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 401, respBody: `{"message":"Bad credentials"}`}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "bad"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthGetUserErr, oe.MsgKey)
	assert.Contains(t, oe.RawError, "status 401")
}

func TestGitHubProvider_GetUserInfo_EmptyIDLogin_MapsToUserInfoEmpty(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 200, respBody: `{"id":0,"login":"","name":"","email":""}`}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthUserInfoEmpty, oe.MsgKey)
	assert.Equal(t, "GitHub", oe.Params["Provider"])
}

func TestGitHubProvider_GetUserInfo_TransportError_MapsToOAuthError(t *testing.T) {
	rt := &mockRoundTripper{err: errors.New("network down")}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "GitHub", oe.Params["Provider"])
}

func TestGitHubProvider_GetUserInfo_InvalidJSON(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 200, respBody: `<<<bad`}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
}

func TestGitHubProvider_GetUserInfo_LongBodyIsTruncatedInRawError(t *testing.T) {
	// Non-200 path truncates the body to 500 chars when logging; the truncation
	// itself must not panic and the error mapping must still hold.
	long := strings.Repeat("x", 800)
	rt := &mockRoundTripper{respStatus: 500, respBody: long}
	withMockTransport(t, rt)

	p := &GitHubProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthGetUserErr, oe.MsgKey)
}

// --- Discord provider ------------------------------------------------------

func TestDiscordProvider_Metadata(t *testing.T) {
	p := &DiscordProvider{}
	assert.Equal(t, "Discord", p.GetName())
	assert.Equal(t, "discord_", p.GetProviderPrefix())
}

func TestDiscordProvider_IsEnabled(t *testing.T) {
	s := system_setting.GetDiscordSettings()
	orig := s.Enabled
	t.Cleanup(func() { s.Enabled = orig })
	s.Enabled = false
	assert.False(t, (&DiscordProvider{}).IsEnabled())
	s.Enabled = true
	assert.True(t, (&DiscordProvider{}).IsEnabled())
}

func TestDiscordProvider_SetProviderUserID(t *testing.T) {
	p := &DiscordProvider{}
	u := &model.User{}
	p.SetProviderUserID(u, "discord-uid")
	assert.Equal(t, "discord-uid", u.DiscordId)
}

func TestDiscordProvider_ExchangeToken_EmptyCode(t *testing.T) {
	p := &DiscordProvider{}
	_, err := p.ExchangeToken(context.Background(), "", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthInvalidCode, oe.MsgKey)
}

func TestDiscordProvider_ExchangeToken_Success_BuildsRedirectURIAndForm(t *testing.T) {
	s := system_setting.GetDiscordSettings()
	origEnabled := s.Enabled
	origClientID := s.ClientId
	origClientSecret := s.ClientSecret
	origServerAddr := system_setting.ServerAddress
	t.Cleanup(func() {
		s.Enabled = origEnabled
		s.ClientId = origClientID
		s.ClientSecret = origClientSecret
		system_setting.ServerAddress = origServerAddr
	})
	s.Enabled = true
	s.ClientId = "dc-id"
	s.ClientSecret = "dc-secret"
	system_setting.ServerAddress = "https://app.example.com"

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"access_token":"dc-token","token_type":"Bearer","refresh_token":"rt","expires_in":3600,"scope":"identify","id_token":"idt"}`,
	}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	tok, err := p.ExchangeToken(context.Background(), "the-code", nil)
	require.NoError(t, err)
	require.NotNil(t, tok)
	assert.Equal(t, "dc-token", tok.AccessToken)
	assert.Equal(t, "Bearer", tok.TokenType)
	assert.Equal(t, "rt", tok.RefreshToken)
	assert.Equal(t, 3600, tok.ExpiresIn)
	assert.Equal(t, "identify", tok.Scope)
	assert.Equal(t, "idt", tok.IDToken)

	// Form-encoded body, redirect_uri derived from ServerAddress.
	require.NotNil(t, rt.lastReq)
	assert.Equal(t, http.MethodPost, rt.lastReq.Method)
	assert.Equal(t, "https://discord.com/api/v10/oauth2/token", rt.lastReq.URL.String())
	assert.Equal(t, "application/x-www-form-urlencoded", rt.lastReq.Header.Get("Content-Type"))

	form, err := url.ParseQuery(string(rt.lastBody))
	require.NoError(t, err)
	assert.Equal(t, "dc-id", form.Get("client_id"))
	assert.Equal(t, "dc-secret", form.Get("client_secret"))
	assert.Equal(t, "the-code", form.Get("code"))
	assert.Equal(t, "authorization_code", form.Get("grant_type"))
	assert.Equal(t, "https://app.example.com/oauth/discord", form.Get("redirect_uri"))
}

func TestDiscordProvider_ExchangeToken_EmptyToken_MapsToTokenFailed(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":""}`}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthTokenFailed, oe.MsgKey)
	assert.Equal(t, "Discord", oe.Params["Provider"])
}

func TestDiscordProvider_ExchangeToken_TransportError(t *testing.T) {
	rt := &mockRoundTripper{err: errors.New("net err")}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "Discord", oe.Params["Provider"])
}

func TestDiscordProvider_GetUserInfo_Success(t *testing.T) {
	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"id":"999","username":"snek","global_name":"Snek"}`,
	}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	u, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.NoError(t, err)
	require.NotNil(t, u)
	assert.Equal(t, "999", u.ProviderUserID)
	assert.Equal(t, "snek", u.Username)
	assert.Equal(t, "Snek", u.DisplayName)
	assert.Equal(t, "Bearer tok", rt.lastReq.Header.Get("Authorization"))
	assert.Equal(t, "https://discord.com/api/v10/users/@me", rt.lastReq.URL.String())
}

func TestDiscordProvider_GetUserInfo_Non200_MapsToGetUserErr(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 429, respBody: ``}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthGetUserErr, oe.MsgKey)
}

func TestDiscordProvider_GetUserInfo_EmptyFields_MapsToUserInfoEmpty(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 200, respBody: `{"id":"","username":""}`}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthUserInfoEmpty, oe.MsgKey)
	assert.Equal(t, "Discord", oe.Params["Provider"])
}

func TestDiscordProvider_GetUserInfo_InvalidJSON(t *testing.T) {
	rt := &mockRoundTripper{respStatus: 200, respBody: `bad{json`}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
}

func TestDiscordProvider_GetUserInfo_TransportError(t *testing.T) {
	rt := &mockRoundTripper{err: errors.New("boom")}
	withMockTransport(t, rt)

	p := &DiscordProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
}

// --- OIDC provider ---------------------------------------------------------

func TestOIDCProvider_Metadata(t *testing.T) {
	p := &OIDCProvider{}
	assert.Equal(t, "oidc_", p.GetProviderPrefix())
}

func TestOIDCProvider_IsEnabled(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	orig := s.Enabled
	t.Cleanup(func() { s.Enabled = orig })
	s.Enabled = false
	assert.False(t, (&OIDCProvider{}).IsEnabled())
	s.Enabled = true
	assert.True(t, (&OIDCProvider{}).IsEnabled())
}

func TestOIDCProvider_SetProviderUserID(t *testing.T) {
	p := &OIDCProvider{}
	u := &model.User{}
	p.SetProviderUserID(u, "oidc-sub")
	assert.Equal(t, "oidc-sub", u.OidcId)
}

func TestOIDCProvider_ExchangeToken_EmptyCode(t *testing.T) {
	p := &OIDCProvider{}
	_, err := p.ExchangeToken(context.Background(), "", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthInvalidCode, oe.MsgKey)
}

func TestOIDCProvider_ExchangeToken_Success_BuildsFormWithSettings(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origEnabled := s.Enabled
	origClientID := s.ClientId
	origClientSecret := s.ClientSecret
	origTokenEndpoint := s.TokenEndpoint
	origServerAddr := system_setting.ServerAddress
	t.Cleanup(func() {
		s.Enabled = origEnabled
		s.ClientId = origClientID
		s.ClientSecret = origClientSecret
		s.TokenEndpoint = origTokenEndpoint
		system_setting.ServerAddress = origServerAddr
	})
	s.Enabled = true
	s.ClientId = "oidc-id"
	s.ClientSecret = "oidc-secret"
	s.TokenEndpoint = "https://idp.example.com/oauth/token"
	system_setting.ServerAddress = "https://app.example.com"

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"access_token":"oidc-token","token_type":"Bearer","refresh_token":"rt","expires_in":600,"scope":"openid","id_token":"idt"}`,
	}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	tok, err := p.ExchangeToken(context.Background(), "the-code", nil)
	require.NoError(t, err)
	require.NotNil(t, tok)
	assert.Equal(t, "oidc-token", tok.AccessToken)
	assert.Equal(t, "Bearer", tok.TokenType)
	assert.Equal(t, "rt", tok.RefreshToken)
	assert.Equal(t, 600, tok.ExpiresIn)
	assert.Equal(t, "idt", tok.IDToken)

	require.NotNil(t, rt.lastReq)
	assert.Equal(t, http.MethodPost, rt.lastReq.Method)
	assert.Equal(t, "https://idp.example.com/oauth/token", rt.lastReq.URL.String())
	assert.Equal(t, "application/x-www-form-urlencoded", rt.lastReq.Header.Get("Content-Type"))

	form, err := url.ParseQuery(string(rt.lastBody))
	require.NoError(t, err)
	assert.Equal(t, "oidc-id", form.Get("client_id"))
	assert.Equal(t, "oidc-secret", form.Get("client_secret"))
	assert.Equal(t, "the-code", form.Get("code"))
	assert.Equal(t, "authorization_code", form.Get("grant_type"))
	assert.Equal(t, "https://app.example.com/oauth/oidc", form.Get("redirect_uri"))
}

func TestOIDCProvider_ExchangeToken_EmptyToken(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origTokenEndpoint := s.TokenEndpoint
	t.Cleanup(func() { s.TokenEndpoint = origTokenEndpoint })
	s.TokenEndpoint = "https://idp.example.com/oauth/token"

	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":""}`}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthTokenFailed, oe.MsgKey)
	assert.Equal(t, "OIDC", oe.Params["Provider"])
}

func TestOIDCProvider_ExchangeToken_TransportError(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origTokenEndpoint := s.TokenEndpoint
	t.Cleanup(func() { s.TokenEndpoint = origTokenEndpoint })
	s.TokenEndpoint = "https://idp.example.com/oauth/token"

	rt := &mockRoundTripper{err: errors.New("fail")}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "OIDC", oe.Params["Provider"])
}

func TestOIDCProvider_GetUserInfo_Success_ClaimMapping(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origUserInfo := s.UserInfoEndpoint
	t.Cleanup(func() { s.UserInfoEndpoint = origUserInfo })
	s.UserInfoEndpoint = "https://idp.example.com/userinfo"

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"sub":"sub-123","email":"u@example.com","name":"U Name","preferred_username":"uname","picture":"https://p/x.png"}`,
	}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	u, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.NoError(t, err)
	require.NotNil(t, u)
	assert.Equal(t, "sub-123", u.ProviderUserID)
	assert.Equal(t, "uname", u.Username)
	assert.Equal(t, "U Name", u.DisplayName)
	assert.Equal(t, "u@example.com", u.Email)
	assert.Equal(t, "Bearer tok", rt.lastReq.Header.Get("Authorization"))
	assert.Equal(t, "https://idp.example.com/userinfo", rt.lastReq.URL.String())
}

func TestOIDCProvider_GetUserInfo_Non200(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origUserInfo := s.UserInfoEndpoint
	t.Cleanup(func() { s.UserInfoEndpoint = origUserInfo })
	s.UserInfoEndpoint = "https://idp.example.com/userinfo"

	rt := &mockRoundTripper{respStatus: 502, respBody: ``}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthGetUserErr, oe.MsgKey)
}

func TestOIDCProvider_GetUserInfo_EmptySubOrEmail(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origUserInfo := s.UserInfoEndpoint
	t.Cleanup(func() { s.UserInfoEndpoint = origUserInfo })
	s.UserInfoEndpoint = "https://idp.example.com/userinfo"

	rt := &mockRoundTripper{respStatus: 200, respBody: `{"sub":"","email":""}`}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthUserInfoEmpty, oe.MsgKey)
	assert.Equal(t, "OIDC", oe.Params["Provider"])
}

func TestOIDCProvider_GetUserInfo_TransportError(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origUserInfo := s.UserInfoEndpoint
	t.Cleanup(func() { s.UserInfoEndpoint = origUserInfo })
	s.UserInfoEndpoint = "https://idp.example.com/userinfo"

	rt := &mockRoundTripper{err: errors.New("boom")}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "OIDC", oe.Params["Provider"])
}

func TestOIDCProvider_GetUserInfo_InvalidJSON(t *testing.T) {
	s := system_setting.GetOIDCSettings()
	origUserInfo := s.UserInfoEndpoint
	t.Cleanup(func() { s.UserInfoEndpoint = origUserInfo })
	s.UserInfoEndpoint = "https://idp.example.com/userinfo"

	rt := &mockRoundTripper{respStatus: 200, respBody: `malformed`}
	withMockTransport(t, rt)

	p := &OIDCProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
}

// --- LinuxDO provider ------------------------------------------------------

func newLinuxDOGinContext(host string, isTLS bool) *gin.Context {
	gin.SetMode(gin.TestMode)
	w := &responseRecorder{}
	c, _ := gin.CreateTestContext(w)
	c.Request = &http.Request{Host: host}
	if isTLS {
		// LinuxDO only checks c.Request.TLS != nil to pick the https scheme;
		// a zero-value ConnectionState is sufficient to mark the request as TLS.
		c.Request.TLS = &tls.ConnectionState{}
	}
	return c
}

// responseRecorder is a minimal http.ResponseWriter for gin test contexts.
type responseRecorder struct {
	status int
	header http.Header
	body   []byte
}

func (r *responseRecorder) Header() http.Header {
	if r.header == nil {
		r.header = http.Header{}
	}
	return r.header
}
func (r *responseRecorder) WriteHeader(code int)       { r.status = code }
func (r *responseRecorder) Write(b []byte) (int, error) {
	r.body = append(r.body, b...)
	return len(b), nil
}
func (r *responseRecorder) Hijack() {}

func TestLinuxDOProvider_Metadata(t *testing.T) {
	p := &LinuxDOProvider{}
	assert.Equal(t, "Linux DO", p.GetName())
	assert.Equal(t, "linuxdo_", p.GetProviderPrefix())
}

func TestLinuxDOProvider_IsEnabled(t *testing.T) {
	orig := common.LinuxDOOAuthEnabled
	t.Cleanup(func() { common.LinuxDOOAuthEnabled = orig })
	common.LinuxDOOAuthEnabled = false
	assert.False(t, (&LinuxDOProvider{}).IsEnabled())
	common.LinuxDOOAuthEnabled = true
	assert.True(t, (&LinuxDOProvider{}).IsEnabled())
}

func TestLinuxDOProvider_SetProviderUserID(t *testing.T) {
	p := &LinuxDOProvider{}
	u := &model.User{}
	p.SetProviderUserID(u, "ldo-123")
	assert.Equal(t, "ldo-123", u.LinuxDOId)
}

func TestLinuxDOProvider_ExchangeToken_EmptyCode(t *testing.T) {
	p := &LinuxDOProvider{}
	_, err := p.ExchangeToken(context.Background(), "", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthInvalidCode, oe.MsgKey)
}

func TestLinuxDOProvider_ExchangeToken_Success_HTTPRedirectURI(t *testing.T) {
	origID := common.LinuxDOClientId
	origSecret := common.LinuxDOClientSecret
	t.Cleanup(func() {
		common.LinuxDOClientId = origID
		common.LinuxDOClientSecret = origSecret
	})
	common.LinuxDOClientId = "ldo-id"
	common.LinuxDOClientSecret = "ldo-secret"

	// Override token endpoint via env to route through the mock transport.
	t.Setenv("LINUX_DO_TOKEN_ENDPOINT", "https://token.local.test/oauth2/token")

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"access_token":"ldo-token","message":""}`,
	}
	withMockTransport(t, rt)

	c := newLinuxDOGinContext("app.example.com", false)

	p := &LinuxDOProvider{}
	tok, err := p.ExchangeToken(context.Background(), "the-code", c)
	require.NoError(t, err)
	require.NotNil(t, tok)
	assert.Equal(t, "ldo-token", tok.AccessToken)

	require.NotNil(t, rt.lastReq)
	assert.Equal(t, http.MethodPost, rt.lastReq.Method)
	assert.Equal(t, "https://token.local.test/oauth2/token", rt.lastReq.URL.String())
	assert.Equal(t, "application/x-www-form-urlencoded", rt.lastReq.Header.Get("Content-Type"))

	// Basic auth header carries base64(client_id:client_secret).
	expectedBasic := "Basic " + base64.StdEncoding.EncodeToString([]byte("ldo-id:ldo-secret"))
	assert.Equal(t, expectedBasic, rt.lastReq.Header.Get("Authorization"))

	form, err := url.ParseQuery(string(rt.lastBody))
	require.NoError(t, err)
	assert.Equal(t, "authorization_code", form.Get("grant_type"))
	assert.Equal(t, "the-code", form.Get("code"))
	// Scheme is http because TLS flag is nil on this request.
	assert.Equal(t, "http://app.example.com/api/oauth/linuxdo", form.Get("redirect_uri"))
}

func TestLinuxDOProvider_ExchangeToken_HTTPSRedirectURI(t *testing.T) {
	t.Setenv("LINUX_DO_TOKEN_ENDPOINT", "https://token.local.test/oauth2/token")
	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":"t","message":""}`}
	withMockTransport(t, rt)

	c := newLinuxDOGinContext("secure.example.com", true)

	p := &LinuxDOProvider{}
	tok, err := p.ExchangeToken(context.Background(), "code", c)
	require.NoError(t, err)
	require.NotNil(t, tok)

	form, err := url.ParseQuery(string(rt.lastBody))
	require.NoError(t, err)
	assert.Equal(t, "https://secure.example.com/api/oauth/linuxdo", form.Get("redirect_uri"))
}

func TestLinuxDOProvider_ExchangeToken_EmptyToken_WithMessage(t *testing.T) {
	t.Setenv("LINUX_DO_TOKEN_ENDPOINT", "https://token.local.test/oauth2/token")
	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":"","message":"invalid_grant"}`}
	withMockTransport(t, rt)

	c := newLinuxDOGinContext("app.example.com", false)
	p := &LinuxDOProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", c)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthTokenFailed, oe.MsgKey)
	assert.Equal(t, "Linux DO", oe.Params["Provider"])
	assert.Equal(t, "invalid_grant", oe.RawError)
}

func TestLinuxDOProvider_ExchangeToken_TransportError(t *testing.T) {
	t.Setenv("LINUX_DO_TOKEN_ENDPOINT", "https://token.local.test/oauth2/token")
	rt := &mockRoundTripper{err: errors.New("net")}
	withMockTransport(t, rt)

	c := newLinuxDOGinContext("app.example.com", false)
	p := &LinuxDOProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", c)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "Linux DO", oe.Params["Provider"])
}

func TestLinuxDOProvider_ExchangeToken_InvalidJSON(t *testing.T) {
	t.Setenv("LINUX_DO_TOKEN_ENDPOINT", "https://token.local.test/oauth2/token")
	rt := &mockRoundTripper{respStatus: 200, respBody: `garbage`}
	withMockTransport(t, rt)

	c := newLinuxDOGinContext("app.example.com", false)
	p := &LinuxDOProvider{}
	_, err := p.ExchangeToken(context.Background(), "code", c)
	require.Error(t, err)
}

func TestLinuxDOProvider_GetUserInfo_Success_TrustLevelOK(t *testing.T) {
	origMinTrust := common.LinuxDOMinimumTrustLevel
	t.Cleanup(func() { common.LinuxDOMinimumTrustLevel = origMinTrust })
	common.LinuxDOMinimumTrustLevel = 1

	t.Setenv("LINUX_DO_USER_ENDPOINT", "https://user.local.test/api/user")
	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"id":42,"username":"alice","name":"Alice","active":true,"trust_level":3,"silenced":false}`,
	}
	withMockTransport(t, rt)

	p := &LinuxDOProvider{}
	u, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.NoError(t, err)
	require.NotNil(t, u)
	assert.Equal(t, "42", u.ProviderUserID)
	assert.Equal(t, "alice", u.Username)
	assert.Equal(t, "Alice", u.DisplayName)
	require.NotNil(t, u.Extra)
	assert.Equal(t, 3, u.Extra["trust_level"])
	assert.Equal(t, true, u.Extra["active"])
	assert.Equal(t, false, u.Extra["silenced"])
	assert.Equal(t, "Bearer tok", rt.lastReq.Header.Get("Authorization"))
}

func TestLinuxDOProvider_GetUserInfo_TrustLevelTooLow(t *testing.T) {
	origMinTrust := common.LinuxDOMinimumTrustLevel
	t.Cleanup(func() { common.LinuxDOMinimumTrustLevel = origMinTrust })
	common.LinuxDOMinimumTrustLevel = 3

	t.Setenv("LINUX_DO_USER_ENDPOINT", "https://user.local.test/api/user")
	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"id":42,"username":"alice","name":"Alice","active":true,"trust_level":1,"silenced":false}`,
	}
	withMockTransport(t, rt)

	p := &LinuxDOProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var tle *TrustLevelError
	require.ErrorAs(t, err, &tle)
	assert.Equal(t, 3, tle.Required)
	assert.Equal(t, 1, tle.Current)
}

func TestLinuxDOProvider_GetUserInfo_InvalidUserID(t *testing.T) {
	t.Setenv("LINUX_DO_USER_ENDPOINT", "https://user.local.test/api/user")
	rt := &mockRoundTripper{respStatus: 200, respBody: `{"id":0,"username":"x"}`}
	withMockTransport(t, rt)

	p := &LinuxDOProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthUserInfoEmpty, oe.MsgKey)
	assert.Equal(t, "Linux DO", oe.Params["Provider"])
}

func TestLinuxDOProvider_GetUserInfo_TransportError(t *testing.T) {
	t.Setenv("LINUX_DO_USER_ENDPOINT", "https://user.local.test/api/user")
	rt := &mockRoundTripper{err: errors.New("net")}
	withMockTransport(t, rt)

	p := &LinuxDOProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "Linux DO", oe.Params["Provider"])
}

func TestLinuxDOProvider_GetUserInfo_InvalidJSON(t *testing.T) {
	t.Setenv("LINUX_DO_USER_ENDPOINT", "https://user.local.test/api/user")
	rt := &mockRoundTripper{respStatus: 200, respBody: `notjson`}
	withMockTransport(t, rt)

	p := &LinuxDOProvider{}
	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
}

func TestTrustLevelError_Error(t *testing.T) {
	e := &TrustLevelError{Required: 5, Current: 1}
	assert.Equal(t, "trust level too low", e.Error())
}

// --- Generic provider HTTP flows -------------------------------------------

func newGenericConfig() *model.CustomOAuthProvider {
	return &model.CustomOAuthProvider{
		Id:                7,
		Name:              "AcmeSSO",
		Slug:              "acme",
		Enabled:           true,
		ClientId:          "gen-id",
		ClientSecret:      "gen-secret",
		TokenEndpoint:     "https://token.local.test/token",
		UserInfoEndpoint:  "https://user.local.test/userinfo",
		UserIdField:       "sub",
		UsernameField:     "preferred_username",
		DisplayNameField:  "name",
		EmailField:        "email",
	}
}

func TestGenericOAuthProvider_ExchangeToken_EmptyCode(t *testing.T) {
	p := NewGenericOAuthProvider(newGenericConfig())
	_, err := p.ExchangeToken(context.Background(), "", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthInvalidCode, oe.MsgKey)
}

func TestGenericOAuthProvider_ExchangeToken_Success_JSONBody(t *testing.T) {
	cfg := newGenericConfig()
	cfg.AuthStyle = AuthStyleInParams
	p := NewGenericOAuthProvider(cfg)

	origServerAddr := system_setting.ServerAddress
	t.Cleanup(func() { system_setting.ServerAddress = origServerAddr })
	system_setting.ServerAddress = "https://app.example.com"

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"access_token":"gen-token","token_type":"Bearer","refresh_token":"rt","expires_in":3600,"scope":"openid","id_token":"idt"}`,
	}
	withMockTransport(t, rt)

	tok, err := p.ExchangeToken(context.Background(), "the-code", nil)
	require.NoError(t, err)
	require.NotNil(t, tok)
	assert.Equal(t, "gen-token", tok.AccessToken)
	assert.Equal(t, "Bearer", tok.TokenType)
	assert.Equal(t, "rt", tok.RefreshToken)
	assert.Equal(t, 3600, tok.ExpiresIn)
	assert.Equal(t, "idt", tok.IDToken)

	require.NotNil(t, rt.lastReq)
	assert.Equal(t, http.MethodPost, rt.lastReq.Method)
	assert.Equal(t, "https://token.local.test/token", rt.lastReq.URL.String())
	assert.Equal(t, "application/x-www-form-urlencoded", rt.lastReq.Header.Get("Content-Type"))

	form, err := url.ParseQuery(string(rt.lastBody))
	require.NoError(t, err)
	assert.Equal(t, "gen-id", form.Get("client_id"))
	assert.Equal(t, "gen-secret", form.Get("client_secret"))
	assert.Equal(t, "the-code", form.Get("code"))
	assert.Equal(t, "authorization_code", form.Get("grant_type"))
	assert.Equal(t, "https://app.example.com/oauth/acme", form.Get("redirect_uri"))
	// Params style: no Authorization header.
	assert.Empty(t, rt.lastReq.Header.Get("Authorization"))
}

func TestGenericOAuthProvider_ExchangeToken_AutoDetectDefaultsToParams(t *testing.T) {
	cfg := newGenericConfig()
	cfg.AuthStyle = AuthStyleAutoDetect
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":"t"}`}
	withMockTransport(t, rt)

	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.NoError(t, err)
	form, err := url.ParseQuery(string(rt.lastBody))
	require.NoError(t, err)
	assert.Equal(t, "gen-id", form.Get("client_id"))
	assert.Empty(t, rt.lastReq.Header.Get("Authorization"))
}

func TestGenericOAuthProvider_ExchangeToken_HeaderAuthStyle(t *testing.T) {
	cfg := newGenericConfig()
	cfg.AuthStyle = AuthStyleInHeader
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":"t"}`}
	withMockTransport(t, rt)

	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.NoError(t, err)

	expectedBasic := "Basic " + base64.StdEncoding.EncodeToString([]byte("gen-id:gen-secret"))
	assert.Equal(t, expectedBasic, rt.lastReq.Header.Get("Authorization"))
	// Header style: client creds NOT in form body.
	form, err := url.ParseQuery(string(rt.lastBody))
	require.NoError(t, err)
	assert.Empty(t, form.Get("client_id"))
	assert.Empty(t, form.Get("client_secret"))
	assert.Equal(t, "code", form.Get("code"))
}

func TestGenericOAuthProvider_ExchangeToken_URLEncodedBodyFallback(t *testing.T) {
	// Some OAuth servers (e.g. GitHub) return form-encoded token responses.
	// The generic provider must fall back to url.ParseQuery when JSON parse
	// fails.
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   "access_token=fb-token&scope=user&token_type=bearer",
		respHeaders: http.Header{"Content-Type": {"application/x-www-form-urlencoded"}},
	}
	withMockTransport(t, rt)

	tok, err := p.ExchangeToken(context.Background(), "code", nil)
	require.NoError(t, err)
	require.NotNil(t, tok)
	assert.Equal(t, "fb-token", tok.AccessToken)
	assert.Equal(t, "bearer", tok.TokenType)
	assert.Equal(t, "user", tok.Scope)
}

func TestGenericOAuthProvider_ExchangeToken_OAuthErrorField(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 400,
		respBody:   `{"error":"invalid_grant","error_description":"bad code"}`,
	}
	withMockTransport(t, rt)

	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthTokenFailed, oe.MsgKey)
	assert.Equal(t, "AcmeSSO", oe.Params["Provider"])
	assert.Equal(t, "bad code", oe.RawError)
}

func TestGenericOAuthProvider_ExchangeToken_EmptyToken(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{respStatus: 200, respBody: `{"access_token":""}`}
	withMockTransport(t, rt)

	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthTokenFailed, oe.MsgKey)
	assert.Equal(t, "AcmeSSO", oe.Params["Provider"])
	assert.Empty(t, oe.RawError)
}

func TestGenericOAuthProvider_ExchangeToken_TransportError(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{err: errors.New("net")}
	withMockTransport(t, rt)

	_, err := p.ExchangeToken(context.Background(), "code", nil)
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "AcmeSSO", oe.Params["Provider"])
}

func TestGenericOAuthProvider_GetUserInfo_Success(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"sub":"sub-1","preferred_username":"uname","name":"U","email":"u@e.com"}`,
	}
	withMockTransport(t, rt)

	u, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok", TokenType: "bearer"})
	require.NoError(t, err)
	require.NotNil(t, u)
	assert.Equal(t, "sub-1", u.ProviderUserID)
	assert.Equal(t, "uname", u.Username)
	assert.Equal(t, "U", u.DisplayName)
	assert.Equal(t, "u@e.com", u.Email)
	assert.Equal(t, "acme", u.Extra["provider"])
	// Bearer token type normalized.
	assert.Equal(t, "Bearer tok", rt.lastReq.Header.Get("Authorization"))
}

func TestGenericOAuthProvider_GetUserInfo_NumericUserIDField(t *testing.T) {
	cfg := newGenericConfig()
	cfg.UserIdField = "id"
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"id":12345,"preferred_username":"u","name":"U","email":"e@e.com"}`,
	}
	withMockTransport(t, rt)

	u, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.NoError(t, err)
	require.NotNil(t, u)
	// Numeric id converted to string.
	assert.Equal(t, "12345", u.ProviderUserID)
}

func TestGenericOAuthProvider_GetUserInfo_CustomTokenType(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"sub":"s","preferred_username":"u","name":"U","email":"e@e.com"}`,
	}
	withMockTransport(t, rt)

	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok", TokenType: "Token"})
	require.NoError(t, err)
	assert.Equal(t, "Token tok", rt.lastReq.Header.Get("Authorization"))
}

func TestGenericOAuthProvider_GetUserInfo_Non200(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{respStatus: 403, respBody: ``}
	withMockTransport(t, rt)

	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthGetUserErr, oe.MsgKey)
}

func TestGenericOAuthProvider_GetUserInfo_EmptyUserID(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{respStatus: 200, respBody: `{"sub":"","preferred_username":"u"}`}
	withMockTransport(t, rt)

	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthUserInfoEmpty, oe.MsgKey)
	assert.Equal(t, "AcmeSSO", oe.Params["Provider"])
}

func TestGenericOAuthProvider_GetUserInfo_TransportError(t *testing.T) {
	cfg := newGenericConfig()
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{err: errors.New("net")}
	withMockTransport(t, rt)

	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthConnectFailed, oe.MsgKey)
	assert.Equal(t, "AcmeSSO", oe.Params["Provider"])
}

func TestGenericOAuthProvider_GetUserInfo_AccessPolicyAllows(t *testing.T) {
	cfg := newGenericConfig()
	cfg.AccessPolicy = `{"logic":"and","conditions":[{"field":"active","op":"eq","value":true}]}`
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"sub":"s","preferred_username":"u","name":"U","email":"e@e.com","active":true}`,
	}
	withMockTransport(t, rt)

	u, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.NoError(t, err)
	require.NotNil(t, u)
	assert.Equal(t, "s", u.ProviderUserID)
}

func TestGenericOAuthProvider_GetUserInfo_AccessPolicyDenies_AccessDeniedError(t *testing.T) {
	cfg := newGenericConfig()
	cfg.AccessPolicy = `{"logic":"and","conditions":[{"field":"trust_level","op":"gte","value":3}]}`
	cfg.AccessDeniedMessage = "Provider {{provider}} requires {{field}} {{op}} {{required}}, you have {{current}}"
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"sub":"s","preferred_username":"u","name":"U","email":"e@e.com","trust_level":1}`,
	}
	withMockTransport(t, rt)

	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var ade *AccessDeniedError
	require.ErrorAs(t, err, &ade)
	assert.Contains(t, ade.Message, "Provider AcmeSSO requires trust_level gte 3")
	assert.Contains(t, ade.Message, "you have 1")
}

func TestGenericOAuthProvider_GetUserInfo_InvalidAccessPolicy(t *testing.T) {
	cfg := newGenericConfig()
	cfg.AccessPolicy = `not-json`
	p := NewGenericOAuthProvider(cfg)

	rt := &mockRoundTripper{
		respStatus: 200,
		respBody:   `{"sub":"s","preferred_username":"u","name":"U","email":"e@e.com"}`,
	}
	withMockTransport(t, rt)

	_, err := p.GetUserInfo(context.Background(), &OAuthToken{AccessToken: "tok"})
	require.Error(t, err)
	var oe *OAuthError
	require.ErrorAs(t, err, &oe)
	assert.Equal(t, i18n.MsgOAuthGetUserErr, oe.MsgKey)
	assert.Contains(t, oe.RawError, "invalid access policy")
}

func TestGenericOAuthProvider_SetProviderUserID_Noop(t *testing.T) {
	// Generic providers store bindings separately; SetProviderUserID must be a
	// safe no-op that does not mutate the user model.
	p := NewGenericOAuthProvider(newGenericConfig())
	u := &model.User{GitHubId: "preserve"}
	p.SetProviderUserID(u, "anything")
	assert.Equal(t, "preserve", u.GitHubId)
}

func TestGenericOAuthProvider_IsGenericProvider_True(t *testing.T) {
	p := NewGenericOAuthProvider(newGenericConfig())
	assert.True(t, p.IsGenericProvider())
}

// --- gjsonResultToValue JSON-object branch (coverage gap) -------------------

func TestGjsonResultToValue_JSONObject(t *testing.T) {
	// Exercises the gjson.JSON branch that decodes an object into a generic
	// map via common.UnmarshalJsonStr.
	result := gjson.Get(`{"meta":{"role":"admin","n":5}}`, "meta")
	val := gjsonResultToValue(result)
	m, ok := val.(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "admin", m["role"])
	assert.Equal(t, float64(5), m["n"])
}

func TestGjsonResultToValue_NestedArrayWithObjects(t *testing.T) {
	body := `{"items":[{"id":1},{"id":2}]}`
	result := gjson.Get(body, "items")
	val := gjsonResultToValue(result)
	arr, ok := val.([]any)
	require.True(t, ok)
	require.Len(t, arr, 2)
	first, ok := arr[0].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, float64(1), first["id"])
}

// Note: LoadCustomProviders / ReloadCustomProviders are intentionally not
// tested here. They read from model.DB via model.GetAllCustomOAuthProviders,
// and the oauth test binary does not initialize a database (model.DB == nil),
// so the model layer panics on a nil *gorm.DB before returning an error.
// There is no stable, DB-free assertion to pin against these functions, so
// adding a test would only be coverage padding.
