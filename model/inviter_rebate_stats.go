package model

import (
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
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

// ---------------------------------------------------------------------------
// A 侧（邀请人自己）钱包看板查询（P4.1）。口径与管理端排行榜一致：
// granted = released + locked，voided 单列；数据只来自 inviter_rebates
// 台账（WHERE inviter_id = 当前用户，天然无越权）。下线列表的用户名做
// 脱敏展示，避免邀请人枚举被邀请人的登录名。GetSelf 已返回
// aff_count / aff_quota / aff_history_quota，这里不重复。
// ---------------------------------------------------------------------------

// InviterRebateTierProgress 是邀请人的阶梯进度：当前生效比例与下一档
// 门槛。NextMinInvitees = 0 表示没有下一档（未配阶梯或已到顶档）。
type InviterRebateTierProgress struct {
	AffCount        int `json:"aff_count"`
	CurrentPercent  int `json:"current_percent"`
	NextMinInvitees int `json:"next_min_invitees"`
	NextPercent     int `json:"next_percent"`
}

// InviterRebateTierView 是给 A 侧前端展示的阶梯档位（门槛 + 比例），
// 只暴露展示所需的两个字段，与 setting 层结构解耦。
type InviterRebateTierView struct {
	MinInvitees int `json:"min_invitees"`
	Percent     int `json:"percent"`
}

type InviterRebateSelfSummary struct {
	ReleasedQuota int64                     `json:"released_quota"`
	LockedQuota   int64                     `json:"locked_quota"`
	VoidedQuota   int64                     `json:"voided_quota"`
	GrantedQuota  int64                     `json:"granted_quota"`
	RebateCount   int64                     `json:"rebate_count"`
	InviteeCount  int64                     `json:"invitee_count"`
	Tier          InviterRebateTierProgress `json:"tier"`
	// FirstTopUpPercent 是首充加成配置（0 = 未启用）。仅作展示；生效
	// 比例为 max(首充加成, 常规比例)，由 credit 逻辑保证，这里不改口径。
	FirstTopUpPercent int `json:"first_topup_percent"`
	// Tiers 是当前生效的完整阶梯（按 min_invitees 升序）；未配阶梯时为
	// 空数组，前端按扁平比例展示。仅展示配置，不含任何用户数据。
	Tiers []InviterRebateTierView `json:"tiers"`
}

// GetInviterRebateSelfSummary 汇总当前用户作为邀请人的全部返利台账。
// 无台账时返回全零汇总（不报错）；aff_count 读取失败记错误日志并按 0
// 处理（只影响阶梯进度展示，不影响金额）。
func GetInviterRebateSelfSummary(inviterId int) (InviterRebateSelfSummary, error) {
	// 汇总列扫进扁平结构（GORM Scan 会把嵌套 Tier 当成关联，不能直接
	// 扫进 API 结构体）。
	var scan inviterRebateSelfSummaryScan
	err := DB.Model(&InviterRebate{}).
		Select(fmt.Sprintf(`%s,
	COUNT(DISTINCT inviter_rebates.invitee_id) AS invitee_count`, inviterRebateStatusSumsSQL())).
		Where("inviter_id = ?", inviterId).
		Scan(&scan).Error
	if err != nil {
		return InviterRebateSelfSummary{}, err
	}

	var affCount int64
	if err := DB.Model(&User{}).Select("aff_count").Where("id = ?", inviterId).Scan(&affCount).Error; err != nil {
		common.SysError(common.LogText("inviter rebate self summary aff_count lookup failed: inviter_id=%d error=%s", inviterId, err.Error()))
	}
	tiers := operation_setting.GetInviterRebateTiers()
	tierViews := make([]InviterRebateTierView, 0, len(tiers))
	for _, tier := range tiers {
		tierViews = append(tierViews, InviterRebateTierView{
			MinInvitees: tier.MinInvitees,
			Percent:     tier.Percent,
		})
	}
	return InviterRebateSelfSummary{
		ReleasedQuota:     scan.ReleasedQuota,
		LockedQuota:       scan.LockedQuota,
		VoidedQuota:       scan.VoidedQuota,
		GrantedQuota:      scan.GrantedQuota,
		RebateCount:       scan.RebateCount,
		InviteeCount:      scan.InviteeCount,
		Tier:              inviterRebateTierProgress(int(affCount)),
		FirstTopUpPercent: common.InviterRebateFirstTopUpPercent,
		Tiers:             tierViews,
	}, nil
}

// inviterRebateSelfSummaryScan 是汇总行的扫描结构（扁平列名对齐）。
type inviterRebateSelfSummaryScan struct {
	RebateCount   int64 `gorm:"column:rebate_count"`
	ReleasedQuota int64 `gorm:"column:released_quota"`
	LockedQuota   int64 `gorm:"column:locked_quota"`
	VoidedQuota   int64 `gorm:"column:voided_quota"`
	GrantedQuota  int64 `gorm:"column:granted_quota"`
	InviteeCount  int64 `gorm:"column:invitee_count"`
}

// InviterRebateInviteeRow 是下线贡献列表的一行（用户名脱敏；被邀请人
// 已被硬删除时 InviteeMaskedName 为空，前端显示"已注销用户"）。
type InviterRebateInviteeRow struct {
	InviteeMaskedName string `json:"invitee_masked_name"`
	RebateCount       int64  `json:"rebate_count"`
	ReleasedQuota     int64  `json:"released_quota"`
	LockedQuota       int64  `json:"locked_quota"`
	VoidedQuota       int64  `json:"voided_quota"`
	GrantedQuota      int64  `json:"granted_quota"`
}

// GetInviterRebateInvitees 分页返回当前用户的下线贡献列表，按贡献总额
// 降序、invitee_id 升序保证确定性。聚合范围是该邀请人全部台账行（不分
// 周期——钱包看板看的是累计贡献）。
func GetInviterRebateInvitees(inviterId, page, pageSize int) ([]InviterRebateInviteeRow, int64, error) {
	var total int64
	if err := DB.Model(&InviterRebate{}).Select("COUNT(DISTINCT invitee_id)").
		Where("inviter_id = ?", inviterId).Scan(&total).Error; err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []InviterRebateInviteeRow{}, 0, nil
	}

	var raws []inviterRebateInviteeScan
	err := DB.Model(&InviterRebate{}).
		Select(fmt.Sprintf(`inviter_rebates.invitee_id,
	COALESCE(users.username, '') AS username,
	%s`,
			inviterRebateStatusSumsSQL())).
		Joins("LEFT JOIN users ON users.id = inviter_rebates.invitee_id").
		Where("inviter_rebates.inviter_id = ?", inviterId).
		Group("inviter_rebates.invitee_id, users.username").
		Order("granted_quota DESC, inviter_rebates.invitee_id ASC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Scan(&raws).Error
	if err != nil {
		return nil, 0, err
	}
	rows := make([]InviterRebateInviteeRow, len(raws))
	for i, raw := range raws {
		rows[i] = InviterRebateInviteeRow{
			InviteeMaskedName: maskInviteeUsername(raw.Username),
			RebateCount:       raw.RebateCount,
			ReleasedQuota:     raw.ReleasedQuota,
			LockedQuota:       raw.LockedQuota,
			VoidedQuota:       raw.VoidedQuota,
			GrantedQuota:      raw.GrantedQuota,
		}
	}
	return rows, total, nil
}

// inviterRebateInviteeScan 是下线聚合行的扫描结构（username 未脱敏）。
type inviterRebateInviteeScan struct {
	InviteeId     int    `gorm:"column:invitee_id"`
	Username      string `gorm:"column:username"`
	RebateCount   int64  `gorm:"column:rebate_count"`
	ReleasedQuota int64  `gorm:"column:released_quota"`
	LockedQuota   int64  `gorm:"column:locked_quota"`
	VoidedQuota   int64  `gorm:"column:voided_quota"`
	GrantedQuota  int64  `gorm:"column:granted_quota"`
}

// inviterRebateStatusSumsSQL 生成状态分桶聚合列（不含维度列），供汇总与
// 下线列表两个查询复用。状态值是短 varchar 常量，CASE WHEN 写法在
// SQLite/MySQL/PostgreSQL 三方言下行为一致。
func inviterRebateStatusSumsSQL() string {
	return fmt.Sprintf(`COUNT(*) AS rebate_count,
COALESCE(SUM(CASE WHEN inviter_rebates.status = '%s' THEN inviter_rebates.quota ELSE 0 END), 0) AS released_quota,
COALESCE(SUM(CASE WHEN inviter_rebates.status = '%s' THEN inviter_rebates.quota ELSE 0 END), 0) AS locked_quota,
COALESCE(SUM(CASE WHEN inviter_rebates.status = '%s' THEN inviter_rebates.quota ELSE 0 END), 0) AS voided_quota,
COALESCE(SUM(CASE WHEN inviter_rebates.status IN ('%s', '%s') THEN inviter_rebates.quota ELSE 0 END), 0) AS granted_quota`,
		InviterRebateStatusReleased, InviterRebateStatusLocked, InviterRebateStatusVoided,
		InviterRebateStatusReleased, InviterRebateStatusLocked)
}

// inviterRebateTierProgress 解析邀请人的阶梯进度：无阶梯时当前比例取
// 扁平 InviterRebatePercent；有阶梯时取满足 min_invitees <= affCount 的
// 最高档，下一档为第一个门槛超过 affCount 的档位。
func inviterRebateTierProgress(affCount int) InviterRebateTierProgress {
	tiers := operation_setting.GetInviterRebateTiers()
	progress := InviterRebateTierProgress{AffCount: affCount}
	if len(tiers) == 0 {
		progress.CurrentPercent = common.InviterRebatePercent
		return progress
	}
	for _, tier := range tiers {
		if affCount >= tier.MinInvitees {
			progress.CurrentPercent = tier.Percent
		} else {
			progress.NextMinInvitees = tier.MinInvitees
			progress.NextPercent = tier.Percent
			break
		}
	}
	return progress
}

// maskInviteeUsername 对被邀请人的用户名做脱敏：保留首尾各少量字符，
// 中间以 *** 代替（按 rune 切分，兼容中文用户名）。极短用户名只保留首
// 字符，避免脱敏后可被穷举还原。
func maskInviteeUsername(username string) string {
	runes := []rune(username)
	n := len(runes)
	switch {
	case n == 0:
		return ""
	case n <= 2:
		return string(runes[0]) + "***"
	case n <= 5:
		return string(runes[:1]) + "***" + string(runes[n-1:])
	default:
		return string(runes[:2]) + "***" + string(runes[n-1:])
	}
}

// ---------------------------------------------------------------------------
// 管理端台账流水/汇总查询（P5.1）。流水按台账行原样返回（管理员可见
// locked_reason / voided_reason，与 A 侧脱敏口径不同）；邀请双方的用户名
// 各 LEFT JOIN users 一次，硬删后为空字符串，前端显示"已注销用户"。
// 汇总卡片与流水列表共用同一组筛选条件，口径与排行榜一致：
// granted = released + locked，voided 单列；自邀告警单独聚合
// locked(self_invite_suspect) 行（金额与笔数），供人工裁 void/release。
// ---------------------------------------------------------------------------

// InviterRebateLedgerFilter 是台账流水/汇总共用的筛选条件；零值表示不过滤。
type InviterRebateLedgerFilter struct {
	InviterId      int
	InviteeId      int
	Status         string
	SourceType     string
	StartTimestamp int64
	EndTimestamp   int64
}

// InviterRebateLedgerRow 是管理端台账流水的一行：台账全部字段 + 邀请双方
// 用户名（硬删后为空）。
type InviterRebateLedgerRow struct {
	Id              int    `json:"id"`
	CreatedAt       int64  `json:"created_at"`
	InviterId       int    `json:"inviter_id"`
	InviterUsername string `json:"inviter_username" gorm:"column:inviter_username"`
	InviteeId       int    `json:"invitee_id"`
	InviteeUsername string `json:"invitee_username" gorm:"column:invitee_username"`
	SourceType      string `json:"source_type"`
	SourceId        int    `json:"source_id"`
	BaseQuota       int    `json:"base_quota"`
	Percent         int    `json:"percent"`
	Quota           int    `json:"quota"`
	Status          string `json:"status"`
	LockedReason    string `json:"locked_reason"`
	VoidedReason    string `json:"voided_reason"`
	ReleasedAt      int64  `json:"released_at"`
}

// InviterRebateLedgerSummary 是管理端台账汇总卡片：状态分桶 + 自邀嫌疑
// 冻结的笔数与金额。无匹配台账时返回全零（不报错）。
type InviterRebateLedgerSummary struct {
	RebateCount        int64 `json:"rebate_count"`
	ReleasedQuota      int64 `json:"released_quota"`
	LockedQuota        int64 `json:"locked_quota"`
	VoidedQuota        int64 `json:"voided_quota"`
	GrantedQuota       int64 `json:"granted_quota"`
	SuspectCount       int64 `json:"suspect_count"`
	SuspectLockedQuota int64 `json:"suspect_locked_quota"`
}

// inviterRebateLedgerFilterScope 给台账查询套筛选条件，流水与汇总共用。
// 条件全部是等值/区间比较，三方言行为一致。
func inviterRebateLedgerFilterScope(db *gorm.DB, filter InviterRebateLedgerFilter) *gorm.DB {
	if filter.InviterId > 0 {
		db = db.Where("inviter_rebates.inviter_id = ?", filter.InviterId)
	}
	if filter.InviteeId > 0 {
		db = db.Where("inviter_rebates.invitee_id = ?", filter.InviteeId)
	}
	if filter.Status != "" {
		db = db.Where("inviter_rebates.status = ?", filter.Status)
	}
	if filter.SourceType != "" {
		db = db.Where("inviter_rebates.source_type = ?", filter.SourceType)
	}
	if filter.StartTimestamp > 0 {
		db = db.Where("inviter_rebates.created_at >= ?", filter.StartTimestamp)
	}
	if filter.EndTimestamp > 0 {
		db = db.Where("inviter_rebates.created_at <= ?", filter.EndTimestamp)
	}
	return db
}

// GetInviterRebateLedger 分页返回管理端台账流水，按 id 倒序（最新在前）。
// 邀请双方用户名各 LEFT JOIN 一次；硬删后为空字符串。空结果返回空切片。
func GetInviterRebateLedger(filter InviterRebateLedgerFilter, page, pageSize int) ([]InviterRebateLedgerRow, int64, error) {
	var total int64
	if err := inviterRebateLedgerFilterScope(DB.Model(&InviterRebate{}), filter).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []InviterRebateLedgerRow{}, 0, nil
	}

	var rows []InviterRebateLedgerRow
	err := inviterRebateLedgerFilterScope(DB.Model(&InviterRebate{}).
		Select(`inviter_rebates.*,
COALESCE(inviter_u.username, '') AS inviter_username,
COALESCE(invitee_u.username, '') AS invitee_username`).
		Joins("LEFT JOIN users inviter_u ON inviter_u.id = inviter_rebates.inviter_id").
		Joins("LEFT JOIN users invitee_u ON invitee_u.id = inviter_rebates.invitee_id"), filter).
		Order("inviter_rebates.id DESC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

// GetInviterRebateLedgerSummary 按筛选条件聚合台账汇总卡片。状态分桶列
// 复用 inviterRebateStatusSumsSQL；自邀嫌疑列单独 CASE（locked 且
// locked_reason = self_invite_suspect）。GROUP BY 整表无分组，恒返回一行。
func GetInviterRebateLedgerSummary(filter InviterRebateLedgerFilter) (InviterRebateLedgerSummary, error) {
	var summary InviterRebateLedgerSummary
	err := inviterRebateLedgerFilterScope(DB.Model(&InviterRebate{}).
		Select(fmt.Sprintf(`%s,
COUNT(CASE WHEN inviter_rebates.status = '%s' AND inviter_rebates.locked_reason = '%s' THEN 1 END) AS suspect_count,
COALESCE(SUM(CASE WHEN inviter_rebates.status = '%s' AND inviter_rebates.locked_reason = '%s' THEN inviter_rebates.quota ELSE 0 END), 0) AS suspect_locked_quota`,
			inviterRebateStatusSumsSQL(),
			InviterRebateStatusLocked, InviterRebateLockedSelfInviteSuspect,
			InviterRebateStatusLocked, InviterRebateLockedSelfInviteSuspect)), filter).
		Scan(&summary).Error
	return summary, err
}
