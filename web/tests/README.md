# New API 测试体系

## 概述

本测试体系覆盖 New API 的核心功能，采用 Playwright 无头浏览器进行端到端测试，**不修改任何源代码**。

## 测试套件

| 套件 | 文件 | 测试数 | 覆盖范围 |
|------|------|--------|----------|
| API 接口契约测试 | `tests/api/api-contract-test.mjs` | 75 | 全部 API 端点的请求/响应契约验证 |
| 安全测试 | `tests/security/security-test.mjs` | 34 | 认证、权限、输入验证、注入防护 |
| E2E 页面流程测试 | `tests/e2e/page-flow-test.mjs` | 43 | 全部前端页面导航和 UI 交互 |
| Dev 功能测试 | `dev-feature-test.mjs` | 48 | 批量令牌操作、生图设置、主题 |
| 基础 E2E 测试 | `e2e-test.mjs` | 12 | 基本页面加载和登录流程 |
| **合计** | | **212** | |

## 快速开始

### 前置条件

1. **Node.js** >= 18 + **Playwright** 已安装
2. **服务器** 编译并运行在 `localhost:13000`
3. **测试用户** `qqqqqqq1` / `test123456`（root 权限）

### 启动测试服务器

```bash
cd /path/to/new-api

# 编译
go build -o new-api .

# 启动（提高速率限制避免测试被 429）
CRITICAL_RATE_LIMIT=10000 \
GLOBAL_WEB_RATE_LIMIT=10000 \
GLOBAL_API_RATE_LIMIT=10000 \
./new-api --port 13000
```

### 运行全部测试

```bash
cd web
bash tests/run-all.sh
```

### 运行单个套件

```bash
cd web
node tests/api/api-contract-test.mjs        # API 契约测试
node tests/security/security-test.mjs        # 安全测试
node tests/e2e/page-flow-test.mjs            # E2E 页面测试
node dev-feature-test.mjs                    # Dev 功能测试
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TEST_BASE_URL` | `http://localhost:13000` | 服务器地址 |
| `TEST_SCREENSHOT_DIR` | `/home/admin/tmp_file` | 截图保存目录 |
| `TEST_USER` | `qqqqqqq1` | 测试用户名 |
| `TEST_PASS` | `test123456` | 测试密码 |

## 测试详情

### 1. API 接口契约测试 (75 个测试)

验证所有 API 端点的请求/响应格式是否符合预期。

| 分类 | 测试数 | 覆盖内容 |
|------|--------|----------|
| 公开接口 | 10 | `/api/status`, `/api/setup`, `/api/notice`, `/api/about` 等 |
| 用户管理 | 11 | 自身信息、分组、模型、2FA、签到、Passkey、充值、OAuth |
| 令牌管理 | 10 | 单个/批量创建、更新、搜索、获取密钥、删除 |
| 管理员 API | 21 | 用户/渠道/日志/兑换码/分组/供应商/模型/任务管理 |
| Root API | 8 | 系统选项、性能统计、系统任务/实例、亲和性缓存 |
| 订阅 API | 3 | 计划列表、个人订阅、管理员计划 |
| 模型 API | 2 | v1 模型列表 |
| 数据分析 | 4 | 流量数据、用户数据、亲和性使用 |
| Billing API | 6 | Token 认证的 billing/subscription/usage 端点 |

### 2. 安全测试 (34 个测试)

| 分类 | 测试数 | 覆盖内容 |
|------|--------|----------|
| 未认证访问控制 | 14 | 所有保护端点 GET/POST/PUT/DELETE 无认证返回 401/403 |
| 权限边界 | 3 | 访问/删除/修改不存在资源 |
| 输入验证 | 8 | XSS、SQL 注入、超长输入、负数、无效 JSON、模板注入 |
| CORS | 1 | OPTIONS 预检请求 |
| HTTP 方法 | 2 | 不允许的 HTTP 方法 |
| Session 管理 | 2 | 登出使会话失效、重新登录 |
| 路径安全 | 3 | 路径遍历、双重编码、null 字节注入 |

