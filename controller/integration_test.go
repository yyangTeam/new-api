package controller

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// setupIntegrationDB creates a fresh in-memory SQLite database for integration
// testing. It migrates core tables and sets the global model.DB/LOG_DB.
func setupIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()

	oldDB := model.DB
	oldLogDB := model.LOG_DB
	oldMainDBType := common.MainDatabaseType()
	oldLogDBType := common.LogDatabaseType()
	oldRedisEnabled := common.RedisEnabled
	oldPasswordLogin := common.PasswordLoginEnabled
	oldRegister := common.RegisterEnabled
	oldPasswordRegister := common.PasswordRegisterEnabled
	oldSetup := constant.Setup
	oldGenDefaultToken := constant.GenerateDefaultToken

	gin.SetMode(gin.TestMode)
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled = false
	common.PasswordLoginEnabled = true
	common.RegisterEnabled = true
	common.PasswordRegisterEnabled = true
	constant.Setup = true
	constant.GenerateDefaultToken = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)

	model.DB = db
	model.LOG_DB = db

	err = db.AutoMigrate(
		&model.Channel{},
		&model.Token{},
		&model.User{},
		&model.UserSession{},
		&model.AuthFlow{},
		&model.Option{},
		&model.Redemption{},
		&model.Ability{},
		&model.Log{},
		&model.TopUp{},
		&model.QuotaData{},
		&model.Task{},
		&model.Setup{},
		&model.TwoFA{},
		&model.TwoFABackupCode{},
		&model.CasbinRule{},
		&model.AuthzRole{},
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
		model.DB = oldDB
		model.LOG_DB = oldLogDB
		common.SetDatabaseTypes(oldMainDBType, oldLogDBType)
		common.RedisEnabled = oldRedisEnabled
		common.PasswordLoginEnabled = oldPasswordLogin
		common.RegisterEnabled = oldRegister
		common.PasswordRegisterEnabled = oldPasswordRegister
		constant.Setup = oldSetup
		constant.GenerateDefaultToken = oldGenDefaultToken
	})

	return db
}

// createTestUserWithPAT creates a user with an access_token for PAT-based auth.
func createTestUserWithPAT(t *testing.T, db *gorm.DB, username, password string, role int, pat string) *model.User {
	t.Helper()

	hashedPassword, err := common.Password2Hash(password)
	require.NoError(t, err)

	user := &model.User{
		Username:    username,
		Password:    hashedPassword,
		Role:        role,
		Status:      common.UserStatusEnabled,
		DisplayName: username,
		Group:       "default",
		AffCode:     common.GetRandomString(4),
		AccessToken: &pat,
	}
	require.NoError(t, db.Create(user).Error)
	return user
}

// setupIntegrationRouter creates a minimal Gin router with token and user routes
// for integration testing.
func setupIntegrationRouter(t *testing.T) *gin.Engine {
	t.Helper()

	router := gin.New()
	api := router.Group("/api")

	// User routes (no auth needed for register/login)
	userRoute := api.Group("/user")
	userRoute.POST("/register", Register)
	userRoute.POST("/login", Login)

	// Token routes (authenticated via context injection)
	tokenRoute := api.Group("/token")
	tokenRoute.Use(patAuthMiddleware())
	{
		tokenRoute.GET("/", GetAllTokens)
		tokenRoute.GET("/:id", GetToken)
		tokenRoute.POST("/", AddToken)
		tokenRoute.PUT("/", UpdateToken)
		tokenRoute.DELETE("/:id", DeleteToken)
	}

	// Channel routes (admin auth)
	channelRoute := api.Group("/channel")
	channelRoute.Use(patAuthMiddleware())
	{
		channelRoute.POST("/", AddChannel)
		channelRoute.DELETE("/:id", DeleteChannel)
	}

	return router
}

// patAuthMiddleware is a test middleware that authenticates via PAT (access_token).
func patAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "unauthorized"})
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		user, err := model.ValidateAccessToken(token)
		if err != nil || user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid token"})
			return
		}
		c.Set("id", user.Id)
		c.Set("username", user.Username)
		c.Set("role", user.Role)
		c.Set("group", user.Group)
		c.Next()
	}
}

func doRequest(router *gin.Engine, method, path string, body []byte, pat string) *httptest.ResponseRecorder {
	var bodyReader *bytes.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	} else {
		bodyReader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, bodyReader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if pat != "" {
		req.Header.Set("Authorization", "Bearer "+pat)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

type apiResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

func TestIntegration_UserRegister(t *testing.T) {
	setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	body, err := common.Marshal(map[string]string{
		"username": "newuser",
		"password": "testpass123",
	})
	require.NoError(t, err)

	w := doRequest(router, http.MethodPost, "/api/user/register", body, "")
	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &resp))
	assert.True(t, resp.Success, "register should succeed, got message: %s", resp.Message)
}

