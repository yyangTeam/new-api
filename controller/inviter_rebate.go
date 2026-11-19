package controller

import (
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
