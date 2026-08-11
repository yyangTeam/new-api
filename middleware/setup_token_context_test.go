package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupTokenContextTestDB(t *testing.T) {
	t.Helper()
	previousDB := model.DB
	previousType := common.MainDatabaseType()
	previousRedis := common.RedisEnabled
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.User{}))
	model.DB = db
	common.SetMainDatabaseType(common.DatabaseTypeSQLite)
	common.RedisEnabled = false
	t.Cleanup(func() {
		model.DB = previousDB
		common.SetMainDatabaseType(previousType)
		common.RedisEnabled = previousRedis
	})
}

func TestSetupContextForTokenNilTokenReturnsError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())

	err := SetupContextForToken(ctx, nil)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "token is nil")
}

func TestSetupContextForTokenSetsBasicFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	token := &model.Token{
		Id:             42,
		UserId:         7,
		Key:            "test-key",
		Name:           "test-token",
		UnlimitedQuota: false,
		RemainQuota:    5000,
	}

	err := SetupContextForToken(ctx, token)

	require.NoError(t, err)
	assert.Equal(t, 7, ctx.GetInt("id"))
	assert.Equal(t, 42, ctx.GetInt("token_id"))
	assert.Equal(t, "test-key", ctx.GetString("token_key"))
	assert.Equal(t, "test-token", ctx.GetString("token_name"))
	assert.Equal(t, false, ctx.GetBool("token_unlimited_quota"))
	assert.Equal(t, 5000, ctx.GetInt("token_quota"))
}

func TestSetupContextForTokenUnlimitedQuotaSkipsQuota(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	token := &model.Token{
		Id:             1,
		UserId:         1,
		Key:            "k",
		UnlimitedQuota: true,
		RemainQuota:    0,
	}

	err := SetupContextForToken(ctx, token)

	require.NoError(t, err)
	assert.True(t, ctx.GetBool("token_unlimited_quota"))
	_, exists := ctx.Get("token_quota")
	assert.False(t, exists, "token_quota should not be set for unlimited tokens")
}

func TestSetupContextForTokenModelLimitsEnabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	token := &model.Token{
		Id:                 1,
		UserId:             1,
		Key:                "k",
		ModelLimitsEnabled: true,
		ModelLimits:        "gpt-4,gpt-3.5-turbo",
	}

	err := SetupContextForToken(ctx, token)

	require.NoError(t, err)
	assert.True(t, ctx.GetBool("token_model_limit_enabled"))
	limits, exists := ctx.Get("token_model_limit")
	require.True(t, exists)
	limitsMap, ok := limits.(map[string]bool)
	require.True(t, ok)
	assert.True(t, limitsMap["gpt-4"])
	assert.True(t, limitsMap["gpt-3.5-turbo"])
}

func TestSetupContextForTokenModelLimitsDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	token := &model.Token{
		Id:                 1,
		UserId:             1,
		Key:                "k",
		ModelLimitsEnabled: false,
	}

	err := SetupContextForToken(ctx, token)

	require.NoError(t, err)
	assert.False(t, ctx.GetBool("token_model_limit_enabled"))
}

func TestSetupContextForTokenSpecificChannelForAdmin(t *testing.T) {
	setupTokenContextTestDB(t)
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())

	// Create admin user
	user := &model.User{
		Username:    "admin-user",
		Password:    "pass",
		Role:        common.RoleAdminUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
		AuthVersion: 1,
		AffCode:     "admin-aff",
	}
	require.NoError(t, model.DB.Create(user).Error)

	token := &model.Token{
		Id:     1,
		UserId: user.Id,
		Key:    "k",
	}

	err := SetupContextForToken(ctx, token, "sk-key", "123")

	require.NoError(t, err)
	assert.Equal(t, "123", ctx.GetString("specific_channel_id"))
}

func TestSetupContextForTokenSpecificChannelForNonAdmin(t *testing.T) {
	ensureI18nInitialized(t)
	setupTokenContextTestDB(t)
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)

	// Create non-admin user
	user := &model.User{
		Username:    "normal-user",
		Password:    "pass",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
		AuthVersion: 1,
		AffCode:     "normal-aff",
	}
	require.NoError(t, model.DB.Create(user).Error)

	token := &model.Token{
		Id:     1,
		UserId: user.Id,
		Key:    "k",
	}

	err := SetupContextForToken(ctx, token, "sk-key", "123")

	require.Error(t, err)
	assert.Equal(t, 403, w.Code, "non-admin specifying channel should get 403")
}

func TestSetupContextForTokenSetsTokenGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	token := &model.Token{
		Id:     1,
		UserId: 1,
		Key:    "k",
		Group:  "premium",
	}

	err := SetupContextForToken(ctx, token)

	require.NoError(t, err)
	group, ok := common.GetContextKey(ctx, constant.ContextKeyTokenGroup)
	require.True(t, ok)
	assert.Equal(t, "premium", group)
}
