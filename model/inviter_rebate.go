package model

import (
	"errors"
	"net"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

// 邀请充值返利台账。每笔返利一行，(source_type, source_id) 唯一，
// 与充值幂等状态机互为双保险。Phase 0 记录 released 与
// voided(inviter_missing) 两种状态；locked 及其余 voided 原因由
// 2.0 风控（消费解锁、自邀冻结）与退款回收阶段启用。金额单位与
// 其他 quota 字段一致。
const (
	InviterRebateSourceTopUp      = "topup"
	InviterRebateSourceRedemption = "redemption"

	InviterRebateStatusReleased = "released"
	InviterRebateStatusLocked   = "locked"
	InviterRebateStatusVoided   = "voided"

	// locked_reason / voided_reason 取值
	InviterRebateLockedAwaitingConsume   = "awaiting_consume"    // 消费解锁未达标（P1.2）
	InviterRebateLockedSelfInviteSuspect = "self_invite_suspect" // 自邀嫌疑（P1.3）
	InviterRebateVoidedInviterMissing    = "inviter_missing"
	InviterRebateVoidedMonthlyCap        = "monthly_cap"        // 邀请人月度返利封顶（P1.1）
	InviterRebateVoidedLockExpired       = "lock_expired"       // 冻结池超期未解锁自动作废
	InviterRebateVoidedAdminVoid         = "admin_void"         // 管理员人工作废冻结返利（P5.2）
	InviterRebateVoidedRefund            = "refund"             // 来源充值退款回收（P5.2）
	InviterRebateVoidedRefundUnderfunded = "refund_underfunded" // 退款回收时邀请人可划转余额不足，差额欠账（P5.2）
)

type InviterRebate struct {
	Id           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
	InviterId    int    `json:"inviter_id" gorm:"int;not null;uniqueIndex:idx_inviter_rebate_source;index"`
	InviteeId    int    `json:"invitee_id" gorm:"int;not null;index"`
	SourceType   string `json:"source_type" gorm:"type:varchar(16);not null;uniqueIndex:idx_inviter_rebate_source"`
	SourceId     int    `json:"source_id" gorm:"int;not null;uniqueIndex:idx_inviter_rebate_source"`
	BaseQuota    int    `json:"base_quota" gorm:"type:int;not null"`
	Percent      int    `json:"percent" gorm:"type:int;not null"`
	Quota        int    `json:"quota" gorm:"type:int;not null"`
	Status       string `json:"status" gorm:"type:varchar(16);not null;index"`
	LockedReason string `json:"locked_reason" gorm:"type:varchar(32)"`
	ReleasedAt   int64  `json:"released_at" gorm:"bigint"`
	VoidedReason string `json:"voided_reason" gorm:"type:varchar(32)"`
}

func (InviterRebate) TableName() string {
	return "inviter_rebates"
}

// inviterRebatePercentForTx 解析本次返利的生效比例（P2.1 首充加成 ×
// P2.2 阶梯）：常规比例先经 inviterRebateRegularPercentForTx 取阶梯或
// 扁平档；被邀请人的第一笔成功充值再与首充加成
// InviterRebateFirstTopUpPercent 取大者（首充是加成，生效比例不应低于
// 常规档），之后的充值与兑换码等非充值来源一律用常规比例。各 Recharge*
// 路径在调用返利钩子前已把当前订单置为 success，因此成功充值笔数 == 1 即
// 首充。计数失败回退常规比例——返利照发，只是不享受加成（漏加成可人工
// 补，多发不可收回，失败方向取保守侧）。
func inviterRebatePercentForTx(tx *gorm.DB, inviteeId, inviterId int, sourceType string) int {
	regular := inviterRebateRegularPercentForTx(tx, inviteeId, inviterId)
	if sourceType != InviterRebateSourceTopUp || common.InviterRebateFirstTopUpPercent <= 0 {
		return regular
	}
	var successTopUps int64
	if err := tx.Model(&TopUp{}).Where("user_id = ? AND status = ?", inviteeId, common.TopUpStatusSuccess).Count(&successTopUps).Error; err != nil {
		common.SysError(common.LogText("inviter rebate first top-up count failed: invitee_id=%d error=%s", inviteeId, err.Error()))
		return regular
	}
	if successTopUps == 1 {
		return max(common.InviterRebateFirstTopUpPercent, regular)
	}
	return regular
}

// inviterRebateRegularPercentForTx 解析常规比例（P2.2 阶梯）：阶梯
// （inviter_rebate_setting.tiers）非空时完全取代扁平
// InviterRebatePercent，按邀请人 aff_count 取满足 min_invitees 的最高档，
// 低于最低档返 0；无阶梯时用扁平值。aff_count 查询失败时记 SysError 并
// 回退扁平值（与首充计数失败同一保守方向：漏配可人工补，多发不可收回）。
func inviterRebateRegularPercentForTx(tx *gorm.DB, inviteeId, inviterId int) int {
	tiers := operation_setting.GetInviterRebateTiers()
	if len(tiers) == 0 {
		return common.InviterRebatePercent
	}
	var affCount int64
	if err := tx.Model(&User{}).Select("aff_count").Where("id = ?", inviterId).Scan(&affCount).Error; err != nil {
		common.SysError(common.LogText("inviter rebate tier lookup failed: invitee_id=%d inviter_id=%d error=%s", inviteeId, inviterId, err.Error()))
		return common.InviterRebatePercent
	}
	percent := 0
	for _, tier := range tiers {
		if affCount < int64(tier.MinInvitees) {
			break
		}
		percent = tier.Percent
	}
	return percent
}

// creditInviterRebateTx 在充值到账事务内，按生效比例（常规档或 P2.2 阶梯，
// 首充再与首充加成取大）给被邀请人的邀请人发放返利，并在台账记一行。先经 P1.1 封顶截断：单笔封顶
// （InviterRebateMaxPerTopup）超出部分直接丢弃不记台账；月度封顶
// （InviterRebateMonthlyMax）按自然月统计已发放的 released + locked 台账行
// （voided 不计，冻结池同样占用额度），已达上限的整笔记
// voided(monthly_cap) 留痕，本笔会超出但尚未达上限的只发剩余额度。
// 自邀检测（P1.3，InviterRebateSelfInviteCheck）命中嫌疑时整笔冻结：仅增加
// 邀请人 aff_quota_locked 冻结池，台账记 locked(self_invite_suspect)，即使
// 被邀请人累计消费已达标也照样冻结——该状态永不自动释放
// （releaseInviterRebatesOnConsume 只处理 awaiting_consume 行），由管理员
// 依据告警日志人工裁 void / release（人工操作随 P3 台账页提供）。
// 消费解锁（InviterRebateConsumeUnlockQuota）关闭或被邀请人累计消费已达标时
// 直接发放：aff_quota 与 aff_history 原子自增（不增加 aff_count，那是邀请人
// 数字段），台账记 released；未达标时冻结发放：仅增加邀请人 aff_quota_locked
// 冻结池，台账记 locked(awaiting_consume)，等 releaseInviterRebatesOnConsume
// 在消费达标后释放（冻结期间不写邀请人日志，钱到账释放时才写）。
// 返回返利额、邀请人 ID、失败返利额、月度封顶截断额与自邀嫌疑冻结额：返利
// 为 0 表示本次没有入账（比例关闭、支付合规未确认、被邀请人无邀请人、返利
// 向下取整后不足 1、进入冻结池、被月度封顶整笔作废，或邀请人已被硬删除
// ——此时台账记 voided(inviter_missing) 留痕）。数据库错误同样返回返利
// 0——返利只是充值的附加收益，绝不能因为返利失败回滚被邀请人的充值，此时
// 记系统错误日志，failedRebate 携带应发未发的金额，由调用方在事务提交后
// 写入管理员侧日志；由于充值事务照常提交、幂等状态机不会重放，这笔返利
// 需要人工核对补发。cappedRebate 携带被月度封顶截掉（作废或砍掉）的金额，
// 同样由调用方在事务提交后写管理员侧日志；单笔封顶属正常策略截断，不写
// 日志。suspectRebate 携带因自邀嫌疑被冻结（或嫌疑冻结失败/作废）的金额，
// 由调用方在事务提交后写管理员侧告警日志，供站长查证后人工处理。
// 返利已入账（或已进冻结池）但台账 INSERT 失败时不追回（充值已提交、
// 状态机不会重放），只记控制台错误日志：台账缺失只影响后续统计与回收，
// 不影响钱——冻结路径下这笔金额会滞留在冻结池无法释放，需人工核对。
// 查询被邀请人失败的分支只记服务器控制台日志：那种情况下数据库本身已经
// 异常，日志表写入大概率同样失败。
func creditInviterRebateTx(tx *gorm.DB, inviteeId int, creditedQuota int, sourceType string, sourceId int) (rebate int, inviterId int, failedRebate int, cappedRebate int, suspectRebate int) {
	if !(common.InviterRebatePercent > 0 || common.InviterRebateFirstTopUpPercent > 0 || operation_setting.InviterRebateTierPercentConfigured()) || !operation_setting.IsPaymentComplianceConfirmed() {
		return 0, 0, 0, 0, 0
	}
	var invitee User
	if err := tx.Model(&User{}).Select("id", "inviter_id", "used_quota", "email", "stripe_customer").Where("id = ?", inviteeId).First(&invitee).Error; err != nil {
		common.SysError(common.LogText("inviter rebate lookup failed: invitee_id=%d quota=%d error=%s", inviteeId, creditedQuota, err.Error()))
		return 0, 0, 0, 0, 0
	}
	if invitee.InviterId == 0 {
		return 0, 0, 0, 0, 0
	}
	percent := inviterRebatePercentForTx(tx, inviteeId, invitee.InviterId, sourceType)
	rebate = int(int64(creditedQuota) * int64(percent) / 100)
	if rebate <= 0 {
		return 0, invitee.InviterId, 0, 0, 0
	}
	// 单笔封顶：超出部分直接截断，不记台账（配置 0 = 不限）
	if common.InviterRebateMaxPerTopup > 0 && rebate > common.InviterRebateMaxPerTopup {
		rebate = common.InviterRebateMaxPerTopup
	}
	// 月度封顶：自然月内 released + locked 累计达到上限后，后续返利整笔
	// voided(monthly_cap) 留痕；本笔会超出但尚未达上限时只发剩余额度
	// （超出部分不记台账——(inviter_id, source_type, source_id) 唯一，
	// 一笔充值至多一行台账，无法为截断部分单独留行）
	if common.InviterRebateMonthlyMax > 0 {
		now := time.Now()
		monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Unix()
		var grantedThisMonth int64
		if err := tx.Model(&InviterRebate{}).Select("COALESCE(SUM(quota), 0)").
			Where("inviter_id = ? AND created_at >= ? AND status IN ?", invitee.InviterId, monthStart, []string{InviterRebateStatusReleased, InviterRebateStatusLocked}).
			Scan(&grantedThisMonth).Error; err != nil {
			common.SysError(common.LogText("inviter rebate monthly cap lookup failed: invitee_id=%d inviter_id=%d error=%s", inviteeId, invitee.InviterId, err.Error()))
			return 0, invitee.InviterId, rebate, 0, 0
		}
		if remaining := int64(common.InviterRebateMonthlyMax) - grantedThisMonth; remaining <= 0 {
			insertVoidedInviterRebateTx(tx, inviteeId, invitee.InviterId, rebate, creditedQuota, percent, sourceType, sourceId, InviterRebateVoidedMonthlyCap)
			return 0, invitee.InviterId, 0, rebate, 0
		} else if int64(rebate) > remaining {
			cappedRebate = rebate - int(remaining)
			rebate = int(remaining)
		}
	}
	// 自邀检测（P1.3）：命中即整笔进冻结池并记 locked(self_invite_suspect)，
	// 放在消费解锁判定之前——即使累计消费已达标也照样冻结，该状态永不自动
	// 释放，等管理员人工裁
	if common.InviterRebateSelfInviteCheck && detectSelfInviteSuspectTx(tx, &invitee, invitee.InviterId) {
		credited, inviter, failed := lockInviterRebateTx(tx, inviteeId, invitee.InviterId, rebate, creditedQuota, percent, sourceType, sourceId, InviterRebateLockedSelfInviteSuspect)
		return credited, inviter, failed, cappedRebate, rebate
	}
	// 消费解锁开启且被邀请人累计消费未达标：只进冻结池，台账记 locked，
	// 返利额返回 0（调用方据此不给邀请人写"已到账"日志）
	if common.InviterRebateConsumeUnlockQuota > 0 && invitee.UsedQuota < common.InviterRebateConsumeUnlockQuota {
		credited, inviter, failed := lockInviterRebateTx(tx, inviteeId, invitee.InviterId, rebate, creditedQuota, percent, sourceType, sourceId, InviterRebateLockedAwaitingConsume)
		return credited, inviter, failed, cappedRebate, 0
	}
	result := tx.Model(&User{}).Where("id = ?", invitee.InviterId).Updates(map[string]any{
		"aff_quota":   gorm.Expr("aff_quota + ?", rebate),
		"aff_history": gorm.Expr("aff_history + ?", rebate),
	})
	if result.Error != nil {
		common.SysError(common.LogText("inviter rebate credit failed: invitee_id=%d inviter_id=%d rebate=%d error=%s", inviteeId, invitee.InviterId, rebate, result.Error.Error()))
		return 0, invitee.InviterId, rebate, cappedRebate, 0
	}
	if result.RowsAffected == 0 {
		// 邀请人已被硬删除，返利无处发放；台账记 voided 留痕，不影响充值本身
		insertVoidedInviterRebateTx(tx, inviteeId, invitee.InviterId, rebate, creditedQuota, percent, sourceType, sourceId, InviterRebateVoidedInviterMissing)
		return 0, invitee.InviterId, 0, cappedRebate, 0
	}
	if err := tx.Create(&InviterRebate{
		CreatedAt:  common.GetTimestamp(),
		InviterId:  invitee.InviterId,
		InviteeId:  inviteeId,
		SourceType: sourceType,
		SourceId:   sourceId,
		BaseQuota:  creditedQuota,
		Percent:    percent,
		Quota:      rebate,
		Status:     InviterRebateStatusReleased,
		ReleasedAt: common.GetTimestamp(),
	}).Error; err != nil {
		common.SysError(common.LogText("inviter rebate ledger insert failed: invitee_id=%d inviter_id=%d rebate=%d source=%s/%d error=%s", inviteeId, invitee.InviterId, rebate, sourceType, sourceId, err.Error()))
	}
	return rebate, invitee.InviterId, 0, cappedRebate, 0
}

// insertVoidedInviterRebateTx 在台账记一笔作废返利（不发放、不冻结），用于
// 邀请人已被硬删除（inviter_missing）与月度封顶（monthly_cap）。台账 INSERT
// 失败只记控制台错误：作废本来就不涉及钱，留痕缺失只影响统计与核对。
func insertVoidedInviterRebateTx(tx *gorm.DB, inviteeId, inviter, rebate, creditedQuota, percent int, sourceType string, sourceId int, reason string) {
	if err := tx.Create(&InviterRebate{
		CreatedAt:    common.GetTimestamp(),
		InviterId:    inviter,
		InviteeId:    inviteeId,
		SourceType:   sourceType,
		SourceId:     sourceId,
		BaseQuota:    creditedQuota,
		Percent:      percent,
		Quota:        rebate,
		Status:       InviterRebateStatusVoided,
		VoidedReason: reason,
	}).Error; err != nil {
		common.SysError(common.LogText("inviter rebate ledger insert failed: invitee_id=%d inviter_id=%d rebate=%d source=%s/%d error=%s", inviteeId, inviter, rebate, sourceType, sourceId, err.Error()))
	}
}

// lockInviterRebateTx 是 creditInviterRebateTx 的冻结分支（消费解锁
// awaiting_consume 与自邀嫌疑 self_invite_suspect 共用）：把返利记进邀请人
// 冻结池（aff_quota_locked）并在台账记 locked(lockedReason)。
// 与直接发放分支共用同一失败语义：冻结池 UPDATE 失败返回 failedRebate
// 供管理员侧日志人工核对；台账 INSERT 失败只记控制台错误（金额已进冻结池，
// 但没有台账行，release 永远找不到它，将滞留在冻结池中）。
func lockInviterRebateTx(tx *gorm.DB, inviteeId, inviter, rebate, creditedQuota, percent int, sourceType string, sourceId int, lockedReason string) (credited, inviterId, failedRebate int) {
	result := tx.Model(&User{}).Where("id = ?", inviter).Update("aff_quota_locked", gorm.Expr("aff_quota_locked + ?", rebate))
	if result.Error != nil {
		common.SysError(common.LogText("inviter rebate credit failed: invitee_id=%d inviter_id=%d rebate=%d error=%s", inviteeId, inviter, rebate, result.Error.Error()))
		return 0, inviter, rebate
	}
	if result.RowsAffected == 0 {
		// 邀请人已被硬删除，返利无处冻结；台账记 voided 留痕
		insertVoidedInviterRebateTx(tx, inviteeId, inviter, rebate, creditedQuota, percent, sourceType, sourceId, InviterRebateVoidedInviterMissing)
		return 0, inviter, 0
	}
	if err := tx.Create(&InviterRebate{
		CreatedAt:    common.GetTimestamp(),
		InviterId:    inviter,
		InviteeId:    inviteeId,
		SourceType:   sourceType,
		SourceId:     sourceId,
		BaseQuota:    creditedQuota,
		Percent:      percent,
		Quota:        rebate,
		Status:       InviterRebateStatusLocked,
		LockedReason: lockedReason,
	}).Error; err != nil {
		common.SysError(common.LogText("inviter rebate ledger insert failed: invitee_id=%d inviter_id=%d rebate=%d source=%s/%d error=%s", inviteeId, inviter, rebate, sourceType, sourceId, err.Error()))
	}
	return 0, inviter, 0
}

// detectSelfInviteSuspectTx 判断这笔返利的邀请双方是否有自邀嫌疑（P1.3）。
// 打分制而非硬规则：任一强信号命中即嫌疑；弱信号需两个叠加。信号源：
//   - 强：登录 IP 精确重合（user_sessions.ip，双方近 90 天）；Stripe 支付
//     账号相同（stripe_customer）
//   - 弱：邮箱同域且 local part 前缀相似；IPv4 同 /24 网段（无精确重合时）
//
// 嫌疑只冻结不自动作废：误杀可挽回（管理员放行即可），漏放有封顶与消费
// 解锁兜底。信号查询失败按无嫌疑处理（失败方向同上）。某一方近 90 天无
// 登录会话记录时 IP 类信号自然不会命中（新注册账号注册即产生会话，正常
// 路径都会有数据），Stripe 与邮箱信号不受影响。
func detectSelfInviteSuspectTx(tx *gorm.DB, invitee *User, inviterId int) bool {
	since := common.GetTimestamp() - 90*86400
	var inviteeIPs, inviterIPs []string
	if err := tx.Model(&UserSession{}).Where("user_id = ? AND ip <> '' AND created_at >= ?", invitee.Id, since).Distinct().Pluck("ip", &inviteeIPs).Error; err != nil {
		common.SysError(common.LogText("inviter rebate self-invite session lookup failed: user_id=%d error=%s", invitee.Id, err.Error()))
		return false
	}
	if err := tx.Model(&UserSession{}).Where("user_id = ? AND ip <> '' AND created_at >= ?", inviterId, since).Distinct().Pluck("ip", &inviterIPs).Error; err != nil {
		common.SysError(common.LogText("inviter rebate self-invite session lookup failed: user_id=%d error=%s", inviterId, err.Error()))
		return false
	}
	inviteeExact, inviteeV4Prefix := parseSessionIPs(inviteeIPs)
	inviterExact, inviterV4Prefix := parseSessionIPs(inviterIPs)
	for ip := range inviterExact {
		if inviteeExact[ip] {
			return true
		}
	}
	subnetOverlap := false
	for prefix := range inviterV4Prefix {
		if inviteeV4Prefix[prefix] {
			subnetOverlap = true
			break
		}
	}
	var inviter struct {
		Email          string
		StripeCustomer string
	}
	if err := tx.Model(&User{}).Select("email", "stripe_customer").Where("id = ?", inviterId).Scan(&inviter).Error; err != nil {
		common.SysError(common.LogText("inviter rebate self-invite inviter lookup failed: inviter_id=%d error=%s", inviterId, err.Error()))
		return false
	}
	if invitee.StripeCustomer != "" && invitee.StripeCustomer == inviter.StripeCustomer {
		return true
	}
	// 两个弱信号叠加：同 /24 网段 + 同域相似邮箱
	return subnetOverlap && similarEmailLocal(invitee.Email, inviter.Email)
}

// parseSessionIPs 把会话表里的原始 IP 字符串归一化为精确地址集合与 IPv4
// /24 网段前缀集合。解析失败的条目（含带端口等非 IP 文本）直接跳过。
func parseSessionIPs(raws []string) (exact map[string]bool, v4Prefix map[[3]byte]bool) {
	exact = make(map[string]bool)
	v4Prefix = make(map[[3]byte]bool)
	for _, raw := range raws {
		ip := net.ParseIP(strings.TrimSpace(raw))
		if ip == nil {
			continue
		}
		exact[ip.String()] = true
		if v4 := ip.To4(); v4 != nil {
			v4Prefix[[3]byte{v4[0], v4[1], v4[2]}] = true
		}
	}
	return exact, v4Prefix
}

// similarEmailLocal 判断两个邮箱是否同域且 local part 前缀相似（自邀检测
// 的弱信号）：小写比较，公共前缀达到较短 local part 的一半以上（不足 3 个
// 字符的极短 local part 视为不相似，避免误杀）。
func similarEmailLocal(a, b string) bool {
	localA, domainA, _ := strings.Cut(strings.ToLower(a), "@")
	localB, domainB, _ := strings.Cut(strings.ToLower(b), "@")
	if domainA == "" || domainA != domainB {
		return false
	}
	if localA == localB {
		return true
	}
	n := min(len(localA), len(localB))
	if n < 3 {
		return false
	}
	same := 0
	for same < n && localA[same] == localB[same] {
		same++
	}
	return same*2 >= n
}

// releaseInviterRebatesOnConsume 在被邀请人消费入账（users.used_quota 增加）
// 后检查累计消费是否达到消费解锁门槛，达标则把该被邀请人全部
// locked(awaiting_consume) 台账行一次性释放：翻成 released、邀请人
// aff_quota/aff_history 入账、aff_quota_locked 等额回落，并给邀请人写一条
// 系统日志。释放全程在一个事务里（台账行加行锁），失败整体回滚只记控制台
// 错误，等下一次消费钩子重试，不会重复入账。释放时邀请人已被硬删除则把这
// 些行改记 voided(inviter_missing)。功能关闭（门槛 0）或未达标时立即返回。
func releaseInviterRebatesOnConsume(inviteeId int) {
	if common.InviterRebateConsumeUnlockQuota <= 0 {
		return
	}
	var invitee User
	if err := DB.Model(&User{}).Select("used_quota").Where("id = ?", inviteeId).First(&invitee).Error; err != nil {
		return
	}
	if invitee.UsedQuota < common.InviterRebateConsumeUnlockQuota {
		return
	}
	var releasedQuota int
	var inviterId int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var rows []InviterRebate
		if err := lockForUpdate(tx).
			Where("invitee_id = ? AND status = ? AND locked_reason = ?", inviteeId, InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume).
			Find(&rows).Error; err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}
		// inviter_id 只在注册时绑定，同一被邀请人的台账行必然同属一个邀请人
		inviterId = rows[0].InviterId
		ids := make([]int, len(rows))
		for i, row := range rows {
			ids[i] = row.Id
			releasedQuota += row.Quota
		}
		var inviter User
		if err := lockForUpdate(tx).Where("id = ?", inviterId).First(&inviter).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			// 邀请人已被硬删除：钱无处发放，改记 voided 留痕
			if err := tx.Model(&InviterRebate{}).Where("id IN ?", ids).Updates(map[string]any{
				"status":        InviterRebateStatusVoided,
				"locked_reason": "",
				"voided_reason": InviterRebateVoidedInviterMissing,
			}).Error; err != nil {
				return err
			}
			releasedQuota = 0
			return nil
		}
		if err := tx.Model(&InviterRebate{}).Where("id IN ?", ids).Updates(map[string]any{
			"status":        InviterRebateStatusReleased,
			"locked_reason": "",
			"released_at":   common.GetTimestamp(),
		}).Error; err != nil {
			return err
		}
		return tx.Model(&User{}).Where("id = ?", inviterId).Updates(map[string]any{
			"aff_quota":        gorm.Expr("aff_quota + ?", releasedQuota),
			"aff_history":      gorm.Expr("aff_history + ?", releasedQuota),
			"aff_quota_locked": gorm.Expr("aff_quota_locked - ?", releasedQuota),
		}).Error
	})
	if err != nil {
		common.SysError(common.LogText("inviter rebate release failed: invitee_id=%d inviter_id=%d error=%s", inviteeId, inviterId, err.Error()))
		return
	}
	if releasedQuota > 0 {
		RecordLog(inviterId, LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} released after invitee consumption", map[string]any{"quota": logger.FormatQuota(releasedQuota)}))
	}
}

