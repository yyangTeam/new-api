package model

import (
	"fmt"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// SetupIntegrationTestDB creates an in-memory SQLite database with all model
// tables migrated. It sets the package-level DB and LOG_DB variables and
// restores them on test cleanup. Each test gets a fresh, isolated database.
func SetupIntegrationTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	oldDB := DB
	oldLogDB := LOG_DB
	oldMainDBType := common.MainDatabaseType()
	oldLogDBType := common.LogDatabaseType()
	oldRedisEnabled := common.RedisEnabled

	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err, "failed to open in-memory SQLite")

	DB = db
	LOG_DB = db

	err = db.AutoMigrate(
		&Channel{},
		&Token{},
		&User{},
		&UserSession{},
		&AuthFlow{},
		&Option{},
		&Redemption{},
		&Ability{},
		&Log{},
		&TopUp{},
		&QuotaData{},
		&Task{},
		&Setup{},
	)
	require.NoError(t, err, "failed to run AutoMigrate")

	t.Cleanup(func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
		DB = oldDB
		LOG_DB = oldLogDB
		common.SetDatabaseTypes(oldMainDBType, oldLogDBType)
		common.RedisEnabled = oldRedisEnabled
	})

	return db
}

// SeedTestUser creates a user in the test database and returns it.
// The password is hashed before storage.
func SeedTestUser(t *testing.T, db *gorm.DB, username, password string, role int) *User {
	t.Helper()

	hashedPassword, err := common.Password2Hash(password)
	require.NoError(t, err)

	user := &User{
		Username:    username,
		Password:    hashedPassword,
		Role:        role,
		Status:      common.UserStatusEnabled,
		DisplayName: username,
		Group:       "default",
		AffCode:     common.GetRandomString(4),
	}
	require.NoError(t, db.Create(user).Error)
	return user
}

// SeedTestUserWithAccessToken creates a user with a Personal Access Token set.
func SeedTestUserWithAccessToken(t *testing.T, db *gorm.DB, username, password string, role int, accessToken string) *User {
	t.Helper()

	hashedPassword, err := common.Password2Hash(password)
	require.NoError(t, err)

	user := &User{
		Username:    username,
		Password:    hashedPassword,
		Role:        role,
		Status:      common.UserStatusEnabled,
		DisplayName: username,
		Group:       "default",
		AffCode:     common.GetRandomString(4),
		AccessToken: &accessToken,
	}
	require.NoError(t, db.Create(user).Error)
	return user
}

// SeedTestToken creates an API token for the specified user.
func SeedTestToken(t *testing.T, db *gorm.DB, userID int, name, key string) *Token {
	t.Helper()

	token := &Token{
		UserId:         userID,
		Name:           name,
		Key:            key,
		Status:         common.TokenStatusEnabled,
		CreatedTime:    common.GetTimestamp(),
		AccessedTime:   common.GetTimestamp(),
		ExpiredTime:    -1,
		RemainQuota:    100000,
		UnlimitedQuota: true,
		Group:          "default",
	}
	require.NoError(t, db.Create(token).Error)
	return token
}

// SeedTestChannel creates a channel in the test database.
func SeedTestChannel(t *testing.T, db *gorm.DB, name, key string, channelType int) *Channel {
	t.Helper()

	channel := &Channel{
		Name:        name,
		Key:         key,
		Type:        channelType,
		Status:      common.ChannelStatusEnabled,
		Models:      "gpt-3.5-turbo,gpt-4",
		Group:       "default",
		CreatedTime: common.GetTimestamp(),
	}
	require.NoError(t, db.Create(channel).Error)
	return channel
}
