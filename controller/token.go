package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

func buildMaskedTokenResponse(token *model.Token) *model.Token {
	if token == nil {
		return nil
	}
	maskedToken := *token
	maskedToken.Key = token.GetMaskedKey()
	return &maskedToken
}

func buildMaskedTokenResponses(tokens []*model.Token) []*model.Token {
	maskedTokens := make([]*model.Token, 0, len(tokens))
	for _, token := range tokens {
		maskedTokens = append(maskedTokens, buildMaskedTokenResponse(token))
	}
	return maskedTokens
}

func GetAllTokens(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	tokens, err := model.GetAllUserTokens(userId, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	total, _ := model.CountUserTokens(userId)
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildMaskedTokenResponses(tokens))
	common.ApiSuccess(c, pageInfo)
}

func SearchTokens(c *gin.Context) {
	userId := c.GetInt("id")
	keyword := c.Query("keyword")
	token := c.Query("token")

	pageInfo := common.GetPageQuery(c)

	tokens, total, err := model.SearchUserTokens(userId, keyword, token, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildMaskedTokenResponses(tokens))
	common.ApiSuccess(c, pageInfo)
}

func GetToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, buildMaskedTokenResponse(token))
}

func GetTokenKey(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	token, err := model.GetTokenByIds(id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"key": token.GetFullKey(),
	})
}

func GetTokenStatus(c *gin.Context) {
	tokenId := c.GetInt("token_id")
	userId := c.GetInt("id")
	token, err := model.GetTokenByIds(tokenId, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	expiredAt := token.ExpiredTime
	if expiredAt == -1 {
		expiredAt = 0
	}
	c.JSON(http.StatusOK, gin.H{
		"object":          "credit_summary",
		"total_granted":   token.RemainQuota,
		"total_used":      0, // not supported currently
		"total_available": token.RemainQuota,
		"expires_at":      expiredAt * 1000,
	})
}

func GetTokenUsage(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "No Authorization header",
		})
		return
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Invalid Bearer token",
		})
		return
	}
	tokenKey := parts[1]

	token, err := model.GetTokenByKey(strings.TrimPrefix(tokenKey, "sk-"), false)
	if err != nil {
		common.SysError("failed to get token by key: " + err.Error())
		common.ApiErrorI18n(c, i18n.MsgTokenGetInfoFailed)
		return
	}

	expiredAt := token.ExpiredTime
	if expiredAt == -1 {
		expiredAt = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    true,
		"message": "ok",
		"data": gin.H{
			"object":               "token_usage",
			"name":                 token.Name,
			"total_granted":        token.RemainQuota + token.UsedQuota,
			"total_used":           token.UsedQuota,
			"total_available":      token.RemainQuota,
			"unlimited_quota":      token.UnlimitedQuota,
			"model_limits":         token.GetModelLimitsMap(),
			"model_limits_enabled": token.ModelLimitsEnabled,
			"expires_at":           expiredAt,
		},
	})
}

func AddToken(c *gin.Context) {
	token := model.Token{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if len(token.Name) > 50 {
		common.ApiErrorI18n(c, i18n.MsgTokenNameTooLong)
		return
	}
	// 非无限额度时，检查额度值是否超出有效范围
	if !token.UnlimitedQuota {
		if token.RemainQuota < 0 {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaNegative)
			return
		}
		maxQuotaValue := int((1000000000 * common.QuotaPerUnit))
		if token.RemainQuota > maxQuotaValue {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaExceedMax, map[string]any{"Max": maxQuotaValue})
			return
		}
	}
	// 检查用户令牌数量是否已达上限
	maxTokens := operation_setting.GetMaxUserTokens()
	count, err := model.CountUserTokens(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(count) >= maxTokens {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("已达到最大令牌数量限制 (%d)", maxTokens),
		})
		return
	}
	key, err := common.GenerateKey()
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgTokenGenerateFailed)
		common.SysLog("failed to generate token key: " + err.Error())
		return
	}
	cleanToken := model.Token{
		UserId:             c.GetInt("id"),
		Name:               token.Name,
		Key:                key,
		CreatedTime:        common.GetTimestamp(),
		AccessedTime:       common.GetTimestamp(),
		ExpiredTime:        token.ExpiredTime,
		RemainQuota:        token.RemainQuota,
		UnlimitedQuota:     token.UnlimitedQuota,
		ModelLimitsEnabled: token.ModelLimitsEnabled,
		ModelLimits:        token.ModelLimits,
		AllowIps:           token.AllowIps,
		Group:              token.Group,
		CrossGroupRetry:    token.CrossGroupRetry,
	}
	err = cleanToken.Insert()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

const maxBatchCreateTokens = 50
const maxTokenNameLength = 50

