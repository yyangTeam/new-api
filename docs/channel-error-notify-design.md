# 渠道连续错误通知系统 — 设计方案

> 创建日期：2026-07-05
> 分支：`feat/channel-error-notify`（基于 `dev`）

## 背景

当渠道在生产环境中出现连续请求失败时，管理员目前无法实时收到告警。现有机制仅在单次错误匹配特定关键词/状态码时自动禁用渠道，缺少连续错误计数、错误率监控，也不支持飞书/QQ机器人通知。

本方案新增：
1. 渠道错误计数器（连续计数 + 时间窗口错误率），可配置阈值
2. 飞书机器人通知类型（内置）
3. QQ机器人通知类型（内置，基于 OneBot v11 HTTP API，兼容 go-cqhttp/NapCat/Lagrange 等框架）
4. 管理后台阈值配置界面 + 用户通知设置界面

## 架构

三个独立模块插入现有基础设施：

```
[Relay 请求] ──错误──> processChannelError() ──> IncrementChannelError()
             ──成功──> ResetChannelError()              │
                                                        ▼
                                                  [阈值检查]
                                                   ├─ 连续错误 >= N？
                                                   └─ 时间窗口内错误率 >= X%？
                                                        │
                                                        ▼
                                                  NotifyRootUser()（现有）
                                                        │
                                                        ▼
                                                  NotifyUser() switch 分发
                                                   ├─ email   （现有）
                                                   ├─ webhook （现有）
                                                   ├─ bark    （现有）
                                                   ├─ gotify  （现有）
                                                   ├─ feishu   ← 新增
                                                   └─ qqbot    ← 新增
```

## 实现步骤

### 第1步：渠道错误计数器 — 新建 `service/channel_error_counter.go`

核心数据结构，纯内存存储每个渠道的错误状态：

```go
type channelErrorState struct {
    mu              sync.Mutex
    consecutiveErrs int64        // 连续错误计数
    notifiedConsec  bool         // 是否已发送连续错误通知
    channelName     string
    lastErrorMsg    string
    windowRecords   []windowRecord  // 时间窗口内的请求记录
    notifiedRate    bool            // 是否已发送错误率通知
}

type windowRecord struct {
    timestamp int64
    isError   bool
}
```

导出函数：
- `IncrementChannelError(channelId int, channelName string, errorMsg string)` — relay 错误时调用。递增连续计数器，追加窗口记录，检查阈值。达到阈值且未通知时，通过 `gopool.Go()` 异步调用 `NotifyRootUser()`
- `ResetChannelError(channelId int)` — relay 成功时调用。重置连续计数器和 `notifiedConsec` 标记。不清除窗口记录（按时间过期）
- `init()` 启动清理协程（每10分钟），清理 `sync.Map` 中的过期条目和窗口记录

阈值检查逻辑：
- **连续错误**：`consecutiveErrs >= threshold` 且 `!notifiedConsec` → 通知，设置 `notifiedConsec = true`
- **错误率**：过滤窗口内记录，计算 `errorCount / totalCount`。当 `totalCount >= minRequests` 且 `errorRate >= rateThreshold` 且未通知 → 通知

通知内容包含：渠道名称、渠道ID、错误次数或错误率、时间范围、最近错误信息（截断）。

使用 `dto.NotifyTypeChannelErrorAlert`（新常量）作为通知类型，通过现有 `notify-limit.go` 独立限流。

### 第2步：监控设置扩展 — 修改 `setting/operation_setting/monitor_setting.go`

在 `MonitorSetting` 结构体中新增字段：

```go
ChannelErrorNotifyEnabled         bool    `json:"channel_error_notify_enabled"`          // 总开关
ChannelConsecutiveErrorThreshold  int     `json:"channel_consecutive_error_threshold"`   // 连续错误阈值
ChannelErrorRateEnabled           bool    `json:"channel_error_rate_enabled"`            // 错误率监控开关
ChannelErrorRateThreshold         float64 `json:"channel_error_rate_threshold"`          // 错误率阈值 0-1
ChannelErrorRateWindowMinutes     int     `json:"channel_error_rate_window_minutes"`     // 时间窗口（分钟）
ChannelErrorRateMinRequests       int     `json:"channel_error_rate_min_requests"`       // 窗口内最小请求数
```

默认值：`Enabled: false`，`ConsecutiveThreshold: 5`，`RateEnabled: false`，`RateThreshold: 0.8`，`WindowMinutes: 5`，`MinRequests: 10`

