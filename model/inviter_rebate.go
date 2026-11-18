package model

import (
	"errors"
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
	InviterRebateVoidedMonthlyCap        = "monthly_cap" // 邀请人月度返利封顶（P1.1）
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

// creditInviterRebateTx 在充值到账事务内，按 InviterRebatePercent 给被邀请人
// 的邀请人发放返利，并在台账记一行。先经 P1.1 封顶截断：单笔封顶
// （InviterRebateMaxPerTopup）超出部分直接丢弃不记台账；月度封顶
// （InviterRebateMonthlyMax）按自然月统计已发放的 released + locked 台账行
// （voided 不计，冻结池同样占用额度），已达上限的整笔记
// voided(monthly_cap) 留痕，本笔会超出但尚未达上限的只发剩余额度。
// 消费解锁（InviterRebateConsumeUnlockQuota）关闭或被邀请人累计消费已达标时
// 直接发放：aff_quota 与 aff_history 原子自增（不增加 aff_count，那是邀请人
// 数字段），台账记 released；未达标时冻结发放：仅增加邀请人 aff_quota_locked
// 冻结池，台账记 locked(awaiting_consume)，等 releaseInviterRebatesOnConsume
// 在消费达标后释放（冻结期间不写邀请人日志，钱到账释放时才写）。
// 返回返利额、邀请人 ID、失败返利额与月度封顶截断额：返利为 0 表示本次没有
// 入账（比例关闭、支付合规未确认、被邀请人无邀请人、返利向下取整后不足 1、
// 进入冻结池、被月度封顶整笔作废，或邀请人已被硬删除——此时台账记
// voided(inviter_missing) 留痕）。数据库错误同样返回返利 0——返利只是充值
// 的附加收益，绝不能因为返利失败回滚被邀请人的充值，此时记系统错误日志，
// failedRebate 携带应发未发的金额，由调用方在事务提交后写入管理员侧日志；
// 由于充值事务照常提交、幂等状态机不会重放，这笔返利需要人工核对补发。
// cappedRebate 携带被月度封顶截掉（作废或砍掉）的金额，同样由调用方在事务
// 提交后写管理员侧日志；单笔封顶属正常策略截断，不写日志。
// 返利已入账（或已进冻结池）但台账 INSERT 失败时不追回（充值已提交、
// 状态机不会重放），只记控制台错误日志：台账缺失只影响后续统计与回收，
// 不影响钱——冻结路径下这笔金额会滞留在冻结池无法释放，需人工核对。
// 查询被邀请人失败的分支只记服务器控制台日志：那种情况下数据库本身已经
// 异常，日志表写入大概率同样失败。
func creditInviterRebateTx(tx *gorm.DB, inviteeId int, creditedQuota int, sourceType string, sourceId int) (rebate int, inviterId int, failedRebate int, cappedRebate int) {
	if common.InviterRebatePercent <= 0 || !operation_setting.IsPaymentComplianceConfirmed() {
		return 0, 0, 0, 0
	}
	var invitee User
	if err := tx.Model(&User{}).Select("id", "inviter_id", "used_quota").Where("id = ?", inviteeId).First(&invitee).Error; err != nil {
		common.SysError(common.LogText("inviter rebate lookup failed: invitee_id=%d quota=%d error=%s", inviteeId, creditedQuota, err.Error()))
		return 0, 0, 0, 0
	}
	if invitee.InviterId == 0 {
		return 0, 0, 0, 0
	}
	rebate = int(int64(creditedQuota) * int64(common.InviterRebatePercent) / 100)
	if rebate <= 0 {
		return 0, invitee.InviterId, 0, 0
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
			return 0, invitee.InviterId, rebate, 0
		}
		if remaining := int64(common.InviterRebateMonthlyMax) - grantedThisMonth; remaining <= 0 {
			insertVoidedInviterRebateTx(tx, inviteeId, invitee.InviterId, rebate, creditedQuota, sourceType, sourceId, InviterRebateVoidedMonthlyCap)
			return 0, invitee.InviterId, 0, rebate
		} else if int64(rebate) > remaining {
			cappedRebate = rebate - int(remaining)
			rebate = int(remaining)
		}
	}
	// 消费解锁开启且被邀请人累计消费未达标：只进冻结池，台账记 locked，
	// 返利额返回 0（调用方据此不给邀请人写"已到账"日志）
	if common.InviterRebateConsumeUnlockQuota > 0 && invitee.UsedQuota < common.InviterRebateConsumeUnlockQuota {
		credited, inviter, failed := lockInviterRebateTx(tx, inviteeId, invitee.InviterId, rebate, creditedQuota, sourceType, sourceId)
		return credited, inviter, failed, cappedRebate
	}
	result := tx.Model(&User{}).Where("id = ?", invitee.InviterId).Updates(map[string]any{
		"aff_quota":   gorm.Expr("aff_quota + ?", rebate),
		"aff_history": gorm.Expr("aff_history + ?", rebate),
	})
	if result.Error != nil {
		common.SysError(common.LogText("inviter rebate credit failed: invitee_id=%d inviter_id=%d rebate=%d error=%s", inviteeId, invitee.InviterId, rebate, result.Error.Error()))
		return 0, invitee.InviterId, rebate, cappedRebate
	}
	if result.RowsAffected == 0 {
		// 邀请人已被硬删除，返利无处发放；台账记 voided 留痕，不影响充值本身
		insertVoidedInviterRebateTx(tx, inviteeId, invitee.InviterId, rebate, creditedQuota, sourceType, sourceId, InviterRebateVoidedInviterMissing)
		return 0, invitee.InviterId, 0, cappedRebate
	}
	if err := tx.Create(&InviterRebate{
		CreatedAt:  common.GetTimestamp(),
		InviterId:  invitee.InviterId,
		InviteeId:  inviteeId,
		SourceType: sourceType,
		SourceId:   sourceId,
		BaseQuota:  creditedQuota,
		Percent:    common.InviterRebatePercent,
		Quota:      rebate,
		Status:     InviterRebateStatusReleased,
		ReleasedAt: common.GetTimestamp(),
	}).Error; err != nil {
		common.SysError(common.LogText("inviter rebate ledger insert failed: invitee_id=%d inviter_id=%d rebate=%d source=%s/%d error=%s", inviteeId, invitee.InviterId, rebate, sourceType, sourceId, err.Error()))
	}
	return rebate, invitee.InviterId, 0, cappedRebate
}