type TokenBatchCreateRequest struct {
	Names              []string `json:"names"`
	ExpiredTime        int64    `json:"expired_time"`
	RemainQuota        int      `json:"remain_quota"`
	UnlimitedQuota     bool     `json:"unlimited_quota"`
	ModelLimitsEnabled bool     `json:"model_limits_enabled"`
	ModelLimits        string   `json:"model_limits"`
	AllowIps           *string  `json:"allow_ips"`
	Group              string   `json:"group"`
	CrossGroupRetry    bool     `json:"cross_group_retry"`
}

type TokenBatchCreateItem struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

type TokenBatchCreateError struct {
	Name   string `json:"name"`
	Reason string `json:"reason"`
}

type TokenBatchCreateResponse struct {
	Created int                     `json:"created"`
	Failed  int                     `json:"failed"`
	Items   []TokenBatchCreateItem  `json:"items"`
	Errors  []TokenBatchCreateError `json:"errors"`
}

func normalizeBatchTokenNames(names []string) ([]string, error) {
	if len(names) < 1 {
		return nil, fmt.Errorf("token name count must be between 1 and %d", maxBatchCreateTokens)
	}
	if len(names) > maxBatchCreateTokens {
		return nil, fmt.Errorf("token name count cannot exceed %d", maxBatchCreateTokens)
	}

	normalized := make([]string, 0, len(names))
	seen := make(map[string]bool, len(names))
	for _, rawName := range names {
		name := strings.TrimSpace(rawName)
		if name == "" {
			return nil, fmt.Errorf("token name cannot be empty")
		}
		if utf8.RuneCountInString(name) > maxTokenNameLength {
			return nil, fmt.Errorf("token name cannot exceed %d characters", maxTokenNameLength)
		}
		if seen[name] {
			return nil, fmt.Errorf("duplicate token name in the same batch: %s", name)
		}
		seen[name] = true
		normalized = append(normalized, name)
	}
	return normalized, nil
}

func validateBatchTokenQuota(req TokenBatchCreateRequest) error {
	if req.UnlimitedQuota {
		return nil
	}
	if req.RemainQuota < 0 {
		return fmt.Errorf("token quota cannot be negative")
	}
	maxQuotaValue := int(1000000000 * common.QuotaPerUnit)
	if req.RemainQuota > maxQuotaValue {
		return fmt.Errorf("token quota cannot exceed %d", maxQuotaValue)
	}
	return nil
}

