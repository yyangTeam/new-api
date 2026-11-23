package operation_setting

import (
	"encoding/json"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
)

// ---------------------------------------------------------------------------
// 邀请返利阶梯（P2.2）
// DB key: inviter_rebate_setting.tiers
//
// 阶梯非空时完全取代扁平 InviterRebatePercent：按邀请人 aff_count 取满足
// min_invitees 的最高档；低于最低档时该邀请人返利为 0（想要"人人有份"
// 需显式配一档 min_invitees = 0）。阶梯为空/未配置时回退扁平
// InviterRebatePercent。首充加成（InviterRebateFirstTopUpPercent）不进
// 阶梯 JSON，保持扁平 option，生效时与常规档取大者（见
// model/inviter_rebate.go）。
// ---------------------------------------------------------------------------

// InviterRebateTier 是邀请返利阶梯的一档：邀请人 aff_count 达到
// MinInvitees 即适用 Percent。配置需按 min_invitees 严格递增排列。
type InviterRebateTier struct {
	MinInvitees int `json:"min_invitees"`
	Percent     int `json:"percent"`
}

// InviterRebateSetting 由 config.GlobalConfig 管理，DB key 为
// inviter_rebate_setting.tiers（JSON 数组字符串）。
type InviterRebateSetting struct {
	Tiers []InviterRebateTier `json:"tiers"`
}

var inviterRebateSetting = InviterRebateSetting{}

func init() {
	config.GlobalConfig.Register("inviter_rebate_setting", &inviterRebateSetting)
}

// inviterRebateMaxTiers 限制阶梯档数：档位解析在返利热路径上逐档线性
// 扫描，防止配置膨胀拖慢每次充值返利。
const inviterRebateMaxTiers = 20

// ValidateInviterRebateTiersJSON 校验运营写入的完整阶梯 JSON（option key
// inviter_rebate_setting.tiers）。空串 / "null" / "[]" 均合法（= 关闭
// 阶梯，回退扁平比例）。返回解析出的阶梯供调用方进一步决策。
func ValidateInviterRebateTiersJSON(value string) ([]InviterRebateTier, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || trimmed == "null" {
		return nil, nil
	}
	raw := json.RawMessage(trimmed)
	if common.GetJsonType(raw) != "array" {
		return nil, common.NewMessage("Inviter rebate tiers must be a JSON array")
	}
	var tiers []InviterRebateTier
	if err := common.Unmarshal(raw, &tiers); err != nil {
		return nil, common.NewMessage("Failed to parse inviter rebate tiers: {{error}}", map[string]any{"error": err.Error()})
	}
	return validateInviterRebateTiers(tiers)
}

// validateInviterRebateTiers 校验阶梯内容：档数上限、percent 0–100、
// min_invitees 非负、按 min_invitees 严格递增。空数组合法（关闭阶梯）。
func validateInviterRebateTiers(tiers []InviterRebateTier) ([]InviterRebateTier, error) {
	if len(tiers) == 0 {
		return nil, nil
	}
	if len(tiers) > inviterRebateMaxTiers {
		return nil, common.NewMessage("Inviter rebate tiers must contain at most {{count}} tiers", map[string]any{"count": inviterRebateMaxTiers})
	}
	for i := range tiers {
		if tiers[i].Percent < 0 || tiers[i].Percent > 100 {
			return nil, common.NewMessage("Inviter rebate tier percent must be an integer between 0 and 100")
		}
		if tiers[i].MinInvitees < 0 {
			return nil, common.NewMessage("Inviter rebate tier minimum invitees must be a non-negative integer")
		}
		if i > 0 && tiers[i].MinInvitees <= tiers[i-1].MinInvitees {
			return nil, common.NewMessage("Inviter rebate tiers must be ordered by strictly increasing minimum invitees")
		}
	}
	return tiers, nil
}

// GetInviterRebateTiers 返回当前生效的阶梯（按写入校验的同一规则复核）。
// 运行期配置非法（绕过 API 直接改库等）时降级为无阶梯并记控制台错误——
// 与 P2.1 首充计数失败同一保守方向：回退扁平比例，宁漏配不多发。
func GetInviterRebateTiers() []InviterRebateTier {
	tiers, err := validateInviterRebateTiers(inviterRebateSetting.Tiers)
	if err != nil {
		common.SysError(common.LogText("invalid inviter rebate tiers config, ignoring tiers: %s", err.Error()))
		return nil
	}
	return tiers
}

// InviterRebateTierPercentConfigured 报告阶梯里是否存在正值档位，用作
// creditInviterRebateTx 总闸条件之一（三闸：扁平比例、首充比例、阶梯任一
// 正值档；全 0 时整套返利静默关闭）。
func InviterRebateTierPercentConfigured() bool {
	for _, tier := range GetInviterRebateTiers() {
		if tier.Percent > 0 {
			return true
		}
	}
	return false
}