func TestIntegration_UserRegisterDuplicate(t *testing.T) {
	db := setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	// Pre-seed user
	createTestUserWithPAT(t, db, "dupuser", "pass12345", common.RoleCommonUser, "pat-dup-test")

	body, err := common.Marshal(map[string]string{
		"username": "dupuser",
		"password": "testpass123",
	})
	require.NoError(t, err)

	w := doRequest(router, http.MethodPost, "/api/user/register", body, "")
	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &resp))
	assert.False(t, resp.Success, "duplicate register should fail")
}

func TestIntegration_UserLogin(t *testing.T) {
	db := setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	createTestUserWithPAT(t, db, "loginuser", "mypassword1", common.RoleCommonUser, "unused-pat")

	body, err := common.Marshal(map[string]string{
		"username": "loginuser",
		"password": "mypassword1",
	})
	require.NoError(t, err)

	w := doRequest(router, http.MethodPost, "/api/user/login", body, "")
	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &resp))
	assert.True(t, resp.Success, "login should succeed, got: %s", resp.Message)
}

func TestIntegration_UserLoginWrongPassword(t *testing.T) {
	db := setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	createTestUserWithPAT(t, db, "loginuser2", "correctpw1", common.RoleCommonUser, "unused-pat2")

	body, err := common.Marshal(map[string]string{
		"username": "loginuser2",
		"password": "wrongpassword",
	})
	require.NoError(t, err)

	w := doRequest(router, http.MethodPost, "/api/user/login", body, "")
	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &resp))
	assert.False(t, resp.Success, "login with wrong password should fail")
}

func TestIntegration_TokenCRUD(t *testing.T) {
	db := setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	pat := "test-admin-pat-1234567890123456"
	user := createTestUserWithPAT(t, db, "tokenadmin", "pass12345", common.RoleAdminUser, pat)

	// Save original max tokens setting and set a high limit for the test
	origMaxTokens := operation_setting.GetTokenSetting().MaxUserTokens
	operation_setting.GetTokenSetting().MaxUserTokens = 100
	t.Cleanup(func() {
		operation_setting.GetTokenSetting().MaxUserTokens = origMaxTokens
	})

	// --- Create token ---
	createBody, err := common.Marshal(map[string]any{
		"name":           "integration-token",
		"expired_time":   -1,
		"remain_quota":   50000,
		"unlimited_quota": true,
		"group":          "default",
	})
	require.NoError(t, err)

	w := doRequest(router, http.MethodPost, "/api/token/", createBody, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var createResp tokenAPIResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &createResp))
	assert.True(t, createResp.Success, "create token should succeed, got: %s", createResp.Message)

	// --- List tokens ---
	w = doRequest(router, http.MethodGet, "/api/token/?p=1&size=10", nil, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var listResp tokenAPIResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &listResp))
	assert.True(t, listResp.Success)

	var page tokenPageResponse
	pageBytes, _ := common.Marshal(listResp.Data)
	require.NoError(t, common.Unmarshal(pageBytes, &page))
	assert.Len(t, page.Items, 1)
	assert.Equal(t, "integration-token", page.Items[0].Name)

	// Token key should be masked in list
	tokenID := page.Items[0].ID
	assert.NotContains(t, page.Items[0].Key, "sk-", "key should be masked in list response")

	// --- Get single token ---
	w = doRequest(router, http.MethodGet, fmt.Sprintf("/api/token/%d", tokenID), nil, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var getResp tokenAPIResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &getResp))
	assert.True(t, getResp.Success)

	// --- Update token ---
	updateBody, err := common.Marshal(map[string]any{
		"id":                   tokenID,
		"name":                 "renamed-token",
		"expired_time":         -1,
		"remain_quota":         100000,
		"unlimited_quota":      true,
		"model_limits_enabled": false,
		"model_limits":         "",
		"group":                "default",
	})
	require.NoError(t, err)

	w = doRequest(router, http.MethodPut, "/api/token/", updateBody, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var updateResp tokenAPIResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &updateResp))
	assert.True(t, updateResp.Success, "update token should succeed, got: %s", updateResp.Message)

	// Verify updated name
	var updatedToken model.Token
	require.NoError(t, db.First(&updatedToken, "id = ? AND user_id = ?", tokenID, user.Id).Error)
	assert.Equal(t, "renamed-token", updatedToken.Name)

	// --- Delete token ---
	w = doRequest(router, http.MethodDelete, fmt.Sprintf("/api/token/%d", tokenID), nil, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var delResp tokenAPIResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &delResp))
	assert.True(t, delResp.Success, "delete token should succeed, got: %s", delResp.Message)

	// Verify token is soft-deleted
	var count int64
	db.Model(&model.Token{}).Where("id = ? AND user_id = ?", tokenID, user.Id).Count(&count)
	assert.Equal(t, int64(0), count, "token should be soft-deleted")
}

