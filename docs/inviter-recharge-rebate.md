# 邀请充值返利（Inviter Recharge Rebate）

被邀请人 B 充值到账时，按可配置比例给邀请人 A 发放返利。本文档记录已上线的 v1 行为，以及 2.0（风控 → 激励 → 运营）的规划。

## 一分钟速览

整个邀请返利就是四句话：

1. **返利何时发生**：B 充值钱到账（线上支付或兑换码）→ 按 `InviterRebatePercent` 比例算出一笔额度 → 加到 A 的"邀请收益"（`aff_quota`，需 A 手动划转，不自动进余额）。
2. **兜底铁律**：返利出任何问题**都不影响 B 的充值**——充值照常到账，返利失败只记管理员日志，人工补。
3. **2.0 只改一件事**：把"直接加到 A 账上"改成**先记账到台账表**，每笔返利有 locked（冻结）/ released（到账）/ voided（作废）三个状态。
4. **2.0 的三步棋**：风控（冻结到 B 真消费才发放 + 封顶 + 自邀检测）→ 激励（首充加成 + 阶梯比例）→ 运营（排行榜 + 看板）。

```
B 充值到账
   │
   ▼
计算返利（比例 × B 的到账额度）
   │
   ▼
┌─ v1（现在）：直接进 A 的邀请收益池，完事
│
└─ v2（规划）：先记台账
      │
      ├─ B 还没真消费/有自邀嫌疑 → 冻结（locked），拿不到
      ├─ B 消费达标           → 释放（released）进收益池
      └─ B 退款/超封顶        → 作废（voided），一分不出
```

细节按需查阅下文：不想读设计正文，直接看下一节"场景速查"（18 个真实例子）；v1 行为与失败语义 → "v1：已实现的行为"；三态状态机与各期设计 → "2.0 规划"。

## 场景速查

用三个固定人物把所有场景走一遍。设定：返利比例 10%，消费解锁门槛 10 美元，金额均以美元表述（$1 = 500,000 额度）。

**人物**：阿明（A，邀请人，拉新赚返利的正常用户）；小红（B，被邀请人，被阿明的邀请链接注册）；老王（注册两年的真实老用户）。

### v1（现在线上）

| # | 场景 | 结果 |
| --- | --- | --- |
| ① | 正常发放：小红充 50 → 返利 50 × 10% = 5 进阿明收益池 | 阿明日志多一条"被邀请人充值返利 5"，手动划转后可用 |
| ② | 零头不足 1：小红充 4.5 → 返利 0.45 不足最小单位 | 不发，充值正常。防刷小额凑零头 |
| ③ | 自然用户：老王 `inviter_id = 0`，充 100 | 返利 0，一切照旧 |
| ④ | 返利失败：小红充 50，发放返利时数据库抖了 | **小红的 50 照常到账、订单成功**；阿明没收到 5，管理员日志后台有"返利 5 发放失败，需人工核对"记录，站长手动补 |
| ⑤ | 邀请人跑路：阿明账号被硬删除，小红充 50 | 返利无处可去，静默作罢，充值正常 |

### v2：消费解锁（门槛 10 美元）

| # | 场景 | 结果 |
| --- | --- | --- |
| ⑥ | 新用户正常解锁：小红充 50 → 返利 5 先冻结；之后调 API 用掉 10 → 达标 | 冻结的 5 **自动释放**进阿明收益池 |
| ⑦ | 先消费后充值：小红注册后先烧注册赠送额度调了几天 API（累计消费 12），之后首次充 100 | 累计口径下已达标 → 返利 10 **直接发放，不冻结** |
| ⑧ | 自邀小号永久锁死：小号B 充 50 从不消费 | 永不达标 → 阿明**一分拿不到** |

### v2：自邀检测

| # | 场景 | 结果 |
| --- | --- | --- |
| ⑨ | IP 撞车：小号B 的注册/登录 IP 与阿明近 90 天登录 IP 重合（强信号） | 返利标记 `locked(self_invite_suspect)`，永不自动释放 + 管理员告警；站长查证后手动作废（真自邀）或放行（夫妻共用 WiFi） |
| ⑩ | 弱信号不误杀：邮箱同域且前缀相似（单个弱信号） | 不触发；弱信号需两个叠加才命中 |