// ExpireInviterRebateLocks 作废一个批次的超期冻结返利（InviterRebateLockExpiryDays，
// 决策③）：locked(awaiting_consume) 且 created_at 早于「现在 − 过期天数」的台账行
// 翻成 voided(lock_expired)，并按邀请人聚合等额回落 aff_quota_locked 冻结池。
// self_invite_suspect 行永不自动作废（人工裁，决策②），只圈 awaiting_consume。
// 返回本批作废的行数：调用方据此判断是否还有剩余批次（返回值 < batchSize
// 表示扫完）。整个批次在一个事务里（台账行加行锁，与释放钩子互斥防竞态），
// 失败整体回滚只记控制台错误，等下一次清扫重试，不会重复回落。作废成功后
// 按邀请人写管理员侧日志（与封顶/自邀告警同通道，仅管理员可见）。
func ExpireInviterRebateLocks(batchSize int) (int, error) {
	if common.InviterRebateLockExpiryDays <= 0 || batchSize <= 0 {
		return 0, nil
	}
	cutoff := common.GetTimestamp() - int64(common.InviterRebateLockExpiryDays)*86400
	var ids []int
	if err := DB.Model(&InviterRebate{}).
		Where("status = ? AND locked_reason = ? AND created_at < ?", InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume, cutoff).
		Order("id").Limit(batchSize).Pluck("id", &ids).Error; err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, nil
	}
	expiredByInviter := map[int]int{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		var rows []InviterRebate
		if err := lockForUpdate(tx).
			Where("id IN ? AND status = ? AND locked_reason = ? AND created_at < ?", ids, InviterRebateStatusLocked, InviterRebateLockedAwaitingConsume, cutoff).
			Find(&rows).Error; err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}
		rowIds := make([]int, len(rows))
		for i, row := range rows {
			rowIds[i] = row.Id
			expiredByInviter[row.InviterId] += row.Quota
		}
		if err := tx.Model(&InviterRebate{}).Where("id IN ?", rowIds).Updates(map[string]any{
			"status":        InviterRebateStatusVoided,
			"locked_reason": "",
			"voided_reason": InviterRebateVoidedLockExpired,
		}).Error; err != nil {
			return err
		}
		// 回落冻结池；邀请人已被硬删除时无行可更新，作废照常（钱无处可去）
		for inviterId, quota := range expiredByInviter {
			if err := tx.Model(&User{}).Where("id = ?", inviterId).
				Update("aff_quota_locked", gorm.Expr("aff_quota_locked - ?", quota)).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		common.SysError(common.LogText("inviter rebate lock expiry failed: error=%s", err.Error()))
		return 0, err
	}
	for inviterId, quota := range expiredByInviter {
		recordInviterRebateLockExpiryLog(inviterId, quota)
	}
	return len(expiredByInviter), nil
}