计数器通过 `GetMonitorSetting()` 读取配置，每次检查时读取，始终获取最新值。

### 第3步：通知类型常量 — 修改 `dto/notify.go` + `dto/user_settings.go`

`dto/notify.go` 新增：
```go
NotifyTypeChannelErrorAlert = "channel_error_alert"
```

`dto/user_settings.go` 新增通知类型常量：
```go
NotifyTypeFeishu = "feishu"
NotifyTypeQQBot  = "qqbot"
```

`UserSetting` 结构体新增字段：
```go
FeishuWebhookUrl    string `json:"feishu_webhook_url,omitempty"`
FeishuWebhookSecret string `json:"feishu_webhook_secret,omitempty"`
QQBotUrl            string `json:"qqbot_url,omitempty"`          // OneBot HTTP API 地址
QQBotAccessToken    string `json:"qqbot_access_token,omitempty"` // 访问令牌（可选）
QQBotTargetType     string `json:"qqbot_target_type,omitempty"`  // "private" 或 "group"
QQBotTargetId       string `json:"qqbot_target_id,omitempty"`    // QQ号 或 群号
```

### 第4步：飞书通知 — 新建 `service/feishu_notify.go`

函数 `sendFeishuNotify(webhookUrl, secret string, data dto.Notify) error`：
- 构建飞书交互卡片消息（标题 + 内容）
- 如果设置了 secret，生成签名：`base64(hmac_sha256(timestamp + "\n" + secret, secret))`
- POST 到 webhook URL
- 遵循 `sendGotifyNotify` / `sendBarkNotify` 的模式，支持 Worker 代理和 SSRF 防护

飞书消息格式：
```json
{
  "timestamp": "1234567890",
  "sign": "...",
  "msg_type": "interactive",
  "card": {
    "header": {"title": {"content": "渠道告警", "tag": "plain_text"}, "template": "red"},
    "elements": [{"tag": "div", "text": {"content": "内容", "tag": "lark_md"}}]
  }
}
```

### 第5步：QQ机器人通知 — 新建 `service/qqbot_notify.go`

函数 `sendQQBotNotify(baseUrl, accessToken, targetType, targetId string, data dto.Notify) error`：
- 使用 OneBot v11 HTTP API（兼容 go-cqhttp、NapCat、Lagrange 等）
- `targetType` 为 "private" 或 "group" → 接口为 `/send_private_msg` 或 `/send_group_msg`
- 如果设置了 `accessToken`，添加 `Authorization: Bearer {token}` 请求头
- 遵循现有模式支持 Worker 代理和 SSRF 防护

OneBot v11 消息格式：
```json
{"user_id": 12345, "message": "标题\n内容"}   // 私聊
{"group_id": 12345, "message": "标题\n内容"}  // 群聊
```

### 第6步：通知分发 — 修改 `service/user_notify.go`

在 `NotifyUser()` 的 switch 中新增两个 case：

```go
case dto.NotifyTypeFeishu:
    if userSetting.FeishuWebhookUrl == "" { return nil }
    return sendFeishuNotify(userSetting.FeishuWebhookUrl, userSetting.FeishuWebhookSecret, data)
case dto.NotifyTypeQQBot:
    if userSetting.QQBotUrl == "" { return nil }
    return sendQQBotNotify(userSetting.QQBotUrl, userSetting.QQBotAccessToken,
        userSetting.QQBotTargetType, userSetting.QQBotTargetId, data)
```

### 第7步：Relay 集成 — 修改 `controller/relay.go`（最小改动）

在 `Relay` 函数的重试循环中：

**成功路径**（约第224行，return 之前）：
```go
if newAPIError == nil {
    service.ResetChannelError(channel.Id)  // ← 新增
    relayInfo.LastError = nil
    return
}
```

**错误路径**（约第232行，processChannelError 之后）：
```go
processChannelError(c, ...)
service.IncrementChannelError(channel.Id, channel.Name, newAPIError.Error())  // ← 新增
```

同样的模式应用于 `RelayTask` 函数（约第552行成功路径，约第557行错误路径）。

总计：现有文件新增 **4行代码**。

### 第8步：前端 — 用户通知设置

**`web/default/src/features/profile/types.ts`**：
- 扩展 `NotifyType` 联合类型：加入 `'feishu' | 'qqbot'`
- 在 `UserSettings` 和 `UpdateUserSettingsRequest` 中添加飞书/QQ 配置字段