### v2：封顶（单笔 20 美元 / 月度 100 美元）

| # | 场景 | 结果 |
| --- | --- | --- |
| ⑪ | 单笔封顶：土豪被邀请人充 500 → 本应返 50 | 只发 20，超出部分不记台账；B 的到账不受影响 |
| ⑫ | 月度封顶：阿明本月累计返利已 95，小红再充 100 → 本应 +10 | 这 10 作废（voided, cap）+ 管理员日志；下月 1 号重置 |

### v2：首充加成与阶梯

| # | 场景 | 结果 |
| --- | --- | --- |
| ⑬ | 首充加成 15%：小红**第一笔**充 50 → 按 15% 发 7.5（台账记 percent=15）；第二笔充 50 → 回落 10% → 5 | 首充加成只对 B 的第一笔成功充值生效 |
| ⑭ | 阶梯 0–5 人 10% / 6–20 人 12% / 21+ 人 15%：阿明已邀请 7 人 | 名下新返利按 12% 算；升档后按新档，**已发的不追溯** |
| ⑮ | 首充 × 阶梯取大：阿明 12% 档，小红首充 | 12% vs 首充 15% 取大者 15%；先取比例 → 算金额 → 最后截封顶 |

### v2：退款回收

| # | 场景 | 结果 |
| --- | --- | --- |
| ⑯ | 退款、返利还冻着：小号B 充 50 后秒退款 | 返利 5 还是 locked → 站长点"来源充值已退款" → 作废，一分没亏 |
| ⑰ | 退款、已释放未划转：小红解锁拿了 5 后退款，阿明收益池没动 | 站长点回收 → 从阿明收益池扣回 5，台账作废 |
| ⑱ | 退款、已划转花掉：阿明早把 5 划到余额花光 | 收益池扣到 0，差额记**欠账**（只记账不动余额），站长人工决定追不追 |

所有场景共用同一条铁律：**B 的充值本身永远不受任何返利环节影响**（④⑧⑪⑫⑯ 都能看出来）。

## v1：已实现的行为

实现提交：`37d95e659`（feat: 邀请充值返利，被邀请人充值到账按比例返利给邀请人）。

### 功能概述

被邀请人 B 的充值到账时，按整数百分比把 B 的到账额度折算成返利发给邀请人 A，进入 A 的邀请收益（`aff_quota` / `aff_history`），沿用"邀请收益手动划转"模式，不自动进余额。

### 配置

| 配置项 | 位置 | 默认 | 说明 |
| --- | --- | --- | --- |
| `InviterRebatePercent` | 管理端"额度设置"（`InviterRebatePercent` 数字输入） | 0 | 整数百分比 0–100；0 = 功能整体关闭 |

写入校验：范围 0–100（越界拒绝保存）；正值保存需通过支付合规确认门（与 `QuotaForInviter`/`QuotaForInvitee` 同一门控 `IsPaymentComplianceConfirmed`）。

### 触发范围

| 充值路径 | 触发 | 挂接位置 |
| --- | --- | --- |
| 易支付 | ✅ | `RechargeEpay`（`model/topup.go`） |
| Stripe | ✅ | `Recharge`（`model/topup.go`） |
| Creem | ✅ | `RechargeCreem`（`model/topup.go`） |
| Waffo | ✅ | `RechargeWaffo`（`model/topup.go`） |
| Waffo Pancake | ✅ | `RechargeWaffoPancake`（`model/topup.go`） |
| 兑换码 | ✅ | `Redeem`（`model/redemption.go`） |
| 人工补单（`ManualCompleteTopUp`） | ❌ | — |
| 订阅购买 | ❌ | — |

### 充值到账流程（含返利）

