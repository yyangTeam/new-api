package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service/authz"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAuthorizationToken(t *testing.T) {
	tests := []struct {
		name      string
		header    string
		wantToken string
		wantOK    bool
	}{
		{
			name:      "Bearer prefix with token",
			header:    "Bearer sk-abc123",
			wantToken: "sk-abc123",
			wantOK:    true,
		},
		{
			name:      "bearer lowercase prefix",
			header:    "bearer sk-abc123",
			wantToken: "sk-abc123",
			wantOK:    true,
		},
		{
			name:      "Bearer with extra whitespace",
			header:    "  Bearer   sk-abc123  ",
			wantToken: "sk-abc123",
			wantOK:    true,
		},
		{
			name:      "raw token without Bearer",
			header:    "sk-abc123",
			wantToken: "sk-abc123",
			wantOK:    true,
		},
		{
			name:      "empty header returns not ok",
			header:    "",
			wantToken: "",
			wantOK:    false,
		},
		{
			name:      "whitespace only returns not ok",
			header:    "   ",
			wantToken: "",
			wantOK:    false,
		},
		{
			name:      "three parts returns not ok",
			header:    "Bearer token extra",
			wantToken: "",
			wantOK:    false,
		},
		{
			name:      "dotted JWT-like token",
			header:    "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
			wantToken: "eyJhbGciOiJIUzI1NiJ9.payload.signature",
			wantOK:    true,
		},
		{
			name:      "raw dotted token without Bearer",
			header:    "eyJhbGciOiJIUzI1NiJ9.payload.signature",
			wantToken: "eyJhbGciOiJIUzI1NiJ9.payload.signature",
			wantOK:    true,
		},
		{
			name:      "Bearer followed by space treats Bearer as the token",
			header:    "Bearer ",
			wantToken: "Bearer",
			wantOK:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, ok := authorizationToken(tt.header)
			assert.Equal(t, tt.wantOK, ok)
			if ok {
				assert.Equal(t, tt.wantToken, token)
			}
		})
	}
}

func TestValidUserInfo(t *testing.T) {
	tests := []struct {
		name     string
		username string
		role     int
		expected bool
	}{
		{
			name:     "valid common user",
			username: "alice",
			role:     common.RoleCommonUser,
			expected: true,
		},
		{
			name:     "valid admin user",
			username: "admin",
			role:     common.RoleAdminUser,
			expected: true,
		},
		{
			name:     "valid root user",
			username: "root",
			role:     common.RoleRootUser,
			expected: true,
		},
		{
			name:     "valid guest user",
			username: "guest",
			role:     common.RoleGuestUser,
			expected: true,
		},
		{
			name:     "empty username is invalid",
			username: "",
			role:     common.RoleCommonUser,
			expected: false,
		},
		{
			name:     "whitespace-only username is invalid",
			username: "   ",
			role:     common.RoleCommonUser,
			expected: false,
		},
		{
			name:     "tab-only username is invalid",
			username: "\t",
			role:     common.RoleCommonUser,
			expected: false,
		},
		{
			name:     "invalid role number",
			username: "alice",
			role:     5,
			expected: false,
		},
		{
			name:     "negative role number",
			username: "alice",
			role:     -1,
			expected: false,
		},
		{
			name:     "very large role number",
			username: "alice",
			role:     999,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validUserInfo(tt.username, tt.role)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestRequirePermissionDeniesInsufficientRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	perm := authz.Permission{Resource: "channels", Action: "manage"}
	router := gin.New()
	router.GET("/admin/action", func(c *gin.Context) {
		// Simulate a user with common role (1)
		c.Set("role", common.RoleCommonUser)
		c.Set("id", 123)
	}, RequirePermission(perm), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	request := httptest.NewRequest(http.MethodGet, "/admin/action", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusForbidden, response.Code)
}

func TestRequirePermissionAllowsRootUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	perm := authz.Permission{Resource: "channels", Action: "manage"}
	router := gin.New()
	router.GET("/admin/action", func(c *gin.Context) {
		// Simulate root user
		c.Set("role", common.RoleRootUser)
		c.Set("id", 1)
	}, RequirePermission(perm), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	request := httptest.NewRequest(http.MethodGet, "/admin/action", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusOK, response.Code)
}

func TestVersionMiddlewareSetsHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.GET("/test", Version(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusOK, response.Code)
	assert.Equal(t, common.Version, response.Header().Get("X-New-Api-Version"))
}

func TestGetSessionAuthIdentityRequiresAllFields(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name    string
		setup   func(c *gin.Context)
		wantOK  bool
	}{
		{
			name:   "no context values",
			setup:  func(c *gin.Context) {},
			wantOK: false,
		},
		{
			name: "missing session_id",
			setup: func(c *gin.Context) {
				c.Set("id", 1)
				c.Set("auth_version", int64(1))
				c.Set("session_version", int64(1))
			},
			wantOK: false,
		},
		{
			name: "missing auth_version",
			setup: func(c *gin.Context) {
				c.Set("id", 1)
				c.Set("session_id", "sid-1")
				c.Set("session_version", int64(1))
			},
			wantOK: false,
		},
		{
			name: "zero user id",
			setup: func(c *gin.Context) {
				c.Set("id", 0)
				c.Set("session_id", "sid-1")
				c.Set("auth_version", int64(1))
				c.Set("session_version", int64(1))
			},
			wantOK: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			tt.setup(ctx)
			_, ok := GetSessionAuthIdentity(ctx)
			assert.Equal(t, tt.wantOK, ok)
		})
	}
}
