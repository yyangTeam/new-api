---
name: e2e-integration
description: Use when the user wants to run full-stack E2E integration tests, verify a feature works end-to-end in a real browser, generate a test report with screenshots, or validate the app after code changes. Triggers on keywords like "e2e", "集成测试", "端到端测试", "playwright", "测试报告", "run integration tests".
---

# 全栈 E2E 集成测试

一键编译部署后端+前端，在真实 Chromium 浏览器中运行 84 个集成测试，生成带截图的 HTML 报告并提供公网访问链接。

## 执行步骤

```bash
# 1. 进入前端目录运行测试（自动编译后端+前端、启动服务、执行测试、清理）
cd /home/admin/workspace/code/NewApi/new-api/web && bun run e2e:integration

# 2. 启动报告服务器
cd /home/admin/workspace/code/NewApi/new-api/web/integration-report && python3 -m http.server 9323 &

# 3. 获取公网链接
curl -s "http://localhost:58596/api/port-mapping?port=9323" | python3 -c "import sys,json;print(json.load(sys.stdin)['url'])"
```

## 运行选项

| 命令 | 用途 |
|------|------|
| `bun run e2e:integration` | 运行全部 84 个测试 |
| `bun run e2e:integration -- --grep "渠道"` | 只运行渠道相关测试 |
| `bun run e2e:integration -- --grep "登录"` | 只运行登录相关测试 |
| `bun run e2e:integration:report` | 本地打开 HTML 报告 |

## 测试覆盖范围

| 模块 | 中文名 | 测试内容 |
|------|--------|---------|
| 01 | 初始化与登录 | 首页、登录、会话 |
| 02 | 渠道管理 | CRUD、列表验证 |
| 03 | Token 管理 | 创建、额度、删除 |
| 04 | 用户管理 | 创建、列表、角色 |
| 05 | 计费与日志 | 日志页、钱包页 |
| 06 | 系统设置 | 站点/运维/安全设置 |
| 07 | 仪表盘 | Dashboard、Profile、模型 |
| 08 | 渠道 UI 操作 | 状态切换、删除验证 |
| 09 | Token UI 操作 | 自定义/无限额度 |
| 10 | 用户管理员操作 | 额度/禁用/角色 |
| 11 | 兑换码管理 | 创建/批量/删除 |
| 12 | 订阅计划 | 创建/状态切换 |
| 13 | 模型管理 | 元数据 CRUD |
| 14 | 个人资料与安全 | 用户信息/会话 |
| 15 | 用量日志与筛选 | 筛选/统计 API |
| 16 | 钱包操作 | 兑换码充值 |
| 17 | 系统设置表单 | 注册开关/计费/页脚 |
| 18 | Playground | 页面加载/无 JS 错误 |
| 19 | 导航与搜索 | 侧边栏/搜索/分页 |
| 20 | 登出与会话 | 认证/登出/稳定性 |

## 架构

```
globalSetup:
  bun run build → go build → start binary (port 14000, SQLite) → POST /api/setup → login → save auth

Playwright runner → 84 tests sequential (workers:1)

globalTeardown:
  kill binary → rm temp DB
```

## 关键文件

```
web/playwright.integration.config.ts     — Playwright 配置
web/e2e-integration/
  global-setup.ts                        — 编译+启动+初始化
  global-teardown.ts                     — 停止+清理
  fixtures.ts                            — apiClient fixture
  helpers/server-manager.ts              — 服务生命周期
  helpers/api-client.ts                  — HTTP 测试客户端
  specs/01-20*.spec.ts                   — 测试用例
web/integration-report/                  — HTML 报告输出
```

## 故障排查

| 问题 | 解决 |
|------|------|
| 端口 14000 被占用 | `lsof -i :14000` 然后 kill |
| Go 编译失败 | 确认 `~/.local/go/bin/go` 存在 |
| 浏览器未安装 | `cd web && bunx playwright install chromium` |
| 报告服务器端口冲突 | `pkill -f "http.server 9323"` |