func CreateTokenBatch(c *gin.Context) {
	req := TokenBatchCreateRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	names, err := normalizeBatchTokenNames(req.Names)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := validateBatchTokenQuota(req); err != nil {
		common.ApiError(c, err)
		return
	}

	userId := c.GetInt("id")
	maxTokens := operation_setting.GetMaxUserTokens()
	count, err := model.CountUserTokens(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(count)+len(names) > maxTokens {
		common.ApiErrorMsg(c, fmt.Sprintf("token count exceeds maximum limit (%d)", maxTokens))
		return
	}

	now := common.GetTimestamp()
	result := TokenBatchCreateResponse{
		Items:  make([]TokenBatchCreateItem, 0, len(names)),
		Errors: make([]TokenBatchCreateError, 0),
	}

	for _, name := range names {
		key, err := common.GenerateKey()
		if err != nil {
			reason := "failed to generate token key"
			common.SysLog("failed to generate token key: " + err.Error())
			result.Failed++
			result.Items = append(result.Items, TokenBatchCreateItem{
				Name:   name,
				Status: "failed",
				Reason: reason,
			})
			result.Errors = append(result.Errors, TokenBatchCreateError{
				Name:   name,
				Reason: reason,
			})
			continue
		}

		token := model.Token{
			UserId:             userId,
			Name:               name,
			Key:                key,
			CreatedTime:        now,
			AccessedTime:       now,
			ExpiredTime:        req.ExpiredTime,
			RemainQuota:        req.RemainQuota,
			UnlimitedQuota:     req.UnlimitedQuota,
			ModelLimitsEnabled: req.ModelLimitsEnabled,
			ModelLimits:        req.ModelLimits,
			AllowIps:           req.AllowIps,
			Group:              req.Group,
			CrossGroupRetry:    req.CrossGroupRetry,
		}
		if err := token.Insert(); err != nil {
			reason := err.Error()
			result.Failed++
			result.Items = append(result.Items, TokenBatchCreateItem{
				Name:   name,
				Status: "failed",
				Reason: reason,
			})
			result.Errors = append(result.Errors, TokenBatchCreateError{
				Name:   name,
				Reason: reason,
			})
			continue
		}

		result.Created++
		result.Items = append(result.Items, TokenBatchCreateItem{
			Name:   name,
			Status: "created",
		})
	}

	common.ApiSuccess(c, result)
}

func DeleteToken(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	err := model.DeleteTokenById(id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateToken(c *gin.Context) {
	userId := c.GetInt("id")
	statusOnly := c.Query("status_only")
	token := model.Token{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if len(token.Name) > 50 {
		common.ApiErrorI18n(c, i18n.MsgTokenNameTooLong)
		return
	}
	if !token.UnlimitedQuota {
		if token.RemainQuota < 0 {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaNegative)
			return
		}
		maxQuotaValue := int((1000000000 * common.QuotaPerUnit))
		if token.RemainQuota > maxQuotaValue {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaExceedMax, map[string]any{"Max": maxQuotaValue})
			return
		}
	}
	cleanToken, err := model.GetTokenByIds(token.Id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if token.Status == common.TokenStatusEnabled {
		if cleanToken.Status == common.TokenStatusExpired && cleanToken.ExpiredTime <= common.GetTimestamp() && cleanToken.ExpiredTime != -1 {
			common.ApiErrorI18n(c, i18n.MsgTokenExpiredCannotEnable)
			return
		}
		if cleanToken.Status == common.TokenStatusExhausted && cleanToken.RemainQuota <= 0 && !cleanToken.UnlimitedQuota {
			common.ApiErrorI18n(c, i18n.MsgTokenExhaustedCannotEable)
			return
		}
	}
	if statusOnly != "" {
		cleanToken.Status = token.Status
	} else {
		// If you add more fields, please also update token.Update()
		cleanToken.Name = token.Name
		cleanToken.ExpiredTime = token.ExpiredTime
		cleanToken.RemainQuota = token.RemainQuota
		cleanToken.UnlimitedQuota = token.UnlimitedQuota
		cleanToken.ModelLimitsEnabled = token.ModelLimitsEnabled
		cleanToken.ModelLimits = token.ModelLimits
		cleanToken.AllowIps = token.AllowIps
		cleanToken.Group = token.Group
		cleanToken.CrossGroupRetry = token.CrossGroupRetry
	}
	err = cleanToken.Update()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    buildMaskedTokenResponse(cleanToken),
	})
}

type TokenBatch struct {
	Ids []int `json:"ids"`
}

type TokenBatchUpdate struct {
	Ids             []int   `json:"ids"`
	ExpiredTime     *int64  `json:"expired_time"`
	RemainQuota     *int    `json:"remain_quota"`
	UnlimitedQuota  *bool   `json:"unlimited_quota"`
	ModelLimits     *string `json:"model_limits"`
	AllowIps        *string `json:"allow_ips"`
	Group           *string `json:"group"`
	CrossGroupRetry *bool   `json:"cross_group_retry"`
}

func DeleteTokenBatch(c *gin.Context) {
	tokenBatch := TokenBatch{}
	if err := c.ShouldBindJSON(&tokenBatch); err != nil || len(tokenBatch.Ids) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	userId := c.GetInt("id")
	count, err := model.BatchDeleteTokens(tokenBatch.Ids, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
}

func GetTokenKeysBatch(c *gin.Context) {
	tokenBatch := TokenBatch{}
	if err := c.ShouldBindJSON(&tokenBatch); err != nil || len(tokenBatch.Ids) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if len(tokenBatch.Ids) > 100 {
		common.ApiErrorI18n(c, i18n.MsgBatchTooMany, map[string]any{"Max": 100})
		return
	}
	userId := c.GetInt("id")
	tokens, err := model.GetTokenKeysByIds(tokenBatch.Ids, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	keysMap := make(map[int]string)
	for _, t := range tokens {
		keysMap[t.Id] = t.GetFullKey()
	}
	common.ApiSuccess(c, gin.H{"keys": keysMap})
}

func UpdateTokenBatch(c *gin.Context) {
	req := TokenBatchUpdate{}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Ids) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if len(req.Ids) > 100 {
		common.ApiErrorI18n(c, i18n.MsgBatchTooMany, map[string]any{"Max": 100})
		return
	}

	if req.RemainQuota != nil && req.UnlimitedQuota != nil && !*req.UnlimitedQuota {
		if *req.RemainQuota < 0 {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaNegative)
			return
		}
		maxQuotaValue := int(1000000000 * common.QuotaPerUnit)
		if *req.RemainQuota > maxQuotaValue {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaExceedMax, map[string]any{"Max": maxQuotaValue})
			return
		}
	}

	updateFields := make(map[string]interface{})
	if req.ExpiredTime != nil {
		updateFields["expired_time"] = *req.ExpiredTime
	}
	if req.RemainQuota != nil {
		updateFields["remain_quota"] = *req.RemainQuota
	}
	if req.UnlimitedQuota != nil {
		updateFields["unlimited_quota"] = *req.UnlimitedQuota
	}
	if req.ModelLimits != nil {
		updateFields["model_limits"] = *req.ModelLimits
		updateFields["model_limits_enabled"] = len(strings.TrimSpace(*req.ModelLimits)) > 0
	}
	if req.AllowIps != nil {
		updateFields["allow_ips"] = *req.AllowIps
	}
	if req.Group != nil {
		updateFields["group"] = *req.Group
	}
	if req.CrossGroupRetry != nil {
		updateFields["cross_group_retry"] = *req.CrossGroupRetry
	}

	if len(updateFields) == 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	userId := c.GetInt("id")
	count, err := model.BatchUpdateTokens(req.Ids, userId, updateFields)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
}