// recordInviterRebateLockExpiryLog 在作废批次提交后记录冻结池过期告警，
// 与失败/封顶/自邀日志同一通道：user_id=0（系统）+ LogTypeSystem，仅管理员可见，
// 供站长核对过期策略执行情况。
func recordInviterRebateLockExpiryLog(inviterId, quota int) {
	RecordLog(0, LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} expired from the locked pool and voided", map[string]any{"quota": logger.FormatQuota(quota), "inviter_id": inviterId}))
}

// recordInviterRebateLog 在充值事务提交后给邀请人记录返利系统日志。
func recordInviterRebateLog(inviterId int, rebate int) {
	RecordLog(inviterId, LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} for invitee top-up", map[string]any{"quota": logger.FormatQuota(rebate)}))
}

// recordInviterRebateFailureLog 在充值事务提交后记录返利发放失败。日志归属
// user_id=0（系统），因此只出现在管理员的全量日志查询（/api/log/，AdminAuth）
// 中，邀请双方自己的日志页看不到，供人工核对补发使用。
func recordInviterRebateFailureLog(inviteeId, inviterId, rebate int) {
	RecordLog(0, LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} failed for invitee top-up, manual review required", map[string]any{"quota": logger.FormatQuota(rebate), "inviter_id": inviterId, "invitee_id": inviteeId}))
}