func TestIntegration_TokenCreateExceedsLimit(t *testing.T) {
	db := setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	pat := "test-limit-pat-12345678901234"
	user := createTestUserWithPAT(t, db, "limituser", "pass12345", common.RoleCommonUser, pat)

	// Set max tokens to 2
	origMaxTokens := operation_setting.GetTokenSetting().MaxUserTokens
	operation_setting.GetTokenSetting().MaxUserTokens = 2
	t.Cleanup(func() {
		operation_setting.GetTokenSetting().MaxUserTokens = origMaxTokens
	})

	// Pre-seed 2 tokens
	for i := 0; i < 2; i++ {
		token := &model.Token{
			UserId:         user.Id,
			Name:           fmt.Sprintf("existing-%d", i),
			Key:            fmt.Sprintf("sk-existing-%d-123456", i),
			Status:         common.TokenStatusEnabled,
			CreatedTime:    common.GetTimestamp(),
			AccessedTime:   common.GetTimestamp(),
			ExpiredTime:    -1,
			RemainQuota:    100,
			UnlimitedQuota: true,
			Group:          "default",
		}
		require.NoError(t, db.Create(token).Error)
	}

	// Try to create a third one - should fail
	createBody, err := common.Marshal(map[string]any{
		"name":            "over-limit",
		"expired_time":    -1,
		"remain_quota":    100,
		"unlimited_quota": true,
		"group":           "default",
	})
	require.NoError(t, err)

	w := doRequest(router, http.MethodPost, "/api/token/", createBody, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp tokenAPIResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &resp))
	assert.False(t, resp.Success, "token creation should fail when limit is reached")
}

func TestIntegration_ChannelCreate(t *testing.T) {
	db := setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	pat := "admin-channel-pat-1234567890"
	createTestUserWithPAT(t, db, "channeladmin", "pass12345", common.RoleAdminUser, pat)

	createBody, err := common.Marshal(map[string]any{
		"mode": "single",
		"channel": map[string]any{
			"name":   "test-openai-channel",
			"key":    "sk-test-provider-key-123456",
			"type":   1,
			"models": "gpt-3.5-turbo,gpt-4",
			"group":  "default",
		},
	})
	require.NoError(t, err)

	w := doRequest(router, http.MethodPost, "/api/channel/", createBody, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &resp))
	assert.True(t, resp.Success, "channel create should succeed, got: %s", resp.Message)

	// Verify channel was created in DB
	var channel model.Channel
	err = db.First(&channel, "name = ?", "test-openai-channel").Error
	require.NoError(t, err)
	assert.Equal(t, 1, channel.Type)
	assert.Equal(t, "gpt-3.5-turbo,gpt-4", channel.Models)
}

func TestIntegration_ChannelDelete(t *testing.T) {
	db := setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	pat := "admin-del-pat-12345678901234"
	createTestUserWithPAT(t, db, "delchanadmin", "pass12345", common.RoleAdminUser, pat)

	// Seed a channel
	channel := &model.Channel{
		Name:        "to-delete-channel",
		Key:         "sk-delete-me-key",
		Type:        1,
		Status:      common.ChannelStatusEnabled,
		Models:      "gpt-4",
		Group:       "default",
		CreatedTime: common.GetTimestamp(),
	}
	require.NoError(t, db.Create(channel).Error)

	w := doRequest(router, http.MethodDelete, fmt.Sprintf("/api/channel/%d", channel.Id), nil, pat)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiResponse
	require.NoError(t, common.Unmarshal(w.Body.Bytes(), &resp))
	assert.True(t, resp.Success, "channel delete should succeed, got: %s", resp.Message)

	// Verify channel is deleted
	var count int64
	db.Model(&model.Channel{}).Where("id = ?", channel.Id).Count(&count)
	assert.Equal(t, int64(0), count, "channel should be deleted")
}

func TestIntegration_UnauthenticatedAccessDenied(t *testing.T) {
	setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	// No PAT header
	w := doRequest(router, http.MethodGet, "/api/token/?p=1&size=10", nil, "")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestIntegration_InvalidPATDenied(t *testing.T) {
	setupIntegrationDB(t)
	router := setupIntegrationRouter(t)

	w := doRequest(router, http.MethodGet, "/api/token/?p=1&size=10", nil, "invalid-pat-does-not-exist")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
