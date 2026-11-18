package model

import (
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
// 的邀请人发放返利：aff_quota 与 aff_history 原子自增（不增加 aff_count，
// 那是邀请人数字段），并在台账记一行 released。返回返利额、邀请人 ID 与
// 失败返利额：返利为 0 表示无返利（比例关闭、支付合规未确认、被邀请人无
// 邀请人、返利向下取整后不足 1，或邀请人已被硬删除——此时台账记
// voided(inviter_missing) 留痕）。数据库错误同样返回返利 0——返利只是充值
// 的附加收益，绝不能因为返利失败回滚被邀请人的充值，此时记系统错误日志，
// failedRebate 携带应发未发的金额，由调用方在事务提交后写入管理员侧日志；
// 由于充值事务照常提交、幂等状态机不会重放，这笔返利需要人工核对补发。
// 返利已入账但台账 INSERT 失败时不追回（充值已提交、状态机不会重放），
// 只记控制台错误日志：台账缺失只影响后续统计与回收，不影响钱。
// 查询被邀请人失败的分支只记服务器控制台日志：那种情况下数据库本身已经
// 异常，日志表写入大概率同样失败。
func creditInviterRebateTx(tx *gorm.DB, inviteeId int, creditedQuota int, sourceType string, sourceId int) (rebate int, inviterId int, failedRebate int) {
	if common.InviterRebatePercent <= 0 || !operation_setting.IsPaymentComplianceConfirmed() {
		return 0, 0, 0
	}
	var invitee User
	if err := tx.Model(&User{}).Select("id", "inviter_id").Where("id = ?", inviteeId).First(&invitee).Error; err != nil {
		common.SysError(common.LogText("inviter rebate lookup failed: invitee_id=%d quota=%d error=%s", inviteeId, creditedQuota, err.Error()))
		return 0, 0, 0
	}
	if invitee.InviterId == 0 {
		return 0, 0, 0
	}
	rebate = int(int64(creditedQuota) * int64(common.InviterRebatePercent) / 100)
	if rebate <= 0 {
		return 0, invitee.InviterId, 0
	}
	result := tx.Model(&User{}).Where("id = ?", invitee.InviterId).Updates(map[string]any{
		"aff_quota":   gorm.Expr("aff_quota + ?", rebate),
		"aff_history": gorm.Expr("aff_history + ?", rebate),
	})
	if result.Error != nil {
		common.SysError(common.LogText("inviter rebate credit failed: invitee_id=%d inviter_id=%d rebate=%d error=%s", inviteeId, invitee.InviterId, rebate, result.Error.Error()))
		return 0, invitee.InviterId, rebate
	}
	if result.RowsAffected == 0 {
		// 邀请人已被硬删除，返利无处发放；台账记 voided 留痕，不影响充值本身
		if err := tx.Create(&InviterRebate{
			CreatedAt:    common.GetTimestamp(),
			InviterId:    invitee.InviterId,
			InviteeId:    inviteeId,
			SourceType:   sourceType,
			SourceId:     sourceId,
			BaseQuota:    creditedQuota,
			Percent:      common.InviterRebatePercent,
			Quota:        rebate,
			Status:       InviterRebateStatusVoided,
			VoidedReason: InviterRebateVoidedInviterMissing,
		}).Error; err != nil {
			common.SysError(common.LogText("inviter rebate ledger insert failed: invitee_id=%d inviter_id=%d rebate=%d source=%s/%d error=%s", inviteeId, invitee.InviterId, rebate, sourceType, sourceId, err.Error()))
		}
		return 0, invitee.InviterId, 0
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
	return rebate, invitee.InviterId, 0
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
