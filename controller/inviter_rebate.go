package controller

import (
	"errors"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetInviterRebateRankings 管理端邀请返利排行榜（P3.1）。
// query：metric=rebate|invitees（默认 rebate）、period=month|quarter|year|all
// （默认 month）、分页参数走 common.GetPageQuery。聚合口径见
// model.GetInviterRebateRankings 注释（granted = released + locked）。
func GetInviterRebateRankings(c *gin.Context) {
	metric := c.DefaultQuery("metric", model.InviterRebateRankingMetricRebate)
	switch metric {
	case model.InviterRebateRankingMetricRebate, model.InviterRebateRankingMetricInvitees:
	default:
		common.ApiErrorT(c, "Invalid inviter rebate rankings metric: {{value}}", map[string]any{"value": metric})
		return
	}

	period := c.DefaultQuery("period", model.InviterRebateRankingPeriodMonth)
	switch period {
	case model.InviterRebateRankingPeriodMonth, model.InviterRebateRankingPeriodQuarter,
		model.InviterRebateRankingPeriodYear, model.InviterRebateRankingPeriodAll:
	default:
		common.ApiErrorT(c, "Invalid inviter rebate rankings period: {{value}}", map[string]any{"value": period})
		return
	}

	pageInfo := common.GetPageQuery(c)
	rows, total, err := model.GetInviterRebateRankings(metric, period, pageInfo.Page, pageInfo.PageSize, time.Now())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(rows)
	common.ApiSuccess(c, pageInfo)
}

// GetMyInviterRebateSummary 当前登录用户（邀请人视角）的返利钱包汇总
// （P4.1）：状态分桶金额、返利笔数、产生返利的被邀请人数与阶梯进度。
// 无台账时返回全零汇总。aff_quota / aff_history 等账户字段走 /api/user/self，
// 这里不重复。
func GetMyInviterRebateSummary(c *gin.Context) {
	summary, err := model.GetInviterRebateSelfSummary(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}

// GetMyInviterRebateInvitees 分页返回当前登录用户的下线贡献列表
// （P4.1）：按累计贡献降序，用户名脱敏展示。被邀请人已被硬删除的行保留
// （InviteeMaskedName 为空，前端显示"已注销用户"）。
func GetMyInviterRebateInvitees(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	rows, total, err := model.GetInviterRebateInvitees(c.GetInt("id"), pageInfo.Page, pageInfo.PageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(rows)
	common.ApiSuccess(c, pageInfo)
}

// inviterRebateLedgerFilterFromQuery 解析台账流水/汇总共用的一组筛选参数：
// inviter_id / invitee_id（正整数）、status（released|locked|voided）、
// source_type（topup|redemption）、start_timestamp / end_timestamp（Unix 秒，
// 闭区间）。非法值返回错误而非静默忽略，避免管理员误以为筛上了。ok=false
// 表示已写响应，调用方直接 return。
func inviterRebateLedgerFilterFromQuery(c *gin.Context) (model.InviterRebateLedgerFilter, bool) {
	filter := model.InviterRebateLedgerFilter{
		Status:     c.Query("status"),
		SourceType: c.Query("source_type"),
	}
	for _, param := range []struct {
		name   string
		target *int
	}{
		{"inviter_id", &filter.InviterId},
		{"invitee_id", &filter.InviteeId},
	} {
		raw := c.Query(param.name)
		if raw == "" {
			continue
		}
		value, err := strconv.Atoi(raw)
		if err != nil || value <= 0 {
			common.ApiErrorT(c, "Invalid inviter rebate ledger parameter {{param}}: {{value}}", map[string]any{"param": param.name, "value": raw})
			return filter, false
		}
		*param.target = value
	}
	if filter.Status != "" {
		switch filter.Status {
		case model.InviterRebateStatusReleased, model.InviterRebateStatusLocked, model.InviterRebateStatusVoided:
		default:
			common.ApiErrorT(c, "Invalid inviter rebate ledger parameter {{param}}: {{value}}", map[string]any{"param": "status", "value": filter.Status})
			return filter, false
		}
	}
	if filter.SourceType != "" {
		switch filter.SourceType {
		case model.InviterRebateSourceTopUp, model.InviterRebateSourceRedemption:
		default:
			common.ApiErrorT(c, "Invalid inviter rebate ledger parameter {{param}}: {{value}}", map[string]any{"param": "source_type", "value": filter.SourceType})
			return filter, false
		}
	}
	for _, param := range []struct {
		name   string
		target *int64
	}{
		{"start_timestamp", &filter.StartTimestamp},
		{"end_timestamp", &filter.EndTimestamp},
	} {
		raw := c.Query(param.name)
		if raw == "" {
			continue
		}
		value, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || value <= 0 {
			common.ApiErrorT(c, "Invalid inviter rebate ledger parameter {{param}}: {{value}}", map[string]any{"param": param.name, "value": raw})
			return filter, false
		}
		*param.target = value
	}
	return filter, true
}

// GetInviterRebateLedger 管理端台账流水列表（P5.1）：按 id 倒序分页，
// 筛选 inviter/invitee/状态/来源/时间。台账全字段可见（管理员可见
// locked_reason / voided_reason，与 A 侧脱敏口径不同）。
func GetInviterRebateLedger(c *gin.Context) {
	filter, ok := inviterRebateLedgerFilterFromQuery(c)
	if !ok {
		return
	}
	pageInfo := common.GetPageQuery(c)
	rows, total, err := model.GetInviterRebateLedger(filter, pageInfo.Page, pageInfo.PageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(rows)
	common.ApiSuccess(c, pageInfo)
}

// GetInviterRebateLedgerSummary 管理端台账汇总卡片（P5.1）：状态分桶 +
// 自邀嫌疑冻结告警，与流水列表共用同一组筛选参数。
func GetInviterRebateLedgerSummary(c *gin.Context) {
	filter, ok := inviterRebateLedgerFilterFromQuery(c)
	if !ok {
		return
	}
	summary, err := model.GetInviterRebateLedgerSummary(filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}

// handleInviterRebateAdminOp 管理端台账人工处置（P5.2）共用骨架：解析
// :id → 调模型层单事务处置 → 提交后写业务日志 → 响应处置结果。审计走
// manageUserQuota 同款 defer 模式（失败路径带 failure_reason），账务变动
// 事实全部在 model 层事务里，控制器只做参数解析、审计与日志。
func handleInviterRebateAdminOp(c *gin.Context, action string, op func(int) (*model.InviterRebateAdminOpResult, error)) {
	rawId := c.Param("id")
	id, err := strconv.Atoi(rawId)
	if err != nil || id <= 0 {
		common.ApiErrorT(c, "Invalid inviter rebate ledger parameter {{param}}: {{value}}", map[string]any{"param": "id", "value": rawId})
		return
	}
	params := model.AuditFields{"ledger_id": id}
	success := false
	defer func() {
		content := auditContentEN(action, params)
		if !success {
			// 失败请求没有已提交的账务变动可渲染。
			content = "Failed inviter rebate manual operation"
		}
		model.RecordOperationAuditLog(c.GetInt("id"), c.GetInt("role"), content, c.ClientIP(), action, params,
			auditOperatorInfo(c), &model.AuditRequestInfo{
				Method: c.Request.Method, Route: c.FullPath(), Status: c.Writer.Status(), Success: success,
			}, c)
		markAuditLogged(c)
	}()

	result, err := op(id)
	if err != nil {
		switch {
		case errors.Is(err, model.ErrInviterRebateRowNotFound):
			params["failure_reason"] = "ledger_not_found"
			common.ApiErrorT(c, "Inviter rebate row does not exist")
		case errors.Is(err, model.ErrInviterRebateRowNotLocked):
			params["failure_reason"] = "ledger_not_locked"
			common.ApiErrorT(c, "Inviter rebate row is not locked")
		case errors.Is(err, model.ErrInviterRebateRowVoided):
			params["failure_reason"] = "ledger_already_voided"
			common.ApiErrorT(c, "Inviter rebate row is already voided")
		default:
			params["failure_reason"] = "database_error"
			common.ApiError(c, err)
		}
		return
	}

	params["inviter_id"] = result.InviterId
	params["invitee_id"] = result.Row.InviteeId
	params["status"] = result.Row.Status
	params["quota"] = result.Quota
	if result.Debt > 0 {
		params["debt"] = result.Debt
	}
	success = true
	common.ApiSuccess(c, result)
}

// AdminVoidInviterRebate 管理端人工作废一笔冻结返利（POST
// /api/inviter_rebate/ledger/:id/void）：locked 行翻
// voided(admin_void) + 冻结池等额回落，详见 model.AdminVoidInviterRebate。
func AdminVoidInviterRebate(c *gin.Context) {
	handleInviterRebateAdminOp(c, "inviter_rebate.admin_void", model.AdminVoidInviterRebate)
}

// AdminReleaseInviterRebate 管理端人工放行一笔冻结返利（POST
// /api/inviter_rebate/ledger/:id/release）：locked 行翻 released +
// 邀请人 aff_quota/aff_history 入账 + 冻结池回落，详见
// model.AdminReleaseInviterRebate。入账成功后给邀请人写一条可见系统日志。
func AdminReleaseInviterRebate(c *gin.Context) {
	handleInviterRebateAdminOp(c, "inviter_rebate.admin_release", func(id int) (*model.InviterRebateAdminOpResult, error) {
		result, err := model.AdminReleaseInviterRebate(id)
		if err == nil && result.Quota > 0 {
			model.RecordLog(result.InviterId, model.LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} released after manual review", map[string]any{"quota": logger.FormatQuota(result.Quota)}))
		}
		return result, err
	})
}

// AdminClawbackInviterRebate 来源充值退款回收（POST
// /api/inviter_rebate/ledger/:id/clawback）：管理员在支付平台确认
// 退款后人工触发，按台账状态分三种口径回收，详见 model.AdminClawbackInviterRebate。
// 回收到账时给邀请人写一条可见系统日志；产生欠账时另写一条仅管理员可见的
// 告警日志（user_id=0），供站长人工决定是否追讨。
func AdminClawbackInviterRebate(c *gin.Context) {
	handleInviterRebateAdminOp(c, "inviter_rebate.admin_clawback", func(id int) (*model.InviterRebateAdminOpResult, error) {
		result, err := model.AdminClawbackInviterRebate(id)
		if err != nil {
			return result, err
		}
		if result.Quota > 0 {
			model.RecordLog(result.InviterId, model.LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} recovered due to invitee refund", map[string]any{"quota": logger.FormatQuota(result.Quota)}))
		}
		if result.Debt > 0 {
			model.RecordLog(0, model.LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} debt outstanding after refund clawback, manual review required", map[string]any{
				"quota":      logger.FormatQuota(result.Debt),
				"inviter_id": result.InviterId,
				"ledger_id":  result.Row.Id,
			}))
		}
		return result, nil
	})
}
