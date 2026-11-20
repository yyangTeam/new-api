package controller

import (
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
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
