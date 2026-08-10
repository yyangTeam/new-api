# 测试覆盖率提升任务 — 续接提示词

## 项目信息
- 仓库：`/home/admin/workspace/code/NewApi/new-api`
- 分支：`dev`（已推送至 origin）
- Go 后端 + React 19 前端（`web/`），包管理器 bun

## 目标
把四个方向的测试覆盖率逐步提升到 99%：
1. 后端（Go）
2. 前端（React/TS）
3. E2E 测试
4. CI 门禁

## 当前进度（已提交并推送）

### 后端
- 集成测试：`model/testdb_test.go`（SQLite in-memory 助手）、`model/integration_test.go`、`controller/integration_test.go`
- DTO 测试：`dto/dto_test.go`
- 适配器测试：`relay/channel/deepseek/adaptor_test.go`、`relay/channel/coze/adaptor_test.go`
- rerank：`relay/common_handler/rerank_test.go`
- types：`types/types_test.go`、`relaykit/types/types_test.go`
- **CI 阈值**：`backend-tests.yml` 设为 15%（保守）

### 前端（当前覆盖率约 37%）
- 545 个测试文件，6900+ 条用例
- 已覆盖：所有 hooks、lib、stores、UI 组件库（components/ui 全覆盖）、各 feature 模块的 API/hooks/lib
- **CI 阈值**：`vitest.config.ts` 设为 lines 35% / functions 30% / branches 30%

### E2E
- Playwright 配置：`web/playwright.config.ts`
- 7 个 spec：auth-flow、dashboard、token-batch-add、channel-management、user-journey、system-settings、error-pages
- CI workflow：`.github/workflows/e2e-tests.yml` + ci.yml 的 e2e job

## 待推进（缺口最大处）

### 前端 — 最大的未覆盖源文件（按行数排序）
这些是覆盖率提升 ROI 最高的文件（行数多=未覆盖代码多）：
1. `web/src/features/channels/components/drawers/channel-mutate-drawer.tsx` (4869 行)
2. `web/src/features/channels/components/dialogs/param-override-editor-dialog.tsx` (3326 行)
3. `web/src/features/system-settings/models/tiered-pricing-editor.tsx` (1878 行)
4. `web/src/features/system-settings/integrations/payment-settings-section.tsx` (1634 行)
5. `web/src/features/channels/components/dialogs/advanced-custom-editor-dialog.tsx` (1436 行)
6. `web/src/components/ai-elements/prompt-input.tsx` (1407 行)
7. `web/src/features/models/components/drawers/model-mutate-drawer.tsx` (1398 行)
8. `web/src/features/system-settings/models/group-ratio-visual-editor.tsx` (1373 行)
9. `web/src/features/channels/components/dialogs/codex-usage-dialog.tsx` (1354 行)
10. `web/src/features/pricing/components/model-details.tsx` (1351 行)
11. `web/src/features/dashboard/lib/flow.ts` (1335 行) — 纯逻辑，ROI 高
12. `web/src/features/usage-logs/components/dialogs/details-dialog.tsx` (1201 行)
13. `web/src/features/channels/components/channels-columns.tsx` (1189 行)
14. `web/src/features/dashboard/lib/charts.ts` (954 行) — 纯逻辑
15. `web/src/features/channels/lib/channel-form.ts` (935 行) — 纯逻辑
16. `web/src/features/channels/lib/advanced-custom.ts` (879 行) — 纯逻辑

### 后端 — 无测试的包（41 个）
优先级高：
- `relay/channel/` 下 18 个 provider（baidu_v2, cloudflare, vertex, kling, suno, dify, jina, mistral, openrouter, perplexity, replicate, siliconflow, xunfei, zhipu_4v 等）
- `relaykit/relayconvert/internal/` 6 个子包（claude_messages, gemini_chat, media, jsonutil 等）

## 续接方法

在新会话中粘贴以下提示词：

---

```
继续推进 /home/admin/workspace/code/NewApi/new-api 项目的测试覆盖率提升任务，目标是把四个方向（后端 Go、前端 React/TS、E2E、CI 门禁）逐步提升到 99%。

当前状态（已提交推送至 dev 分支）：
- 前端覆盖率约 37%（CI 阈值设为 35%，不阻塞合并）
- 后端有集成测试 + DTO + 适配器测试，CI 阈值 15%
- E2E 有 7 个 Playwright spec
- 545 个前端测试文件，6900+ 用例

请按以下优先级继续：
1. 前端：优先攻克最大的未覆盖源文件，从纯逻辑 lib 文件开始（ROI 最高）：
   - web/src/features/dashboard/lib/flow.ts (1335 行)
   - web/src/features/dashboard/lib/charts.ts (954 行)
   - web/src/features/channels/lib/channel-form.ts (935 行)
   - web/src/features/channels/lib/advanced-custom.ts (879 行)
   然后是大组件：channel-mutate-drawer.tsx (4869 行)、param-override-editor-dialog.tsx (3326 行)、tiered-pricing-editor.tsx (1878 行) 等
2. 后端：补 relay/channel 下未测试的 provider 适配器（baidu_v2, vertex, kling, suno 等）和 relaykit/relayconvert/internal 子包
3. 每完成一批用子 agent 并行（用 Agent 工具，每个 agent 负责 2-4 个文件），写完先跑测试验证通过再提交
4. 验证命令：前端 `cd web && bun vitest run --coverage`，后端 `GOWORK=off go test ./...`（需先确认 go 已安装）

测试约定（必须遵守）：
- 前端：vitest + happy-dom，用 `@/` 别名，mock react-i18next 用 `vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }) }))`
- 前端组件测试：import 真实组件渲染（不要 mock 被测组件本身），只 mock API/store/router
- 后端：用 testify 的 require（fatal）+ assert（值检查），JSON 操作走 common.Marshal/Unmarshal（dto/types 包测试可例外用 encoding/json）
- 覆盖率优先覆盖真实代码执行路径，不要过度 mock 导致源码未执行
- 阈值策略：先保守不阻塞，覆盖率提升后再逐步调高 vitest.config.ts 和 backend-tests.yml 的 THRESHOLD

请先读项目 CLAUDE.md / AGENTS.md 了解测试质量规则，然后开始补 dashboard/lib/flow.ts 的测试。
```

---

## 关键注意事项
1. **子 agent 配额**：上一轮 4 个 agent 因 API 配额耗尽（402 错误）失败。新会话配额会重置，可正常用 Agent 工具并行。
2. **测试质量**：项目 AGENTS.md 规定测试必须保护真实行为/契约，禁止只刷覆盖率的"伪测试"。补测试时写有意义的断言。
3. **被保护的标识**：new-api 和 QuantumNous 的品牌/版权信息不可修改删除。
4. **routeTree.gen.ts**：已加入 .gitignore 不再跟踪（自动生成文件）。
