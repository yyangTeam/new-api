package passkey

import (
	"crypto/tls"
	"net/http"
	"testing"

	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHostWithoutPort(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"empty", "", ""},
		{"spaces only", "   ", ""},
		{"host only", "example.com", "example.com"},
		{"host with port", "example.com:8080", "example.com"},
		{"localhost with port", "localhost:3000", "localhost"},
		{"ip with port", "127.0.0.1:443", "127.0.0.1"},
		{"ipv6 bracket", "[::1]:8080", "::1"},
		{"host no port with spaces", "  example.com  ", "example.com"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, hostWithoutPort(tt.input))
		})
	}
}

func TestDetectScheme(t *testing.T) {
	t.Run("nil request", func(t *testing.T) {
		assert.Equal(t, "", detectScheme(nil))
	})

	t.Run("X-Forwarded-Proto https", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}}
		r.Header.Set("X-Forwarded-Proto", "https")
		assert.Equal(t, "https", detectScheme(r))
	})

	t.Run("X-Forwarded-Proto http", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}}
		r.Header.Set("X-Forwarded-Proto", "http")
		assert.Equal(t, "http", detectScheme(r))
	})

	t.Run("X-Forwarded-Proto multiple values", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}}
		r.Header.Set("X-Forwarded-Proto", "https, http")
		assert.Equal(t, "https", detectScheme(r))
	})

	t.Run("X-Forwarded-Proto with spaces", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}}
		r.Header.Set("X-Forwarded-Proto", "  HTTPS  ")
		assert.Equal(t, "https", detectScheme(r))
	})

	t.Run("TLS connection", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}, TLS: &tls.ConnectionState{}}
		assert.Equal(t, "https", detectScheme(r))
	})

	t.Run("URL scheme", func(t *testing.T) {
		r, _ := http.NewRequest("GET", "https://example.com/test", nil)
		assert.Equal(t, "https", detectScheme(r))
	})

	t.Run("X-Forwarded-Protocol", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}}
		r.Header.Set("X-Forwarded-Protocol", "HTTPS")
		assert.Equal(t, "https", detectScheme(r))
	})

	t.Run("fallback to http", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}}
		assert.Equal(t, "http", detectScheme(r))
	})

	t.Run("X-Forwarded-Proto takes priority over TLS", func(t *testing.T) {
		r := &http.Request{Header: http.Header{}, TLS: &tls.ConnectionState{}}
		r.Header.Set("X-Forwarded-Proto", "http")
		assert.Equal(t, "http", detectScheme(r))
	})
}

func TestResolveOrigins_ExplicitOrigins(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{
		Origins:             "https://example.com, https://other.com",
		AllowInsecureOrigin: false,
	}
	origins, err := resolveOrigins(r, settings)
	require.NoError(t, err)
	assert.Equal(t, []string{"https://example.com", "https://other.com"}, origins)
}

func TestResolveOrigins_EmptyOriginsAfterTrim(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	r.Header.Set("X-Forwarded-Proto", "https")
	settings := &system_setting.PasskeySettings{
		Origins:             "  ,  ,  ",
		AllowInsecureOrigin: false,
	}
	origins, err := resolveOrigins(r, settings)
	require.NoError(t, err)
	assert.Equal(t, []string{"https://example.com"}, origins)
}

func TestResolveOrigins_InsecureOriginRejected(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{
		Origins:             "http://insecure.com",
		AllowInsecureOrigin: false,
	}
	_, err := resolveOrigins(r, settings)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "不安全")
}

func TestResolveOrigins_InsecureOriginAllowed(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{
		Origins:             "http://insecure.com",
		AllowInsecureOrigin: true,
	}
	origins, err := resolveOrigins(r, settings)
	require.NoError(t, err)
	assert.Equal(t, []string{"http://insecure.com"}, origins)
}

func TestResolveOrigins_AutoDetectHTTPS(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	r.Header.Set("X-Forwarded-Proto", "https")
	settings := &system_setting.PasskeySettings{
		AllowInsecureOrigin: false,
	}
	origins, err := resolveOrigins(r, settings)
	require.NoError(t, err)
	assert.Equal(t, []string{"https://example.com"}, origins)
}

func TestResolveOrigins_AutoDetectHTTPNonLocalhost(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{
		AllowInsecureOrigin: false,
	}
	_, err := resolveOrigins(r, settings)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "HTTPS")
}

func TestResolveOrigins_AutoDetectHTTPLocalhostAllowed(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "localhost:3000"}
	settings := &system_setting.PasskeySettings{
		AllowInsecureOrigin: false,
	}
	origins, err := resolveOrigins(r, settings)
	require.NoError(t, err)
	assert.Equal(t, []string{"http://localhost:3000"}, origins)
}

func TestResolveOrigins_AutoDetect127001(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "127.0.0.1:8080"}
	settings := &system_setting.PasskeySettings{
		AllowInsecureOrigin: false,
	}
	origins, err := resolveOrigins(r, settings)
	require.NoError(t, err)
	assert.Equal(t, []string{"http://127.0.0.1:8080"}, origins)
}

func TestResolveOrigins_AutoDetectHTTPWithInsecureAllowed(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{
		AllowInsecureOrigin: true,
	}
	origins, err := resolveOrigins(r, settings)
	require.NoError(t, err)
	assert.Equal(t, []string{"http://example.com"}, origins)
}

func TestResolveRPID_Explicit(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{
		RPID: "custom-rpid.com",
	}
	rpID, err := resolveRPID(r, settings, []string{"https://example.com"})
	require.NoError(t, err)
	assert.Equal(t, "custom-rpid.com", rpID)
}

func TestResolveRPID_ExplicitWithPort(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{
		RPID: "example.com:8443",
	}
	rpID, err := resolveRPID(r, settings, []string{"https://example.com:8443"})
	require.NoError(t, err)
	assert.Equal(t, "example.com", rpID)
}

func TestResolveRPID_DerivedFromOrigin(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{}
	rpID, err := resolveRPID(r, settings, []string{"https://example.com:443"})
	require.NoError(t, err)
	assert.Equal(t, "example.com", rpID)
}

func TestResolveRPID_NoOrigins(t *testing.T) {
	r := &http.Request{Header: http.Header{}, Host: "example.com"}
	settings := &system_setting.PasskeySettings{}
	_, err := resolveRPID(r, settings, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "未配置 Origin")
}