// recordInviterRebateMonthlyCapLog 在充值事务提交后记录被月度封顶作废/截断的
// 返利，与失败日志同一通道：user_id=0（系统）+ LogTypeSystem，仅管理员可见，
// 供站长核对当月封顶执行情况。
func recordInviterRebateMonthlyCapLog(inviteeId, inviterId, rebate int) {
	RecordLog(0, LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} withheld due to the inviter monthly cap", map[string]any{"quota": logger.FormatQuota(rebate), "inviter_id": inviterId, "invitee_id": inviteeId}))
}

// recordInviterRebateSelfInviteSuspectLog 在充值事务提交后记录自邀嫌疑告警，
// 与失败/封顶日志同一通道：user_id=0（系统）+ LogTypeSystem，仅管理员可见。
// 嫌疑返利已冻结为 locked(self_invite_suspect) 永不自动释放，站长查证后在
// 台账人工放行（真推荐，如家庭共用出口 IP）或作废（真自邀）。
func recordInviterRebateSelfInviteSuspectLog(inviteeId, inviterId, rebate int) {
	RecordLog(0, LogTypeSystem, common.NewMessage("Invitation rebate {{quota}} held for self-invite suspicion, manual review required", map[string]any{"quota": logger.FormatQuota(rebate), "inviter_id": inviterId, "invitee_id": inviteeId}))
}

