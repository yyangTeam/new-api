package model

import (
	"fmt"
	"time"
)

// 管理端邀请返利统计查询（P3.1 排行榜）。台账是返利的唯一事实来源，
// 排行榜按 inviter_rebates 聚合：granted（released + locked）口径与月度
// 封顶一致——冻结池同样算邀请人收益，voided 不算。invitee_count 是周期内
// 产生过台账行的被邀请人数（COUNT(DISTINCT invitee_id)），与 users.aff_count
// 的口径不同（后者是注册绑定的邀请人数，不受周期与返利开关影响），行内
// 同时返回两者供管理员对照。period 按自然月/季/年对齐（与月度封顶同一
// 对齐方式），all 不加时间过滤。
const (
	InviterRebateRankingMetricRebate   = "rebate"
	InviterRebateRankingMetricInvitees = "invitees"

	InviterRebateRankingPeriodMonth   = "month"
	InviterRebateRankingPeriodQuarter = "quarter"
	InviterRebateRankingPeriodYear    = "year"
	InviterRebateRankingPeriodAll     = "all"
)

type InviterRebateRankingRow struct {
	InviterId     int    `json:"inviter_id"`
	Username      string `json:"username"`
	DisplayName   string `json:"display_name"`
	AffCount      int    `json:"aff_count"`
	RebateCount   int64  `json:"rebate_count"`
	InviteeCount  int64  `json:"invitee_count"`
	ReleasedQuota int64  `json:"released_quota"`
	LockedQuota   int64  `json:"locked_quota"`
	VoidedQuota   int64  `json:"voided_quota"`
	GrantedQuota  int64  `json:"granted_quota"`
}

// inviterRebateRankingPeriodStart 返回排行周期的起始时间戳（不含该刻之前
// 的台账行）；all 返回 0 表示不过滤。period 合法性由调用方校验。
func inviterRebateRankingPeriodStart(period string, now time.Time) int64 {
	switch period {
	case InviterRebateRankingPeriodMonth:
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Unix()
	case InviterRebateRankingPeriodQuarter:
		quarterStartMonth := time.Month((int(now.Month())-1)/3*3 + 1)
		return time.Date(now.Year(), quarterStartMonth, 1, 0, 0, 0, 0, now.Location()).Unix()
	case InviterRebateRankingPeriodYear:
		return time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location()).Unix()
	default:
		return 0
	}
}

// GetInviterRebateRankings 按返利总额（metric=rebate，granted 口径）或
// 周期内被邀请人数（metric=invitees）对邀请人排名，分页返回。并列时按
// inviter_id 升序保证结果确定性。邀请人已被硬删除的行保留（LEFT JOIN
// users 取不到信息时 username/display_name 为空），管理员按 inviter_id
// 仍可追账。now 由调用方传入便于测试。
func GetInviterRebateRankings(metric, period string, page, pageSize int, now time.Time) ([]InviterRebateRankingRow, int64, error) {
	start := inviterRebateRankingPeriodStart(period, now)

	var total int64
	countQuery := DB.Model(&InviterRebate{}).Select("COUNT(DISTINCT inviter_id)")
	if start > 0 {
		countQuery = countQuery.Where("created_at >= ?", start)
	}
	if err := countQuery.Scan(&total).Error; err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []InviterRebateRankingRow{}, 0, nil
	}

	query := DB.Model(&InviterRebate{}).
		Select(inviterRebateRankingSelectSQL()).
		Joins("LEFT JOIN users ON users.id = inviter_rebates.inviter_id")
	if start > 0 {
		query = query.Where("inviter_rebates.created_at >= ?", start)
	}
	query = query.
		Group("inviter_rebates.inviter_id, users.username, users.display_name, users.aff_count").
		Order(fmt.Sprintf("%s DESC, inviter_rebates.inviter_id ASC", inviterRebateRankingOrderColumn(metric))).
		Limit(pageSize).
		Offset((page - 1) * pageSize)
	var rows []InviterRebateRankingRow
	if err := query.Scan(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

// inviterRebateRankingSelectSQL 生成聚合列。状态值是短 varchar 常量，
// CASE WHEN 写法在 SQLite/MySQL/PostgreSQL 三方言下行为一致。
func inviterRebateRankingSelectSQL() string {
	return fmt.Sprintf(`inviter_rebates.inviter_id,
COALESCE(users.username, '') AS username,
COALESCE(users.display_name, '') AS display_name,
COALESCE(users.aff_count, 0) AS aff_count,
COUNT(*) AS rebate_count,
COUNT(DISTINCT inviter_rebates.invitee_id) AS invitee_count,
COALESCE(SUM(CASE WHEN inviter_rebates.status = '%s' THEN inviter_rebates.quota ELSE 0 END), 0) AS released_quota,
COALESCE(SUM(CASE WHEN inviter_rebates.status = '%s' THEN inviter_rebates.quota ELSE 0 END), 0) AS locked_quota,
COALESCE(SUM(CASE WHEN inviter_rebates.status = '%s' THEN inviter_rebates.quota ELSE 0 END), 0) AS voided_quota,
COALESCE(SUM(CASE WHEN inviter_rebates.status IN ('%s', '%s') THEN inviter_rebates.quota ELSE 0 END), 0) AS granted_quota`,
		InviterRebateStatusReleased, InviterRebateStatusLocked, InviterRebateStatusVoided,
		InviterRebateStatusReleased, InviterRebateStatusLocked)
}

// inviterRebateRankingOrderColumn 返回排序依据列（聚合别名，三方言均
// 允许 ORDER BY 输出列别名）。
func inviterRebateRankingOrderColumn(metric string) string {
	if metric == InviterRebateRankingMetricInvitees {
		return "invitee_count"
	}
	return "granted_quota"
}
