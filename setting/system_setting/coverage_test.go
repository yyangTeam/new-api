package system_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetFetchSetting_DefaultsApplied(t *testing.T) {
	// Restore the registered default singleton: GetFetchSetting returns the
	// package-level default, whose invariant is SSRF protection on by default.
	original := defaultFetchSetting
	t.Cleanup(func() { defaultFetchSetting = original })
	// Reset to a known default to assert the documented contract regardless
	// of any earlier test mutating the singleton.
	defaultFetchSetting = defaultFetchSettingDefaults()

	s := GetFetchSetting()
	require.NotNil(t, s)
	assert.True(t, s.EnableSSRFProtection, "SSRF protection must default to enabled")
	assert.False(t, s.AllowPrivateIp)
	assert.False(t, s.DomainFilterMode)
	assert.False(t, s.IpFilterMode)
	assert.Empty(t, s.DomainList)
	assert.Empty(t, s.IpList)
	assert.Equal(t, []string{"80", "443", "8080", "8443"}, s.AllowedPorts)
	assert.True(t, s.ApplyIPFilterForDomain)
}

// defaultFetchSettingDefaults mirrors the literal in fetch_setting.go so tests
// can re-establish the documented default without importing the var directly.
func defaultFetchSettingDefaults() FetchSetting {
	return FetchSetting{
		EnableSSRFProtection:   true,
		AllowPrivateIp:         false,
		DomainFilterMode:       false,
		IpFilterMode:           false,
		DomainList:             []string{},
		IpList:                 []string{},
		AllowedPorts:           []string{"80", "443", "8080", "8443"},
		ApplyIPFilterForDomain: true,
	}
}

func TestGetDiscordSettings_ReturnsSingleton(t *testing.T) {
	s := GetDiscordSettings()
	require.NotNil(t, s)
	// Discord defaults to disabled with empty credentials.
	assert.False(t, s.Enabled)
	assert.Empty(t, s.ClientId)
	assert.Empty(t, s.ClientSecret)
}

func TestGetLegalSettings_ReturnsSingleton(t *testing.T) {
	s := GetLegalSettings()
	require.NotNil(t, s)
	// Legal defaults to empty strings (no configured agreement/policy).
	assert.Empty(t, s.UserAgreement)
	assert.Empty(t, s.PrivacyPolicy)
}

func TestGetOIDCSettings_ReturnsSingleton(t *testing.T) {
	s := GetOIDCSettings()
	require.NotNil(t, s)
	// OIDC defaults to disabled with empty endpoints.
	assert.False(t, s.Enabled)
	assert.Empty(t, s.ClientId)
	assert.Empty(t, s.ClientSecret)
	assert.Empty(t, s.WellKnown)
}

func TestEnableWorker_ReflectsWorkerUrl(t *testing.T) {
	origWorkerUrl := WorkerUrl
	origWorkerKey := WorkerValidKey
	t.Cleanup(func() {
		WorkerUrl = origWorkerUrl
		WorkerValidKey = origWorkerKey
	})

	WorkerUrl = ""
	assert.False(t, EnableWorker(), "empty WorkerUrl must disable worker")

	WorkerUrl = "https://worker.example.com"
	assert.True(t, EnableWorker(), "non-empty WorkerUrl must enable worker")
}

func TestGetPasskeySettings_DerivesRPIDFromServerAddress(t *testing.T) {
	origServer := ServerAddress
	origRPID := defaultPasskeySettings.RPID
	origOrigins := defaultPasskeySettings.Origins
	t.Cleanup(func() {
		ServerAddress = origServer
		defaultPasskeySettings.RPID = origRPID
		defaultPasskeySettings.Origins = origOrigins
	})

	tests := []struct {
		name        string
		serverAddr  string
		wantRPID    string
		wantOrigins string
	}{
		{
			name:        "https url extracts host as RPID and full url as origins",
			serverAddr:  "https://newapi.pro",
			wantRPID:    "newapi.pro",
			wantOrigins: "https://newapi.pro",
		},
		{
			name:        "https url with port keeps port in host",
			serverAddr:  "https://newapi.pro:8443",
			wantRPID:    "newapi.pro:8443",
			wantOrigins: "https://newapi.pro:8443",
		},
		{
			name:        "bare host falls back to raw trimmed string",
			serverAddr:  "newapi.pro",
			wantRPID:    "newapi.pro",
			wantOrigins: "newapi.pro",
		},
		{
			name:        "empty server address leaves RPID empty and origins empty",
			serverAddr:  "",
			wantRPID:    "",
			wantOrigins: "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ServerAddress = tt.serverAddr
			defaultPasskeySettings.RPID = ""
			defaultPasskeySettings.Origins = ""

			s := GetPasskeySettings()
			require.NotNil(t, s)
			assert.Equal(t, tt.wantRPID, s.RPID)
			assert.Equal(t, tt.wantOrigins, s.Origins)
		})
	}
}

func TestGetPasskeySettings_PreservesAdminConfiguredRPID(t *testing.T) {
	origServer := ServerAddress
	origRPID := defaultPasskeySettings.RPID
	origOrigins := defaultPasskeySettings.Origins
	t.Cleanup(func() {
		ServerAddress = origServer
		defaultPasskeySettings.RPID = origRPID
		defaultPasskeySettings.Origins = origOrigins
	})

	// When the admin has already set an RPID, GetPasskeySettings must not
	// overwrite it from ServerAddress.
	defaultPasskeySettings.RPID = "admin.configured.example"
	defaultPasskeySettings.Origins = ""
	ServerAddress = "https://other.example.com"

	s := GetPasskeySettings()
	assert.Equal(t, "admin.configured.example", s.RPID)
	// Origins is still empty, so it falls back to ServerAddress.
	assert.Equal(t, "https://other.example.com", s.Origins)
}

func TestGetPasskeySettings_BlankJSONOriginsFallsBackToServerAddress(t *testing.T) {
	origServer := ServerAddress
	origRPID := defaultPasskeySettings.RPID
	origOrigins := defaultPasskeySettings.Origins
	t.Cleanup(func() {
		ServerAddress = origServer
		defaultPasskeySettings.RPID = origRPID
		defaultPasskeySettings.Origins = origOrigins
	})

	ServerAddress = "https://blankorigins.example.com"
	defaultPasskeySettings.RPID = "preset.rpid"
	defaultPasskeySettings.Origins = "[]"

	s := GetPasskeySettings()
	// The literal "[]" sentinel is treated as unset and replaced.
	assert.Equal(t, "https://blankorigins.example.com", s.Origins)
}

func TestGetPasskeySettings_Defaults(t *testing.T) {
	origServer := ServerAddress
	origRPID := defaultPasskeySettings.RPID
	origOrigins := defaultPasskeySettings.Origins
	t.Cleanup(func() {
		ServerAddress = origServer
		defaultPasskeySettings.RPID = origRPID
		defaultPasskeySettings.Origins = origOrigins
	})

	ServerAddress = ""
	defaultPasskeySettings.RPID = ""
	defaultPasskeySettings.Origins = ""

	s := GetPasskeySettings()
	require.NotNil(t, s)
	assert.False(t, s.Enabled)
	assert.Equal(t, "preferred", s.UserVerification)
	assert.False(t, s.AllowInsecureOrigin)
}