// ---- P5.2：管理端台账人工处置（void / release / clawback） ----

// 人工处置的状态前置错误。控制器据此返回 4xx 业务错误而不是 500。
var (
	ErrInviterRebateRowNotFound  = errors.New("inviter rebate row does not exist")
	ErrInviterRebateRowNotLocked = errors.New("inviter rebate row is not locked")
	ErrInviterRebateRowVoided    = errors.New("inviter rebate row is already voided")
)

// InviterRebateAdminOpResult 一次人工处置的结果：处置后的台账行（事务内
// 已刷新）、涉及的邀请人 id、Quota（本次实际入账/回收/作废的额度，邀请人
// 已硬删除的 release 记 0）、Debt（clawback 不足扣回的欠账额度，仅
// refund_underfunded / 邀请人已删除的 released clawback 分支非零）。
type InviterRebateAdminOpResult struct {
	Row       InviterRebate `json:"row"`
	InviterId int           `json:"inviter_id"`
	Quota     int           `json:"quota"`
	Debt      int           `json:"debt"`
}

// lockInviterRebateRowForAdmin 在事务里按 id 加行锁取台账行，并统一翻译
// 「不存在」错误。供三个人工处置入口复用。
func lockInviterRebateRowForAdmin(tx *gorm.DB, id int) (*InviterRebate, error) {
	var row InviterRebate
	if err := lockForUpdate(tx).Where("id = ?", id).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInviterRebateRowNotFound
		}
		return nil, err
	}
	return &row, nil
}