```mermaid
flowchart TD
    A["支付回调 / 兑换码提交"] --> B["开启事务"]
    B --> C["B 的订单 pending → success<br/>(幂等状态机, 只完成一次)"]
    C --> D["creditTopUpQuota:<br/>B 的 quota / used_quota 到账"]
    D --> E["creditInviterRebateTx"]
    E --> F{"短路检查"}
    F -- "比例关闭 / 合规未确认<br/>B 无 inviter_id" --> Z1["返利 0, 事务照常"]
    F -- "通过" --> G["计算 rebate = 到账额度 × 比例%<br/>(int64 防溢出, 向下取整)"]
    G -- "rebate 不足 1" --> Z1
    G -- "rebate 达到 1" --> H["A 的 aff_quota / aff_history<br/>原子自增 (gorm.Expr)"]
    H -- "更新成功" --> I["提交事务"]
    H -- "DB 错误" --> J["记 SysError + 管理员侧日志<br/>返利按 0 处理"]
    J --> I
    I --> K{"返利结果"}
    K -- "发放成功" --> L["给 A 记 System 日志:<br/>被邀请人充值返利 {{quota}}"]
    K -- "应发未发" --> M["user_id=0 记 System 日志:<br/>需人工核对补发 (仅管理员可见)"]
    Z1 --> I
```

关键不变式：**返利失败绝不回滚 B 的充值**——返利只是充值的附加收益，事务始终照常提交。

### 边界行为

| 场景 | 行为 |
| --- | --- |
| `InviterRebatePercent = 0` | 整个功能静默关闭，零开销 |
| 支付合规未确认 | 不发放返利（与正向奖励同一门控） |
| B 的 `inviter_id = 0`（自然注册） | 无返利，充值正常 |
| 返利向下取整后 < 1 | 不发放（零头不记台账、不进 `aff_quota`） |
| A 已被硬删除（`RowsAffected = 0`） | 视为无返利，不报错，不影响充值 |
| A 已被软删除 | 返利照发（行仍存在；与 v1 范围一致） |
| 重复支付回调 / 重复兑换 | 订单状态机保证只完成一次，返利只发一次 |
| 查询 B 的邀请人失败（DB 异常） | 仅记服务器控制台日志，返利 0，充值照常提交 |

### 日志与可见性

| 日志 | 归属 | B 能否看到 | A 能否看到 | 管理员能否看到 |
| --- | --- | --- | --- | --- |
| B 的充值成功日志（`RecordTopupLog`，原有） | B | ✅ | ❌ | ✅ |
| 返利成功日志"被邀请人充值返利 {{quota}}" | A（`LogTypeSystem`） | ❌ | ✅ | ✅ |
| 返利发放失败日志（含应发金额、双方 ID） | `user_id=0`（`LogTypeSystem`） | ❌ | ❌ | ✅（`/api/log/` 挂 AdminAuth） |
| 数据库错误详情 | 服务器控制台（`common.SysError`） | ❌ | ❌ | 运维侧 |

失败日志走 `user_id=0` 归属的原因：用户侧日志接口 `/api/log/self` 只按 `user_id` 过滤、不区分日志类型，任何归属到具体用户的日志都会被本人看到；失败细节（应发金额、双方账号）不应暴露给 A 或 B，因此记在系统名下，只出现在管理员的全量日志查询里。

### 失败语义（关键设计）

返利 DB 失败**绝不回滚 B 的充值**：

- 查询/更新失败时记 `common.SysError` 系统错误日志（含双方 ID 与应发金额），函数返回 0，事务照常提交
- 更新失败时额外在 logs 表 `user_id=0`（系统归属）名下写一条 `LogTypeSystem` 记录——`/api/log/` 全量日志挂 AdminAuth，A/B 的 `/api/log/self` 按 user_id 过滤查不到，因此**仅管理员可见**，内容含应发额度与双方 ID，供人工核对补发
- 由于充值照常提交、幂等状态机不会重放，失败返利不会自动补发，需人工处理
- 查询邀请人失败的分支只记服务器控制台日志（数据库本身异常时日志表写入大概率同样失败）

### 实现说明