### 3. E2E 页面流程测试 (43 个测试)

| 分类 | 测试数 | 覆盖内容 |
|------|--------|----------|
| 控制台页面导航 | 14 | 所有 14 个控制台页面的加载和渲染 |
| 公开页面 | 4 | 首页、登录、定价、关于 |
| 侧边栏导航 | 2 | 导航项存在性和点击跳转 |
| 设置页面标签 | 2 | 13 个设置标签页的加载和切换 |
| 令牌管理 UI | 5 | 页面加载、添加/批量添加按钮、表格数据、分页 |
| 渠道管理 UI | 3 | 页面加载、添加按钮、搜索框 |
| 用户管理 UI | 2 | 页面加载、用户表格 |
| 日志页面 | 1 | 页面加载 |
| 个人设置 | 2 | 页面加载、表单元素 |
| Dashboard | 2 | JS 错误检测、内容渲染 |
| 钱包页面 | 1 | 页面加载 |
| 响应式布局 | 3 | 手机(375px)、平板(768px)、恢复 |
| 主题 | 1 | 当前主题验证 |
| 404 页面 | 1 | 不存在页面处理 |

### 4. Dev 功能测试 (48 个测试)

| 分类 | 测试数 | 覆盖内容 |
|------|--------|----------|
| 批量创建令牌 API | 13 | 各种参数组合 + 6 个验证边界 |
| 批量编辑令牌 API | 11 | 字段更新 + 边界检查 |
| 批量获取密钥 API | 3 | 成功获取 + 边界检查 |
| 批量删除令牌 API | 2 | 拒绝空 + 正常删除 |
| 批量创建 UI | 3 | 打开对话框、填写提交、列表验证 |
| 批量编辑 UI | 3 | 未选择提示、选中打开、关闭 |
| 生图设置 | 8 | 嵌入/新标签模式、侧边栏显隐 |
| 主题设置 | 2 | API 和 UI |
| Dashboard + 清理 | 3 | 渲染检查 + 数据清理 |

## 测试架构

```
web/tests/
├── test-utils.mjs          # 共用测试框架（登录、断言、API 封装）
├── run-all.sh              # 统一测试运行器
├── api/
│   └── api-contract-test.mjs   # API 接口契约测试
├── e2e/
│   └── page-flow-test.mjs      # E2E 页面流程测试
└── security/
    └── security-test.mjs        # 安全测试

web/
├── e2e-test.mjs            # 基础 E2E 测试
└── dev-feature-test.mjs    # Dev 功能测试
```

### 测试框架

- **TestRunner** — 统一测试运行器类，提供 `setup()`, `test()`, `section()`, `teardown()`, `report()`
- **api** — 封装 `page.request.*`，自动附带 `New-Api-User: 1` header
- **assert 系列** — `assert()`, `assertEq()`, `assertMatch()`, `assertApiSuccess()`, `assertApiError()`, `assertStatus()`
- **截图** — 每个测试可截图保存到指定目录

## 注意事项

### 速率限制

服务器有多层速率限制，测试时需提高：

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `CRITICAL_RATE_LIMIT` | 20 | 关键操作（登录/批量创建）每 20 分钟限制 |
| `GLOBAL_WEB_RATE_LIMIT` | 120 | Web 请求每 180 秒限制 |
| `GLOBAL_API_RATE_LIMIT` | 360 | API 请求每 180 秒限制 |

### 数据安全

- 所有测试创建的数据均以 `api-test-*` 或 `e2e-*` 为前缀
- 测试结束时自动清理创建的数据
- 系统设置修改后自动恢复原值
- 不会删除或修改已有的业务数据

### 扩展测试

在 `tests/` 目录下创建新的 `.mjs` 文件，导入 `test-utils.mjs` 的工具类：

```javascript
import { TestRunner, BASE, assert, assertEq, assertApiSuccess } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('我的测试套件')
  await t.setup({ login: true })

  await t.section('分类名', async () => {
    await t.test('test_name', async () => {
      const resp = await t.api.get(`${BASE}/api/xxx`)
      assertEq(resp.status(), 200, '描述')
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
```
