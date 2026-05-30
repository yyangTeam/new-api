package controller

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type tokenAPIResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

type tokenPageResponse struct {
	Items []tokenResponseItem `json:"items"`
}

type tokenResponseItem struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Key    string `json:"key"`
	Status int    `json:"status"`
}

type tokenKeyResponse struct {
	Key string `json:"key"`
}

type sqliteColumnInfo struct {
	Name string `gorm:"column:name"`
	Type string `gorm:"column:type"`
}

type legacyToken struct {
	Id                 int            `gorm:"primaryKey"`
	UserId             int            `gorm:"index"`
	Key                string         `gorm:"column:key;type:char(48);uniqueIndex"`
	Status             int            `gorm:"default:1"`
	Name               string         `gorm:"index"`
	CreatedTime        int64          `gorm:"bigint"`
	AccessedTime       int64          `gorm:"bigint"`
	ExpiredTime        int64          `gorm:"bigint;default:-1"`
	RemainQuota        int            `gorm:"default:0"`
	UnlimitedQuota     bool
	ModelLimitsEnabled bool
	ModelLimits        string         `gorm:"type:text"`
	AllowIps           *string        `gorm:"default:''"`
	UsedQuota          int            `gorm:"default:0"`
	Group              string         `gorm:"column:group;default:''"`
	CrossGroupRetry    bool
	DeletedAt          gorm.DeletedAt `gorm:"index"`
}

func (legacyToken) TableName() string {
	return "tokens"
}

func openTokenControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	gin.SetMode(gin.TestMode)
	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	model.DB = db
	model.LOG_DB = db

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

func migrateTokenControllerTestDB(t *testing.T, db *gorm.DB) {
	t.Helper()

	if err := db.AutoMigrate(&model.Token{}); err != nil {
		t.Fatalf("failed to migrate token table: %v", err)
	}
}

func setupTokenControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db := openTokenControllerTestDB(t)
	migrateTokenControllerTestDB(t, db)
	return db
}