- 核心函数 `creditInviterRebateTx`（`model/user.go`），在充值事务内、`creditTopUpQuota` 成功之后调用；全部决策（短路、计算、落账、失败降级）收口在这一个函数，6 处挂接点只负责传参与事务后记日志
- 返利计算 `int(int64(creditedQuota) * int64(InviterRebatePercent) / 100)`：int64 中间量防溢出，整数除法天然向下取整
- 落账用 `gorm.Expr("aff_quota + ?")` 原子自增，与 `inviteUser` 同模式，方言无关；**不改 `aff_count`**（其语义是"邀请人数"）
- 无数据库 schema 变更（复用 `users.aff_quota` / `aff_history` / `inviter_id`），无需迁移
- 测试见 `model/coverage_test.go`（7 个用例：易支付发放、比例关闭、合规门、兑换码、无邀请人、失败不阻断充值、失败日志仅管理员可见——最后一个用 GORM callback 注入 UPDATE 错误验证降级路径）

## 2.0 规划：风控 → 激励 → 运营

### 架构基座：返利明细台账

v1 的返利是无明细的原子自增，冻结、释放、封顶统计、回收、排行、看板都无从谈起。三期共同的地基是一张台账表：

新表 `inviter_rebates`（GORM AutoMigrate）：

| 字段 | 说明 |
| --- | --- |
| `id` / `created_at` | |
| `inviter_id` / `invitee_id` | 双索引 |
| `source_type` / `source_id` | topup / redemption，幂等去重键 |
| `base_quota` / `percent` / `quota` | 当时基数、比例、返利额（比例入账留档，改配置不追溯） |
| `status` | `locked` / `released` / `voided` |
| `locked_reason` | `self_invite_suspect` / `awaiting_consume` / 空 |
| `released_at` / `voided_reason` | |

状态机：

```mermaid
flowchart TD
    A["B 充值到账, 返利计算"] --> B{"自邀嫌疑?"}
    B -- "是" --> L1["locked (self_invite_suspect)<br/>永不自动释放, 管理员告警"]
    B -- "否" --> C{"消费解锁开启?"}
    C -- "否" --> R["released: aff_quota 自增"]
    C -- "是" --> L2["locked (awaiting_consume)"]
    L2 -- "B 累计消费达到门槛" --> R
    R --> V["voided: 退款回收 (P3, 手动触发)"]
    L1 --> V
    L2 -- "长期未达标(可配过期)" --> V

    classDef released fill:#c8e6c9,stroke:#388e3c,color:#333
    classDef locked fill:#fff9c4,stroke:#fbc02d,color:#333
    classDef voided fill:#ffcdd2,stroke:#d32f2f,color:#333
    class R released
    class L1,L2 locked
    class V voided
```

- `users` 表加 `aff_quota_locked` 冗余列（冻结池计数，避免高频 `SUM(ledger)`）；`aff_quota` 语义不变 = 已释放可划转
- 兼容性：存量已发返利无明细，台账从上线起从零记录，`aff_quota` 存量值不追补
- 挂接点不变（6 处 + `creditInviterRebateTx` 收口），函数内部从"直接 UPDATE users"改为"INSERT 台账 + 按状态决定是否同步 UPDATE users"

### Phase 1 风控（P0）：堵小号套利

v1 的已知漏洞：A 注册小号 B 自己充值，等于拿 110% 价值（B 到账 100 + A 返利 10），B 的额度对 A 有变现渠道时闭环成立。

**1.1 封顶**

| 配置项 | 单位 | 默认 | 行为 |
| --- | --- | --- | --- |
| `InviterRebateMaxPerTopup` | USD（存 quota） | 0 = 不限 | 单笔截断，超出部分不记台账 |
| `InviterRebateMonthlyMax` | USD（存 quota） | 0 = 不限 | 自然月台账累计达标后，当月后续返利 `voided(cap)` |

命中月度封顶给管理员写 user_id=0 System 日志（复用 v1 失败日志通道）；B 的充值不受影响。

**1.2 消费解锁（核心防线）**