**`web/default/src/features/profile/constants.ts`**：
- `NOTIFICATION_METHODS` 数组中添加 `{ value: 'feishu', label: 'Feishu' }` 和 `{ value: 'qqbot', label: 'QQ Bot' }`

**`web/default/src/features/profile/components/tabs/notification-tab.tsx`**：
- 在 `NOTIFICATION_ICONS` 中添加飞书和 QQ Bot 图标（使用 lucide-react 的 `MessageSquare` 和 `Bot`）
- 飞书/QQ Bot 选项**仅对管理员可见**：使用已有的 `isAdmin` 变量过滤 `NOTIFICATION_METHODS`，非管理员只能看到 Email/Webhook/Bark/Gotify
- 在 `useState` 和 `useEffect` profile 解析中添加新字段初始值
- 添加飞书配置条件渲染块（Webhook URL + Secret 输入框）
- 添加 QQ Bot 配置条件渲染块（API URL、Access Token、目标类型选择器、目标 ID 输入框）

### 第9步：前端 — 管理后台监控设置

**`web/default/src/features/system-settings/models/routing-reliability-section.tsx`**：

在现有"自动禁用规则"部分之后新增"渠道错误告警"区域：
- `channel_error_notify_enabled`（Switch）— 连续错误告警总开关
- `channel_consecutive_error_threshold`（数字输入框）— 连续错误阈值，默认 5
- `channel_error_rate_enabled`（Switch）— 错误率监控开关
- `channel_error_rate_threshold`（数字输入框）— 错误率阈值 0-1，默认 0.8
- `channel_error_rate_window_minutes`（数字输入框）— 时间窗口（分钟），默认 5
- `channel_error_rate_min_requests`（数字输入框）— 最小请求数，默认 10

所有字段嵌套在 `monitor_setting.*` 键下，遵循现有 `auto_test_channel_*` 的模式。需要同步更新 zod schema、`buildFormDefaults`、`normalizeDefaults`、`normalizeFormValues` 和 Props 类型定义。

### 第10步：国际化

在 `web/default/src/i18n/locales/en.json` 和 `zh.json` 中添加翻译键：
- 飞书/QQ Bot 通知相关的标签和描述
- 渠道错误告警设置的标签和描述

## 文件变更汇总

| 文件 | 变更类型 | 预估行数 |
|------|---------|---------|
| `service/channel_error_counter.go` | **新建** | ~120 |
| `service/feishu_notify.go` | **新建** | ~100 |
| `service/qqbot_notify.go` | **新建** | ~90 |
| `setting/operation_setting/monitor_setting.go` | 新增6个字段+默认值 | ~12 |
| `dto/notify.go` | 新增1个常量 | +1 |
| `dto/user_settings.go` | 新增6个字段+2个常量 | ~10 |
| `service/user_notify.go` | 新增2个 switch case | ~8 |
| `controller/relay.go` | 新增错误计数器调用 | +4 |
| `web/default/src/features/profile/types.ts` | 扩展类型 | ~8 |
| `web/default/src/features/profile/constants.ts` | 新增2个方法 | +2 |
| `web/default/src/features/profile/components/tabs/notification-tab.tsx` | 新增飞书/QQ配置UI | ~80 |
| `web/default/src/features/system-settings/models/routing-reliability-section.tsx` | 新增错误告警设置 | ~80 |
| `web/default/src/i18n/locales/en.json` | 新增约20个翻译键 | ~20 |
| `web/default/src/i18n/locales/zh.json` | 新增约20个翻译键 | ~20 |

**现有代码修改：4个文件，约35行。新建文件：3个。**

## 验证方式

1. **后端编译**：`go build ./...`
2. **前端构建**：`cd web/default && bun run build`
3. **飞书测试**：配置飞书 webhook 机器人，将 root 用户的通知类型设为 feishu，手动触发渠道错误验证通知到达
4. **QQ 测试**：搭建 go-cqhttp/NapCat 实例，将 root 用户的通知类型设为 qqbot，验证通知到达
5. **连续错误测试**：设阈值为3，对已知故障渠道发请求，验证第3次连续错误后触发通知，且不重复通知直到渠道恢复
6. **错误率测试**：设错误率阈值0.5、窗口1分钟、最小请求数3，混合发成功/失败请求，验证超阈值时触发通知
7. **性能验证**：计数器操作为内存 atomic/mutex，亚微秒级。可进行负载测试确认 relay 请求无可感知延迟影响