func openTokenControllerExternalDB(t *testing.T, dialect string, dsn string) (*gorm.DB, *bool) {
	t.Helper()

	gin.SetMode(gin.TestMode)
	common.RedisEnabled = false
	common.UsingSQLite = false
	common.UsingMySQL = dialect == "mysql"
	common.UsingPostgreSQL = dialect == "postgres"

	var (
		db  *gorm.DB
		err error
	)
	switch dialect {
	case "mysql":
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	case "postgres":
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	default:
		t.Fatalf("unsupported dialect %q", dialect)
	}
	if err != nil {
		t.Fatalf("failed to open %s db: %v", dialect, err)
	}

	model.DB = db
	model.LOG_DB = db

	if db.Migrator().HasTable("tokens") {
		t.Skipf("refusing to run %s migration compatibility test against external database because tokens table already exists", dialect)
	}

	managedTokensTable := new(bool)

	t.Cleanup(func() {
		if *managedTokensTable && db.Migrator().HasTable("tokens") {
			_ = db.Migrator().DropTable("tokens")
		}
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db, managedTokensTable
}

func seedToken(t *testing.T, db *gorm.DB, userID int, name string, rawKey string) *model.Token {
	t.Helper()

	token := &model.Token{
		UserId:         userID,
		Name:           name,
		Key:            rawKey,
		Status:         common.TokenStatusEnabled,
		CreatedTime:    1,
		AccessedTime:   1,
		ExpiredTime:    -1,
		RemainQuota:    100,
		UnlimitedQuota: true,
		Group:          "default",
	}
	if err := db.Create(token).Error; err != nil {
		t.Fatalf("failed to create token: %v", err)
	}
	return token
}

func newAuthenticatedContext(t *testing.T, method string, target string, body any, userID int) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()

	var requestBody *bytes.Reader
	if body != nil {
		payload, err := common.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		requestBody = bytes.NewReader(payload)
	} else {
		requestBody = bytes.NewReader(nil)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(method, target, requestBody)
	if body != nil {
		ctx.Request.Header.Set("Content-Type", "application/json")
	}
	ctx.Set("id", userID)
	return ctx, recorder
}

func decodeAPIResponse(t *testing.T, recorder *httptest.ResponseRecorder) tokenAPIResponse {
	t.Helper()

	var response tokenAPIResponse
	if err := common.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode api response: %v", err)
	}
	return response
}

func getSQLiteColumnType(t *testing.T, db *gorm.DB, tableName string, columnName string) string {
	t.Helper()

	var columns []sqliteColumnInfo
	if err := db.Raw("PRAGMA table_info(" + tableName + ")").Scan(&columns).Error; err != nil {
		t.Fatalf("failed to inspect %s schema: %v", tableName, err)
	}

	for _, column := range columns {
		if column.Name == columnName {
			return strings.ToLower(column.Type)
		}
	}

	t.Fatalf("column %s not found in %s schema", columnName, tableName)
	return ""
}

func getTokenKeyColumnType(t *testing.T, db *gorm.DB, dialect string) string {
	t.Helper()

	switch dialect {
	case "sqlite":
		return getSQLiteColumnType(t, db, "tokens", "key")
	case "mysql":
		var columnType string
		if err := db.Raw(`SELECT COLUMN_TYPE FROM information_schema.columns
			WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
			"tokens", "key").Scan(&columnType).Error; err != nil {
			t.Fatalf("failed to inspect mysql token key column: %v", err)
		}
		return strings.ToLower(columnType)
	case "postgres":
		var dataType string
		var maxLength sql.NullInt64
		if err := db.Raw(`SELECT data_type, character_maximum_length
			FROM information_schema.columns
			WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?`,
			"tokens", "key").Row().Scan(&dataType, &maxLength); err != nil {
			t.Fatalf("failed to inspect postgres token key column: %v", err)
		}
		switch strings.ToLower(dataType) {
		case "character varying":
			return fmt.Sprintf("varchar(%d)", maxLength.Int64)
		case "character":
			return fmt.Sprintf("char(%d)", maxLength.Int64)
		default:
			if maxLength.Valid {
				return fmt.Sprintf("%s(%d)", strings.ToLower(dataType), maxLength.Int64)
			}
			return strings.ToLower(dataType)
		}
	default:
		t.Fatalf("unsupported dialect %q", dialect)
		return ""
	}
}

func runTokenMigrationCompatibilityTest(t *testing.T, db *gorm.DB, dialect string, managedTokensTable *bool) {
	t.Helper()

	legacyKey := strings.Repeat("a", 48)
	longKey := strings.Repeat("b", 64)

	if err := db.AutoMigrate(&legacyToken{}); err != nil {
		t.Fatalf("failed to create legacy token schema: %v", err)
	}
	if managedTokensTable != nil {
		*managedTokensTable = true
	}
	if err := db.Create(&legacyToken{
		UserId:             7,
		Key:                legacyKey,
		Status:             common.TokenStatusEnabled,
		Name:               "legacy-token",
		CreatedTime:        1,
		AccessedTime:       1,
		ExpiredTime:        -1,
		RemainQuota:        100,
		UnlimitedQuota:     true,
		ModelLimitsEnabled: false,
		ModelLimits:        "",
		AllowIps:           common.GetPointer(""),
		UsedQuota:          0,
		Group:              "default",
		CrossGroupRetry:    false,
	}).Error; err != nil {
		t.Fatalf("failed to seed legacy token row: %v", err)
	}

	if got := getTokenKeyColumnType(t, db, dialect); got != "char(48)" {
		t.Fatalf("expected legacy key column type char(48), got %q", got)
	}

	migrateTokenControllerTestDB(t, db)

	if got := getTokenKeyColumnType(t, db, dialect); got != "varchar(128)" {
		t.Fatalf("expected migrated key column type varchar(128), got %q", got)
	}

	var migratedToken model.Token
	if err := db.First(&migratedToken, "name = ?", "legacy-token").Error; err != nil {
		t.Fatalf("failed to load migrated token row: %v", err)
	}
	if migratedToken.Key != legacyKey {
		t.Fatalf("expected migrated token key %q, got %q", legacyKey, migratedToken.Key)
	}
	if migratedToken.Name != "legacy-token" {
		t.Fatalf("expected migrated token name to be preserved, got %q", migratedToken.Name)
	}

	inserted := model.Token{
		UserId:             8,
		Name:               "long-token",
		Key:                longKey,
		Status:             common.TokenStatusEnabled,
		CreatedTime:        1,
		AccessedTime:       1,
		ExpiredTime:        -1,
		RemainQuota:        200,
		UnlimitedQuota:     true,
		ModelLimitsEnabled: false,
		ModelLimits:        "",
		AllowIps:           common.GetPointer(""),
		UsedQuota:          0,
		Group:              "default",
		CrossGroupRetry:    false,
	}
	if err := db.Create(&inserted).Error; err != nil {
		t.Fatalf("failed to insert long token after migration: %v", err)
	}

	var fetched model.Token
	if err := db.First(&fetched, "id = ?", inserted.Id).Error; err != nil {
		t.Fatalf("failed to fetch long token after migration: %v", err)
	}
	if fetched.Key != longKey {
		t.Fatalf("expected long token key %q, got %q", longKey, fetched.Key)
	}
}

func TestTokenAutoMigrateUsesVarchar128KeyColumn(t *testing.T) {
	db := setupTokenControllerTestDB(t)

	if got := getTokenKeyColumnType(t, db, "sqlite"); got != "varchar(128)" {
		t.Fatalf("expected key column type varchar(128), got %q", got)
	}
}

func TestTokenMigrationFromChar48ToVarchar128(t *testing.T) {
	db := openTokenControllerTestDB(t)
	runTokenMigrationCompatibilityTest(t, db, "sqlite", nil)
}

func TestTokenMigrationFromChar48ToVarchar128MySQL(t *testing.T) {
	dsn := os.Getenv("TEST_MYSQL_DSN")
	if dsn == "" {
		t.Skip("set TEST_MYSQL_DSN to run mysql migration compatibility test")
	}

	db, managedTokensTable := openTokenControllerExternalDB(t, "mysql", dsn)
	runTokenMigrationCompatibilityTest(t, db, "mysql", managedTokensTable)
}

func TestTokenMigrationFromChar48ToVarchar128Postgres(t *testing.T) {
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("set TEST_POSTGRES_DSN to run postgres migration compatibility test")
	}

	db, managedTokensTable := openTokenControllerExternalDB(t, "postgres", dsn)
	runTokenMigrationCompatibilityTest(t, db, "postgres", managedTokensTable)
}

func TestGetAllTokensMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, 1, "list-token", "abcd1234efgh5678")
	seedToken(t, db, 2, "other-user-token", "zzzz1234yyyy5678")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/token/?p=1&size=10", nil, 1)
	GetAllTokens(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var page tokenPageResponse
	if err := common.Unmarshal(response.Data, &page); err != nil {
		t.Fatalf("failed to decode token page response: %v", err)
	}
	if len(page.Items) != 1 {
		t.Fatalf("expected exactly one token, got %d", len(page.Items))
	}
	if page.Items[0].Key != token.GetMaskedKey() {
		t.Fatalf("expected masked key %q, got %q", token.GetMaskedKey(), page.Items[0].Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("list response leaked raw token key: %s", recorder.Body.String())
	}
}

func TestSearchTokensMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, 1, "searchable-token", "ijkl1234mnop5678")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/token/search?keyword=searchable-token&p=1&size=10", nil, 1)
	SearchTokens(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var page tokenPageResponse
	if err := common.Unmarshal(response.Data, &page); err != nil {
		t.Fatalf("failed to decode search response: %v", err)
	}
	if len(page.Items) != 1 {
		t.Fatalf("expected exactly one search result, got %d", len(page.Items))
	}
	if page.Items[0].Key != token.GetMaskedKey() {
		t.Fatalf("expected masked search key %q, got %q", token.GetMaskedKey(), page.Items[0].Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("search response leaked raw token key: %s", recorder.Body.String())
	}
}

func TestGetTokenMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, 1, "detail-token", "qrst1234uvwx5678")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/token/"+strconv.Itoa(token.Id), nil, 1)
	ctx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
	GetToken(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var detail tokenResponseItem
	if err := common.Unmarshal(response.Data, &detail); err != nil {
		t.Fatalf("failed to decode token detail response: %v", err)
	}
	if detail.Key != token.GetMaskedKey() {
		t.Fatalf("expected masked detail key %q, got %q", token.GetMaskedKey(), detail.Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("detail response leaked raw token key: %s", recorder.Body.String())
	}
}

func TestUpdateTokenMasksKeyInResponse(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, 1, "editable-token", "yzab1234cdef5678")

	body := map[string]any{
		"id":                   token.Id,
		"name":                 "updated-token",
		"expired_time":         -1,
		"remain_quota":         100,
		"unlimited_quota":      true,
		"model_limits_enabled": false,
		"model_limits":         "",
		"group":                "default",
		"cross_group_retry":    false,
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/", body, 1)
	UpdateToken(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var detail tokenResponseItem
	if err := common.Unmarshal(response.Data, &detail); err != nil {
		t.Fatalf("failed to decode token update response: %v", err)
	}
	if detail.Key != token.GetMaskedKey() {
		t.Fatalf("expected masked update key %q, got %q", token.GetMaskedKey(), detail.Key)
	}
	if strings.Contains(recorder.Body.String(), token.Key) {
		t.Fatalf("update response leaked raw token key: %s", recorder.Body.String())
	}
}

func boolPtr(b bool) *bool    { return &b }
func intPtr(i int) *int       { return &i }
func int64Ptr(i int64) *int64 { return &i }
func strPtr(s string) *string { return &s }

func TestUpdateTokenBatchRejectsEmptyIds(t *testing.T) {
	setupTokenControllerTestDB(t)

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":   []int{},
		"group": "vip",
	}, 1)
	UpdateTokenBatch(ctx)

	resp := decodeAPIResponse(t, recorder)
	if resp.Success {
		t.Fatalf("expected failure for empty ids")
	}
}

func TestUpdateTokenBatchRejectsTooManyIds(t *testing.T) {
	setupTokenControllerTestDB(t)

	ids := make([]int, 101)
	for i := range ids {
		ids[i] = i + 1
	}
	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":   ids,
		"group": "vip",
	}, 1)
	UpdateTokenBatch(ctx)

	resp := decodeAPIResponse(t, recorder)
	if resp.Success {
		t.Fatalf("expected failure when ids > 100")
	}
}

func TestUpdateTokenBatchRejectsNoUpdateFields(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, 1, "no-fields-token", "nofield1234567890")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids": []int{token.Id},
	}, 1)
	UpdateTokenBatch(ctx)

	resp := decodeAPIResponse(t, recorder)
	if resp.Success {
		t.Fatalf("expected failure when no update fields provided")
	}
}

func TestUpdateTokenBatchRejectsNegativeQuota(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, 1, "neg-quota-token", "negquota123456789")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":              []int{token.Id},
		"remain_quota":     -1,
		"unlimited_quota":  false,
	}, 1)
	UpdateTokenBatch(ctx)

	resp := decodeAPIResponse(t, recorder)
	if resp.Success {
		t.Fatalf("expected failure for negative quota")
	}
}

func TestUpdateTokenBatchUpdatesGroup(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	t1 := seedToken(t, db, 1, "grp-token-1", "grptoken1aaaaaaaa")
	t2 := seedToken(t, db, 1, "grp-token-2", "grptoken2bbbbbbbb")
	seedToken(t, db, 2, "other-user-token", "otherusercccccccc") // belongs to user 2

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":   []int{t1.Id, t2.Id},
		"group": "premium",
	}, 1)
	UpdateTokenBatch(ctx)

	resp := decodeAPIResponse(t, recorder)
	if !resp.Success {
		t.Fatalf("expected success, got message: %s", resp.Message)
	}

	var count int
	if err := common.Unmarshal(resp.Data, &count); err != nil {
		t.Fatalf("failed to decode count: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 updated tokens, got %d", count)
	}

	var updated []model.Token
	if err := db.Where("id IN (?)", []int{t1.Id, t2.Id}).Find(&updated).Error; err != nil {
		t.Fatalf("failed to fetch updated tokens: %v", err)
	}
	for _, tok := range updated {
		if tok.Group != "premium" {
			t.Fatalf("expected group 'premium', got %q for token %d", tok.Group, tok.Id)
		}
	}
}

func TestUpdateTokenBatchIgnoresOtherUsersTokens(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	mine := seedToken(t, db, 1, "my-token", "mytoken123456789a")
	theirs := seedToken(t, db, 2, "their-token", "theirtoken1234567")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":   []int{mine.Id, theirs.Id},
		"group": "hacked",
	}, 1)
	UpdateTokenBatch(ctx)

	resp := decodeAPIResponse(t, recorder)
	if !resp.Success {
		t.Fatalf("expected success, got message: %s", resp.Message)
	}

	var theirsAfter model.Token
	if err := db.First(&theirsAfter, theirs.Id).Error; err != nil {
		t.Fatalf("failed to fetch other user's token: %v", err)
	}
	if theirsAfter.Group == "hacked" {
		t.Fatalf("batch edit must not update another user's token")
	}
}

func TestUpdateTokenBatchUpdatesExpiredTime(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	tok := seedToken(t, db, 1, "exp-token", "exptoken123456789")

	const newExpiry int64 = 9999999999
	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":          []int{tok.Id},
		"expired_time": newExpiry,
	}, 1)
	UpdateTokenBatch(ctx)

	if !decodeAPIResponse(t, recorder).Success {
		t.Fatalf("expected success updating expired_time")
	}

	var updated model.Token
	if err := db.First(&updated, tok.Id).Error; err != nil {
		t.Fatalf("failed to fetch token: %v", err)
	}
	if updated.ExpiredTime != newExpiry {
		t.Fatalf("expected expired_time %d, got %d", newExpiry, updated.ExpiredTime)
	}
}

func TestUpdateTokenBatchUpdatesModelLimitsAndEnablesFlag(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	tok := seedToken(t, db, 1, "ml-token", "mltoken1234567890")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":          []int{tok.Id},
		"model_limits": "gpt-4,claude-3",
	}, 1)
	UpdateTokenBatch(ctx)

	if !decodeAPIResponse(t, recorder).Success {
		t.Fatalf("expected success updating model_limits")
	}

	var updated model.Token
	if err := db.First(&updated, tok.Id).Error; err != nil {
		t.Fatalf("failed to fetch token: %v", err)
	}
	if updated.ModelLimits != "gpt-4,claude-3" {
		t.Fatalf("expected model_limits 'gpt-4,claude-3', got %q", updated.ModelLimits)
	}
	if !updated.ModelLimitsEnabled {
		t.Fatalf("expected model_limits_enabled to be true when model_limits is non-empty")
	}
}

func TestUpdateTokenBatchDisablesModelLimitsFlagWhenEmpty(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	tok := seedToken(t, db, 1, "ml-clear-token", "mlcleartoken12345")
	db.Model(tok).Updates(map[string]interface{}{"model_limits": "gpt-4", "model_limits_enabled": true})

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":          []int{tok.Id},
		"model_limits": "",
	}, 1)
	UpdateTokenBatch(ctx)

	if !decodeAPIResponse(t, recorder).Success {
		t.Fatalf("expected success clearing model_limits")
	}

	var updated model.Token
	if err := db.First(&updated, tok.Id).Error; err != nil {
		t.Fatalf("failed to fetch token: %v", err)
	}
	if updated.ModelLimitsEnabled {
		t.Fatalf("expected model_limits_enabled to be false when model_limits is empty")
	}
}

func TestUpdateTokenBatchUpdatesUnlimitedQuotaAndRemainQuota(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	tok := seedToken(t, db, 1, "quota-token", "quotatoken1234567")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":             []int{tok.Id},
		"unlimited_quota": false,
		"remain_quota":    500,
	}, 1)
	UpdateTokenBatch(ctx)

	if !decodeAPIResponse(t, recorder).Success {
		t.Fatalf("expected success updating quota")
	}

	var updated model.Token
	if err := db.First(&updated, tok.Id).Error; err != nil {
		t.Fatalf("failed to fetch token: %v", err)
	}
	if updated.UnlimitedQuota {
		t.Fatalf("expected unlimited_quota to be false")
	}
	if updated.RemainQuota != 500 {
		t.Fatalf("expected remain_quota 500, got %d", updated.RemainQuota)
	}
}

func TestUpdateTokenBatchUpdatesCrossGroupRetry(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	tok := seedToken(t, db, 1, "cgr-token", "cgrtoken123456789")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":               []int{tok.Id},
		"cross_group_retry": true,
	}, 1)
	UpdateTokenBatch(ctx)

	if !decodeAPIResponse(t, recorder).Success {
		t.Fatalf("expected success updating cross_group_retry")
	}

	var updated model.Token
	if err := db.First(&updated, tok.Id).Error; err != nil {
		t.Fatalf("failed to fetch token: %v", err)
	}
	if !updated.CrossGroupRetry {
		t.Fatalf("expected cross_group_retry to be true")
	}
}

func TestUpdateTokenBatchReturnsZeroWhenNoMatchingTokens(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	seedToken(t, db, 2, "other-user-token", "otheruserXXXXXXXX")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPut, "/api/token/batch", map[string]any{
		"ids":   []int{99999},
		"group": "vip",
	}, 1)
	UpdateTokenBatch(ctx)

	resp := decodeAPIResponse(t, recorder)
	if !resp.Success {
		t.Fatalf("expected success (0 updated), got message: %s", resp.Message)
	}

	var count int
	if err := common.Unmarshal(resp.Data, &count); err != nil {
		t.Fatalf("failed to decode count: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected 0 updated tokens, got %d", count)
	}
}

func TestGetTokenKeyRequiresOwnershipAndReturnsFullKey(t *testing.T) {
	db := setupTokenControllerTestDB(t)
	token := seedToken(t, db, 1, "owned-token", "owner1234token5678")

	authorizedCtx, authorizedRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/token/"+strconv.Itoa(token.Id)+"/key", nil, 1)
	authorizedCtx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
	GetTokenKey(authorizedCtx)

	authorizedResponse := decodeAPIResponse(t, authorizedRecorder)
	if !authorizedResponse.Success {
		t.Fatalf("expected authorized key fetch to succeed, got message: %s", authorizedResponse.Message)
	}

	var keyData tokenKeyResponse
	if err := common.Unmarshal(authorizedResponse.Data, &keyData); err != nil {
		t.Fatalf("failed to decode token key response: %v", err)
	}
	if keyData.Key != token.GetFullKey() {
		t.Fatalf("expected full key %q, got %q", token.GetFullKey(), keyData.Key)
	}

	unauthorizedCtx, unauthorizedRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/token/"+strconv.Itoa(token.Id)+"/key", nil, 2)
	unauthorizedCtx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
	GetTokenKey(unauthorizedCtx)

	unauthorizedResponse := decodeAPIResponse(t, unauthorizedRecorder)
	if unauthorizedResponse.Success {
		t.Fatalf("expected unauthorized key fetch to fail")
	}
	if strings.Contains(unauthorizedRecorder.Body.String(), token.Key) {
		t.Fatalf("unauthorized key response leaked raw token key: %s", unauthorizedRecorder.Body.String())
	}
}
