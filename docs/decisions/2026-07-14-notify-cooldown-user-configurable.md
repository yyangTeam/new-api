# ADR: 用户可配置通知冷却时间

**Date:** 2026-07-14  
**Status:** Proposed  
**Deciders:** yyy

## Context

当用户额度低于预警阈值后，系统在每次 API 请求结算时都会尝试发送通知。当前限频为服务端全局默认（环境变量 `NOTIFY_LIMIT_COUNT=2`、`NOTIFICATION_LIMIT_DURATION_MINUTE=10`），即每 10 分钟最多 2 条。活跃用户一天最多可收到约 288 封邮件。用户无法自行控制通知频率。

### 现有限频机制分析

- **限频 key：** `notify_limit:{userId}:{notifyType}:{YYYYMMDDHH}`（含日历小时）
- **限频逻辑：** 首次创建 key 时设 TTL=10 分钟，计数达 2 后拦截
- **问题：** TTL 过期后 key 消失，同小时内可再发 2 条；跨小时计数器归零
- **代码位置：** `service/notify-limit.go`、`service/user_notify.go:57`、`service/quota.go:457-509`

## Decision

新增用户级别 `notify_cooldown_minutes` 字段（int，JSON key `notify_cooldown_minutes`），表示两次同类型通知之间的最小间隔（分钟）。冷却期内最多发送 1 条通知。

- 值为 0 或未设置：使用系统默认行为（保持向后兼容）
- 值 > 0：用户自定义冷却，key 不含小时后缀，TTL = 用户设定的分钟数，计数上限 = 1

### 改动清单

| 层级 | 文件 | 改动 |
|------|------|------|
| DTO | `dto/user_settings.go` | 新增 `NotifyCooldownMinutes int` 字段 |
| Controller | `controller/user.go` | `UpdateUserSettingRequest` 新增字段，校验 0 ≤ 值 ≤ 43200 |
| Service | `service/notify-limit.go` | `CheckNotificationLimit` 新增 `cooldownMinutes` 参数；cooldown > 0 时用简化逻辑 |
| Service | `service/user_notify.go` | 调用时传入 `userSetting.NotifyCooldownMinutes` |
| 前端类型 | `web/default/src/features/profile/types.ts` | `UserSettings` 接口新增字段 |
| 前端 UI | `web/default/src/features/profile/components/tabs/notification-tab.tsx` | 阈值输入下方添加数字输入框 |
| i18n | `web/default/src/i18n/locales/{en,zh}.json` | 新增翻译 key |

### 限频逻辑变更详情

`CheckNotificationLimit(userId int, notifyType string, cooldownMinutes int) (bool, error)`

**当 `cooldownMinutes > 0`：**
- Redis key：`notify_limit:{userId}:{notifyType}`（无小时后缀）
- TTL = `cooldownMinutes` 分钟
- key 存在 → 拦截；不存在 → 设置 key + TTL → 放行
- 内存模式同理，通过 Timestamp 比较实现

**当 `cooldownMinutes == 0`：**
- 走现有逻辑不变（兼容现有行为）

### 前端 UI

在通知设置页面「额度预警阈值」下方新增输入框：
- 标签：`Notification Cooldown (minutes)` / `通知冷却时间（分钟）`
- 描述：`Minimum interval between notifications. Set to 0 to use server default (approx. every 10 minutes).`
- 约束：type=number, min=0, max=43200

## Consequences

**Positive:**
- 用户可自行选择通知频率（如 60=每小时、1440=每天、0=系统默认）
- 完全向后兼容，未配置的用户行为不变
- 实现简单，仅在现有限频逻辑上增加一个分支

**Negative / Trade-offs:**
- 用户设置过大的冷却值（如 30 天）可能导致错过重要通知——通过 UI 提示缓解
- 新字段存储在现有 `users.setting` JSON 列中，无需数据库迁移

## Alternatives Considered

| 方案 | 未采用原因 |
|------|------------|
| 预设档位（每小时/每天/仅一次） | 灵活性不足，用户无法精确控制 |
| 两者结合（预设 + 自定义） | 增加 UI 复杂度，一个数字输入已足够直观 |
| "仅通知一次直到额度恢复" | 需要额外机制检测额度回升重置状态，复杂度高 |

## Verification

1. `go build ./...` 编译通过
2. `go test ./service/... ./controller/...` 测试通过
3. 前端开发服务器确认新字段渲染和保存
4. 手动测试：设冷却 60 分钟 → 触发额度不足 → 验证仅发 1 条，60 分钟内后续请求被抑制