// insertVoidedInviterRebateTx 在台账记一笔作废返利（不发放、不冻结），用于
// 邀请人已被硬删除（inviter_missing）与月度封顶（monthly_cap）。台账 INSERT
// 失败只记控制台错误：作废本来就不涉及钱，留痕缺失只影响统计与核对。
func insertVoidedInviterRebateTx(tx *gorm.DB, inviteeId, inviter, rebate, creditedQuota int, sourceType string, sourceId int, reason string) {
	if err := tx.Create(&InviterRebate{
		CreatedAt:    common.GetTimestamp(),
		InviterId:    inviter,
		InviteeId:    inviteeId,
		SourceType:   sourceType,
		SourceId:     sourceId,
		BaseQuota:    creditedQuota,
		Percent:      common.InviterRebatePercent,
		Quota:        rebate,
		Status:       InviterRebateStatusVoided,
		VoidedReason: reason,
	}).Error; err != nil {
		common.SysError(common.LogText("inviter rebate ledger insert failed: invitee_id=%d inviter_id=%d rebate=%d source=%s/%d error=%s", inviteeId, inviter, rebate, sourceType, sourceId, err.Error()))
	}
}

// lockInviterRebateTx 是 creditInviterRebateTx 的消费解锁冻结分支：把返利
// 记进邀请人冻结池（aff_quota_locked）并在台账记 locked(awaiting_consume)。
// 与直接发放分支共用同一失败语义：冻结池 UPDATE 失败返回 failedRebate
// 供管理员侧日志人工核对；台账 INSERT 失败只记控制台错误（金额已进冻结池，
// 但没有台账行，release 永远找不到它，将滞留在冻结池中）。
func lockInviterRebateTx(tx *gorm.DB, inviteeId, inviter, rebate, creditedQuota int, sourceType string, sourceId int) (credited, inviterId, failedRebate int) {
	result := tx.Model(&User{}).Where("id = ?", inviter).Update("aff_quota_locked", gorm.Expr("aff_quota_locked + ?", rebate))
	if result.Error != nil {
		common.SysError(common.LogText("inviter rebate credit failed: invitee_id=%d inviter_id=%d rebate=%d error=%s", inviteeId, inviter, rebate, result.Error.Error()))
		return 0, inviter, rebate
	}
	if result.RowsAffected == 0 {
		// 邀请人已被硬删除，返利无处冻结；台账记 voided 留痕
		insertVoidedInviterRebateTx(tx, inviteeId, inviter, rebate, creditedQuota, sourceType, sourceId, InviterRebateVoidedInviterMissing)
		return 0, inviter, 0
	}
	if err := tx.Create(&InviterRebate{
		CreatedAt:    common.GetTimestamp(),
		InviterId:    inviter,
		InviteeId:    inviteeId,
		SourceType:   sourceType,
		SourceId:     sourceId,
		BaseQuota:    creditedQuota,
		Percent:      common.InviterRebatePercent,
		Quota:        rebate,
		Status:       InviterRebateStatusLocked,
		LockedReason: InviterRebateLockedAwaitingConsume,
	}).Error; err != nil {
		common.SysError(common.LogText("inviter rebate ledger insert failed: invitee_id=%d inviter_id=%d rebate=%d source=%s/%d error=%s", inviteeId, inviter, rebate, sourceType, sourceId, err.Error()))
	}
	return 0, inviter, 0
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