- 配置 `InviterRebateConsumeUnlockQuota`（原始额度整数存储，沿用 `QuotaForInviter` 模式，UI 用 formatQuota 提示换算；默认 0 = 不解锁，维持直接 released）
- 返利先进 `locked(awaiting_consume)` 冻结池（`users.aff_quota_locked`），B **累计**消费额度（`users.used_quota`）≥ 门槛后释放；充值前的消费同样计数（已拍板：累计口径）；充值到账时若 B 已达标直接 released
- 释放钩子：`used_quota` 的三个真实落库点（`DecreaseUserQuota` 只减余额、不写 used_quota，**不是**扣费收口）：`UpdateUserUsedQuota` 直写分支 / `updateUserUsedQuotaAndRequestCount` / 批量刷新 `updateUserQuotaUsedQuotaAndRequestCount`（`model/user.go`、`model/utils.go`），quota > 0 时内联触发（负值 = 退款不触发）；释放走单事务：台账行 lockForUpdate 圈定 → 邀请人行锁定 → 行翻 released + 邀请人入账，失败整体回滚、下次消费重试，不会重复入账
- 释放到账时给邀请人写一条聚合 System 日志（key：`Invitation rebate {{quota}} released after invitee consumption`）；锁定期间不写日志（钱还没到账）
- 锁定路径沿用"钱先落、台账后记"：`aff_quota_locked` 更新成功但台账插入失败时额度冻结在池中无法释放，只 SysError 不回滚（与 Phase 0 released 路径同口径）
- 设计依据：小号充了钱不消费，A 永远拿不到——这条本身就是最强的自邀防线
- 两个口径事实：① `inviter_id` 只在注册时通过邀请码绑定，之后无补绑入口，被邀请人必然是新注册账号；② 累计口径下 B 烧**注册赠送的免费额度**也计数——白送的钱也能凑解锁。规避：**门槛默认值设得高于注册赠送额度**（如赠送 2 美元则门槛 ≥ 10 美元），并在配置描述里注明
- 冻结池过期：配置 `InviterRebateLockExpiryDays`（默认 0 = 不过期，已拍板）；> 0 时超期未解锁的 locked 返利自动作废（需定时任务）

**1.3 自邀检测（辅助信号，降档处理）**

| 信号 | 来源 | 强度 |
| --- | --- | --- |
| 登录 IP 重合 | `user_sessions.ip`：B 的 IP 与 A 近 90 天 IP 交集 | 强 |
| 支付账号重合 | `stripe_customer` 相同 / 同一 epay 账号 | 强 |
| 邮箱相似 | 同域 + local part 高相似 | 弱（需两个弱信号叠加） |

打分制而非硬规则：判中 → `locked(self_invite_suspect)` 永不自动释放 + 管理员告警日志，人工裁 void / release。不做自动 void——误杀真实推荐的成本高于漏放。配置 `InviterRebateSelfInviteCheck`（默认开）。

### Phase 2 激励：改动小、效果直接

**2.1 首充加成**：`InviterRebateFirstTopUpPercent`（默认 0）；B 的成功充值笔数 == 1 时用首充比例，之后回落；台账 `percent` 留档。

**2.2 阶梯比例**：结构化 JSON，走 `setting/operation_setting` 现成模式（`config.GlobalConfig.Register`，同 `quota_setting.go`）：

```json
{ "tiers": [ {"min_invitees": 0, "percent": 5},
             {"min_invitees": 6, "percent": 10},
             {"min_invitees": 21, "percent": 15} ],
  "first_topup_percent": 15 }
```

按 A 的 `aff_count` 取满足 `min_invitees` 的最高档；首充比例与常规取大者生效；配置写入校验所有比例 0–100。前端设置区升级为可编辑阶梯表格。

叠加强校验：先取比例 → 算金额 → 再截断（封顶），结果永远 ≤ 100% 且 ≤ 封顶。

### Phase 3 运营：依赖台账数据

- **邀请排行榜**：管理端（`/api/inviter_rebate/rankings`，AdminAuth）按返利总额/邀请人数、月/季/年聚合（已拍板：纯管理端，不做公开版）。现有 `/rankings` 是模型维度公开榜，不混用。公开邀请人数榜（不含金额）留作后续运营可选项，随时可加
- **A 侧 dashboard**：钱包页 `affiliate-rewards-card` 扩展——冻结池/已释放/累计收益卡片、下线贡献列表（用户名脱敏 + 累计贡献 + 状态，API 天然 `WHERE inviter_id = A` 无越权）、阶梯进度条（"再邀请 2 人升到 15% 档"）
- **管理端台账页**：流水列表（筛 inviter/invitee/状态/时间）+ 汇总卡片（发放总量、冻结池、voided、自邀告警）+ 自邀告警人工处理（void / release，写审计日志）+ 来源充值退款回收（见下节）