// AdminVoidInviterRebate 管理员人工作废一笔冻结返利（P5.2，决策②自邀查证
// 的"真自邀"出口）：locked（含 self_invite_suspect / awaiting_consume）行翻
// voided(admin_void)，并等额回落邀请人 aff_quota_locked 冻结池。只处置
// locked 行——released 已入账属回收（clawback）管辖，voided 无需再动。
// 邀请人已被硬删除时冻结池无行可扣，作废照常（钱无处可去，与过期清扫同
// 口径）。全程单事务（行锁 + 用户行锁），失败整体回滚。
func AdminVoidInviterRebate(id int) (*InviterRebateAdminOpResult, error) {
	result := &InviterRebateAdminOpResult{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		row, err := lockInviterRebateRowForAdmin(tx, id)
		if err != nil {
			return err
		}
		if row.Status != InviterRebateStatusLocked {
			return ErrInviterRebateRowNotLocked
		}
		result.InviterId = row.InviterId
		result.Quota = row.Quota
		if err := tx.Model(&InviterRebate{}).Where("id = ?", row.Id).Updates(map[string]any{
			"status":        InviterRebateStatusVoided,
			"locked_reason": "",
			"voided_reason": InviterRebateVoidedAdminVoid,
		}).Error; err != nil {
			return err
		}
		// 回落冻结池；邀请人已被硬删除时无行可更新（RowsAffected 0），不视为错误
		if err := tx.Model(&User{}).Where("id = ?", row.InviterId).
			Update("aff_quota_locked", gorm.Expr("aff_quota_locked - ?", row.Quota)).Error; err != nil {
			return err
		}
		row.Status = InviterRebateStatusVoided
		row.LockedReason = ""
		row.VoidedReason = InviterRebateVoidedAdminVoid
		result.Row = *row
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// AdminReleaseInviterRebate 管理员人工放行一笔冻结返利（P5.2，自邀查证的
// "真推荐"出口）：locked（含 self_invite_suspect / awaiting_consume）行翻
// released、邀请人 aff_quota/aff_history 入账、aff_quota_locked 等额回落，
// 与消费解锁钩子的资金动作完全一致，只是触发方换成管理员。邀请人已被硬
// 删除时改记 voided(inviter_missing)、Quota 记 0。全程单事务，失败整体
// 回滚。日志由控制器在提交后写（需要请求上下文做审计）。
func AdminReleaseInviterRebate(id int) (*InviterRebateAdminOpResult, error) {
	result := &InviterRebateAdminOpResult{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		row, err := lockInviterRebateRowForAdmin(tx, id)
		if err != nil {
			return err
		}
		if row.Status != InviterRebateStatusLocked {
			return ErrInviterRebateRowNotLocked
		}
		result.InviterId = row.InviterId
		var inviter User
		if err := lockForUpdate(tx).Where("id = ?", row.InviterId).First(&inviter).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			// 邀请人已被硬删除：钱无处发放，改记 voided 留痕
			if err := tx.Model(&InviterRebate{}).Where("id = ?", row.Id).Updates(map[string]any{
				"status":        InviterRebateStatusVoided,
				"locked_reason": "",
				"voided_reason": InviterRebateVoidedInviterMissing,
			}).Error; err != nil {
				return err
			}
			row.Status = InviterRebateStatusVoided
			row.LockedReason = ""
			row.VoidedReason = InviterRebateVoidedInviterMissing
			result.Row = *row
			return nil
		}
		if err := tx.Model(&InviterRebate{}).Where("id = ?", row.Id).Updates(map[string]any{
			"status":        InviterRebateStatusReleased,
			"locked_reason": "",
			"released_at":   common.GetTimestamp(),
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&User{}).Where("id = ?", row.InviterId).Updates(map[string]any{
			"aff_quota":        gorm.Expr("aff_quota + ?", row.Quota),
			"aff_history":      gorm.Expr("aff_history + ?", row.Quota),
			"aff_quota_locked": gorm.Expr("aff_quota_locked - ?", row.Quota),
		}).Error; err != nil {
			return err
		}
		row.Status = InviterRebateStatusReleased
		row.LockedReason = ""
		row.ReleasedAt = common.GetTimestamp()
		result.Quota = row.Quota
		result.Row = *row
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// AdminClawbackInviterRebate 来源充值退款回收（P5.2）：管理员在支付平台
// 确认退款后对对应返利行人工触发，规则见 docs「退款回收」一节——
//   - locked：直接 voided(refund)，冻结池等额回落（钱一分没出）；
//   - released 且邀请人 aff_quota ≥ 该笔：aff_quota/aff_history 全额扣回
//   - voided(refund)，等同撤销该笔返利；
//   - released 且不足：aff_quota 扣到 0 + voided(refund_underfunded)，
//     差额记欠账（只记账不动余额，人工决定是否追）；
//   - released 且邀请人已被硬删除：voided(refund) + 全额欠账（无池可扣）。
//
// voided 行不可回收（ErrInviterRebateRowVoided）。全程单事务（行锁 + 用户
// 行锁），失败整体回滚。日志（邀请人回收通知 + 欠账管理员告警）由控制器
// 在提交后写。
func AdminClawbackInviterRebate(id int) (*InviterRebateAdminOpResult, error) {
	result := &InviterRebateAdminOpResult{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		row, err := lockInviterRebateRowForAdmin(tx, id)
		if err != nil {
			return err
		}
		if row.Status == InviterRebateStatusVoided {
			return ErrInviterRebateRowVoided
		}
		result.InviterId = row.InviterId
		switch row.Status {
		case InviterRebateStatusLocked:
			if err := tx.Model(&InviterRebate{}).Where("id = ?", row.Id).Updates(map[string]any{
				"status":        InviterRebateStatusVoided,
				"locked_reason": "",
				"voided_reason": InviterRebateVoidedRefund,
			}).Error; err != nil {
				return err
			}
			// 回落冻结池；邀请人已被硬删除时无行可更新，作废照常
			if err := tx.Model(&User{}).Where("id = ?", row.InviterId).
				Update("aff_quota_locked", gorm.Expr("aff_quota_locked - ?", row.Quota)).Error; err != nil {
				return err
			}
			result.Quota = row.Quota
			row.Status = InviterRebateStatusVoided
			row.LockedReason = ""
			row.VoidedReason = InviterRebateVoidedRefund
		case InviterRebateStatusReleased:
			var inviter User
			voidedReason := InviterRebateVoidedRefund
			if err := lockForUpdate(tx).Where("id = ?", row.InviterId).First(&inviter).Error; err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}
				// 邀请人已被硬删除：收益池无行可扣，全额记欠账（回收口径仍是 refund）
				result.Debt = row.Quota
			} else if inviter.AffQuota >= row.Quota {
				if err := tx.Model(&User{}).Where("id = ?", row.InviterId).Updates(map[string]any{
					"aff_quota":   gorm.Expr("aff_quota - ?", row.Quota),
					"aff_history": gorm.Expr("aff_history - ?", row.Quota),
				}).Error; err != nil {
					return err
				}
				result.Quota = row.Quota
			} else {
				// 已划转/不足：aff_quota 扣到 0，差额欠账；不动 aff_history（历史累计
				// 只反映真实发生过的收益，欠账不追溯改写），更不动余额（客诉与合规风险）
				recovered := inviter.AffQuota
				result.Quota = recovered
				result.Debt = row.Quota - recovered
				voidedReason = InviterRebateVoidedRefundUnderfunded
				if err := tx.Model(&User{}).Where("id = ?", row.InviterId).
					Update("aff_quota", 0).Error; err != nil {
					return err
				}
			}
			if err := tx.Model(&InviterRebate{}).Where("id = ?", row.Id).Updates(map[string]any{
				"status":        InviterRebateStatusVoided,
				"voided_reason": voidedReason,
			}).Error; err != nil {
				return err
			}
			row.Status = InviterRebateStatusVoided
			row.VoidedReason = voidedReason
		}
		result.Row = *row
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