### 退款回收（clawback）

前提事实：**充值订单没有退款代码路径**——`topups` 状态机只有 pending → success / expired，全库的 refund 都是中继计费/订阅预扣退还，不是退钱给用户。B 的真实退款发生在支付平台侧（Stripe 后台、易支付商户后台），系统内的体现只是管理员手动扣 B 的余额。因此 clawback 不能做成回调自动追扣，只能做成**台账手动回收操作**：管理员在支付平台确认退款后，在台账页对对应返利行（`source_type=topup`）点"来源充值已退款"，写审计日志。这与"人工补单不自动触发返利"是同一哲学：钱的真实变动人在回路里。

按 A 侧返利状态分三种情况回收：

| 返利状态 | 回收动作 | 说明 |
| --- | --- | --- |
| `locked` | 直接 `voided(refund)` | 钱一分没出，最干净 |
| `released` 且 A 未划转（`aff_quota` ≥ 该笔返利） | `aff_quota`/`aff_history` 扣回 + `voided(refund)` | 等同撤销该笔返利 |
| `released` 且 A 已划转/余额不足 | `aff_quota` 扣到 0，差额记**欠账**（`voided(refund, underfunded)` + 管理员日志），人工决定是否追 | **不做自动负扣余额**——动用户余额有客诉与合规风险 |

明确不做：支付平台退款 webhook 自动联动（Waffo/易支付无可靠事件源，且退款时 B 的 quota 如何处理是平台政策，不归返利模块管）；对 A 未来返利的自动抵扣（欠账只记账）。

与消费解锁的联动：P1.2 上线后，"充值→立刻退款"的返利还处于 `locked(awaiting_consume)`，直接 void 零损失。**退款风险敞口 = 已释放未划转的部分**，消费解锁顺手把退款问题挡掉一大半。v1 存量返利无台账，无法精确回收，沿用"台账从上线起从零记录"的边界。

### 实施顺序与依赖

```
P1.0 台账表 ──┬── P1.1 封顶 ──┬── P2 激励 ── P3 运营
              ├── P1.2 消费解锁 ┤
              └── P1.3 自邀检测 ┘
```

每期独立开关、可独立上线回滚；`InviterRebatePercent` 仍是总闸（0 = 整套静默）。退款回收（clawback）随 P3 管理端台账页一起做（手动回收，规则见"退款回收"一节）；webhook 自动化与欠账自动追扣明确不做。

**推迟到 v3 的观察项**：单用户比例覆盖（给特定合作方/渠道单独设比例，`users` 表加 override 列，优先级"单设 > 阶梯 > 全局"）；多级分销与返利进余额属合规红线，永不考虑。

### 合规红线

- 比例上限校验 0–100 + 支付合规门 `IsPaymentComplianceConfirmed` 沿用
- 不做多级分销（只查一层 `inviter_id`）
- 返利永远进 `aff_quota` 手动划转，不进余额

### 已拍板决策（2026-11-18）

| # | 决策 | 结论 | 关键理由 |
| --- | --- | --- | --- |
| 1 | 消费解锁门槛口径 | **累计消费**（充值前也计数，含免费额度烧掉的部分） | 实现零成本；门槛默认值设高于注册赠送额度即可堵住白烧漏洞；注意被邀请人必然是新注册账号（`inviter_id` 只在注册时绑定） |
| 2 | 自邀命中后处理 | **永久 locked + 管理员人工裁** | 误杀可挽回（放行即可），漏放有封顶兜底，成本不对称 |
| 3 | 冻结池过期 | **可配置**：`InviterRebateLockExpiryDays`，默认 0 = 不过期 | 先不过期跑，台账堆积再收紧，两头不堵死 |
| 4 | 排行榜公开版 | **不做，纯管理端** | 公开人数榜留作后续运营可选项；公开金额榜因隐私/合规永不考虑 |
