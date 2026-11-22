import { TestRunner, BASE, assert, assertEq, assertApiSuccess, assertApiError, assertStatus } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('API 接口契约测试')
  await t.setup({ login: true })
  const { api, page } = t

  // ================================================================
  //  1. 公开接口（无需认证）
  // ================================================================
  await t.section('1. 公开接口', async () => {
    await t.test('public:status', async () => {
      const resp = await page.request.get(`${BASE}/api/status`)
      const body = await resp.json()
      assert(body.success === true, `status API 返回失败: ${body.message}`)
      assert(typeof body.data === 'object', 'data 不是对象')
      assert(typeof body.data.version === 'string', '缺少 version 字段')
      assert(typeof body.data.system_name === 'string', '缺少 system_name 字段')
      assert(typeof body.data.theme === 'string', '缺少 theme 字段')
      assert(typeof body.data.setup === 'boolean', '缺少 setup 字段')
      assert(typeof body.data.start_time === 'number', '缺少 start_time 字段')
      assert(typeof body.data.password_login_enabled === 'boolean', '缺少 password_login_enabled')
      assert(typeof body.data.register_enabled === 'boolean', '缺少 register_enabled')
    })

    await t.test('public:status:fields_complete', async () => {
      const resp = await page.request.get(`${BASE}/api/status`)
      const body = await resp.json()
      const required = [
        'version', 'system_name', 'theme', 'setup', 'start_time',
        'password_login_enabled', 'register_enabled', 'email_verification',
        'turnstile_check', 'display_in_currency', 'enable_drawing',
        'enable_task', 'enable_data_export',
      ]
      for (const key of required) {
        assert(key in body.data, `缺少字段: ${key}`)
      }
    })

    await t.test('public:setup', async () => {
      const resp = await page.request.get(`${BASE}/api/setup`)
      const body = await resp.json()
      assert(body.success === true, `setup API 失败`)
      assert(body.data.status === true, '系统应已初始化')
    })

    await t.test('public:notice', async () => {
      const resp = await page.request.get(`${BASE}/api/notice`)
      assertEq(resp.status(), 200, 'notice 应返回 200')
    })

    await t.test('public:about', async () => {
      const resp = await page.request.get(`${BASE}/api/about`)
      assertEq(resp.status(), 200, 'about 应返回 200')
    })

    await t.test('public:home_page_content', async () => {
      const resp = await page.request.get(`${BASE}/api/home_page_content`)
      assertEq(resp.status(), 200, 'home_page_content 应返回 200')
    })

    await t.test('public:user_agreement', async () => {
      const resp = await page.request.get(`${BASE}/api/user-agreement`)
      assertEq(resp.status(), 200, 'user-agreement 应返回 200')
    })

    await t.test('public:privacy_policy', async () => {
      const resp = await page.request.get(`${BASE}/api/privacy-policy`)
      assertEq(resp.status(), 200, 'privacy-policy 应返回 200')
    })

    await t.test('public:uptime_status', async () => {
      const resp = await page.request.get(`${BASE}/api/uptime/status`)
      assertEq(resp.status(), 200, 'uptime/status 应返回 200')
    })

    await t.test('public:user_groups', async () => {
      const resp = await page.request.get(`${BASE}/api/user/groups`)
      assertEq(resp.status(), 200, 'user/groups 应返回 200')
    })
  })

  // ================================================================
  //  2. 用户管理 API
  // ================================================================
  await t.section('2. 用户管理', async () => {
    await t.test('user:self', async () => {
      const resp = await api.get(`${BASE}/api/user/self`)
      const body = await assertApiSuccess(resp, '获取自身信息')
      assert(typeof body.data.id === 'number', '缺少 id')
      assert(typeof body.data.username === 'string', '缺少 username')
      assert(typeof body.data.role === 'number', '缺少 role')
      assert(typeof body.data.status === 'number', '缺少 status')
      assert(typeof body.data.quota === 'number', '缺少 quota')
    })

    await t.test('user:self:no_sensitive_fields', async () => {
      const resp = await api.get(`${BASE}/api/user/self`)
      const body = await resp.json()
      assert(!body.data.password, '不应返回密码字段')
    })

    await t.test('user:self_groups', async () => {
      const resp = await api.get(`${BASE}/api/user/self/groups`)
      const body = await assertApiSuccess(resp, '获取用户分组')
      assert(typeof body.data === 'object', 'data 应为对象(分组映射)')
    })

    await t.test('user:models', async () => {
      const resp = await api.get(`${BASE}/api/user/models`)
      const body = await resp.json()
      assertEq(resp.status(), 200, '获取用户模型列表')
    })

    await t.test('user:2fa_status', async () => {
      const resp = await api.get(`${BASE}/api/user/2fa/status`)
      assertEq(resp.status(), 200, '获取 2FA 状态')
    })

    await t.test('user:checkin_status', async () => {
      const resp = await api.get(`${BASE}/api/user/checkin`)
      assertEq(resp.status(), 200, '获取签到状态')
    })

    await t.test('user:aff_code', async () => {
      const resp = await api.get(`${BASE}/api/user/aff`)
      assertEq(resp.status(), 200, '获取邀请码')
    })

    await t.test('user:passkey_status', async () => {
      const resp = await api.get(`${BASE}/api/user/passkey`)
      assertEq(resp.status(), 200, '获取 passkey 状态')
    })

    await t.test('user:oauth_bindings', async () => {
      const resp = await api.get(`${BASE}/api/user/self/oauth/bindings`)
      const body = await resp.json()
      assertEq(resp.status(), 200, '获取 OAuth 绑定')
    })

    await t.test('user:topup_info', async () => {
      const resp = await api.get(`${BASE}/api/user/topup/info`)
      assertEq(resp.status(), 200, '获取充值信息')
    })

    await t.test('user:topup_history', async () => {
      const resp = await api.get(`${BASE}/api/user/topup/self`)
      assertEq(resp.status(), 200, '获取充值历史')
    })
  })

  // ================================================================
  //  3. 令牌管理 API
  // ================================================================
  await t.section('3. 令牌管理', async () => {
    let createdTokenId = null

    await t.test('token:create', async () => {
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: 'api-test-single', expired_time: -1, unlimited_quota: true }
      })
      await assertApiSuccess(resp, '创建令牌')
    })

    await t.test('token:list', async () => {
      const resp = await api.get(`${BASE}/api/token/?p=0&size=10`)
      const body = await assertApiSuccess(resp, '列出令牌')
      assert(body.data.items, '缺少 items 字段')
      assert(typeof body.data.total === 'number', '缺少 total 字段')
      assert(typeof body.data.page === 'number', '缺少 page 字段')
      const token = body.data.items.find(t => t.name === 'api-test-single')
      assert(token, '找不到创建的令牌')
      createdTokenId = token.id
    })

    await t.test('token:get_by_id', async () => {
      assert(createdTokenId, '需要先创建令牌')
      const resp = await api.get(`${BASE}/api/token/${createdTokenId}`)
      const body = await assertApiSuccess(resp, '获取令牌详情')
      assertEq(body.data.name, 'api-test-single', '令牌名称不匹配')
    })

    await t.test('token:update', async () => {
      assert(createdTokenId, '需要先创建令牌')
      const resp = await api.put(`${BASE}/api/token/`, {
        data: { id: createdTokenId, name: 'api-test-renamed', unlimited_quota: false, remain_quota: 100000 }
      })
      const body = await assertApiSuccess(resp, '更新令牌')
      const getResp = await api.get(`${BASE}/api/token/${createdTokenId}`)
      const getBody = await getResp.json()
      assertEq(getBody.data.name, 'api-test-renamed', '更新名称未生效')
    })

    await t.test('token:search', async () => {
      const resp = await api.get(`${BASE}/api/token/search?keyword=api-test-renamed`)
      const body = await assertApiSuccess(resp, '搜索令牌')
      assert(body.data.items.length > 0, '搜索应返回结果')
    })

    await t.test('token:batch_create', async () => {
      const resp = await api.post(`${BASE}/api/token/batch/create`, {
        data: { names: ['api-test-b1', 'api-test-b2'], expired_time: -1, unlimited_quota: true }
      })
      const body = await assertApiSuccess(resp, '批量创建')
      assertEq(body.data.created, 2, '应创建 2 个令牌')
    })

    await t.test('token:batch_update', async () => {
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const ids = tokens.filter(t => /^api-test-b/.test(t.name)).map(t => t.id)
      assert(ids.length === 2, `应有 2 个批量令牌，实际 ${ids.length}`)
      const resp = await api.put(`${BASE}/api/token/batch`, {
        data: { ids, group: 'api-test-group' }
      })
      await assertApiSuccess(resp, '批量更新')
    })

    await t.test('token:batch_keys', async () => {
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const ids = tokens.filter(t => /^api-test-b/.test(t.name)).map(t => t.id)
      const resp = await api.post(`${BASE}/api/token/batch/keys`, { data: { ids } })
      const body = await assertApiSuccess(resp, '批量获取密钥')
      assert(body.data.keys, '缺少 keys 字段')
      assertEq(Object.keys(body.data.keys).length, 2, '应返回 2 个密钥')
    })

    await t.test('token:batch_delete', async () => {
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const ids = tokens.filter(t => /^api-test-/.test(t.name)).map(t => t.id)
      assert(ids.length >= 3, `应有 >=3 个测试令牌，实际 ${ids.length}`)
      const resp = await api.post(`${BASE}/api/token/batch`, { data: { ids } })
      await assertApiSuccess(resp, '批量删除')
    })

    await t.test('token:verify_cleanup', async () => {
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const remaining = tokens.filter(t => /^api-test-/.test(t.name))
      assertEq(remaining.length, 0, '所有测试令牌应已删除')
    })
  })

  // ================================================================
  //  4. 管理员 API
  // ================================================================
  await t.section('4. 管理员 API', async () => {
    await t.test('admin:user_list', async () => {
      const resp = await api.get(`${BASE}/api/user/?p=0&size=10`)
      const body = await resp.json()
      assertEq(resp.status(), 200, '获取用户列表')
      assert(body.data, '缺少 data 字段')
    })

    await t.test('admin:user_search', async () => {
      const resp = await api.get(`${BASE}/api/user/search?keyword=qqqqqqq1`)
      assertEq(resp.status(), 200, '搜索用户')
    })

    await t.test('admin:channel_list', async () => {
      const resp = await api.get(`${BASE}/api/channel/?p=0&size=10`)
      assertEq(resp.status(), 200, '获取渠道列表')
    })

    await t.test('admin:channel_search', async () => {
      const resp = await api.get(`${BASE}/api/channel/search?keyword=test`)
      assertEq(resp.status(), 200, '搜索渠道')
    })

    await t.test('admin:channel_models', async () => {
      const resp = await api.get(`${BASE}/api/channel/models`)
      assertEq(resp.status(), 200, '获取渠道模型列表')
    })

    await t.test('admin:channel_models_enabled', async () => {
      const resp = await api.get(`${BASE}/api/channel/models_enabled`)
      assertEq(resp.status(), 200, '获取已启用模型列表')
    })

    await t.test('admin:log_list', async () => {
      const resp = await api.get(`${BASE}/api/log/?p=0&size=10`)
      assertEq(resp.status(), 200, '获取日志列表')
    })

    await t.test('admin:log_stat', async () => {
      const resp = await api.get(`${BASE}/api/log/stat`)
      assertEq(resp.status(), 200, '获取日志统计')
    })

    await t.test('admin:log_self', async () => {
      const resp = await api.get(`${BASE}/api/log/self?p=0&size=10`)
      assertEq(resp.status(), 200, '获取个人日志')
    })

    await t.test('admin:log_self_stat', async () => {
      const resp = await api.get(`${BASE}/api/log/self/stat`)
      assertEq(resp.status(), 200, '获取个人日志统计')
    })

    await t.test('admin:redemption_list', async () => {
      const resp = await api.get(`${BASE}/api/redemption/?p=0&size=10`)
      assertEq(resp.status(), 200, '获取兑换码列表')
    })

    await t.test('admin:group_list', async () => {
      const resp = await api.get(`${BASE}/api/group/`)
      assertEq(resp.status(), 200, '获取分组列表')
    })

    await t.test('admin:data_quota', async () => {
      const resp = await api.get(`${BASE}/api/data/`)
      assertEq(resp.status(), 200, '获取配额数据')
    })

    await t.test('admin:data_self', async () => {
      const resp = await api.get(`${BASE}/api/data/self`)
      assertEq(resp.status(), 200, '获取个人配额数据')
    })

    await t.test('admin:vendor_list', async () => {
      const resp = await api.get(`${BASE}/api/vendors/`)
      assertEq(resp.status(), 200, '获取供应商列表')
    })

    await t.test('admin:models_meta', async () => {
      const resp = await api.get(`${BASE}/api/models/`)
      assertEq(resp.status(), 200, '获取模型元数据列表')
    })

    await t.test('admin:prefill_groups', async () => {
      const resp = await api.get(`${BASE}/api/prefill_group/`)
      assertEq(resp.status(), 200, '获取预填分组列表')
    })

    await t.test('admin:task_list', async () => {
      const resp = await api.get(`${BASE}/api/task/`)
      assertEq(resp.status(), 200, '获取任务列表')
    })

    await t.test('admin:task_self', async () => {
      const resp = await api.get(`${BASE}/api/task/self`)
      assertEq(resp.status(), 200, '获取个人任务')
    })

    await t.test('admin:mj_list', async () => {
      const resp = await api.get(`${BASE}/api/mj/`)
      assertEq(resp.status(), 200, '获取 MJ 列表')
    })

    await t.test('admin:mj_self', async () => {
      const resp = await api.get(`${BASE}/api/mj/self`)
      assertEq(resp.status(), 200, '获取个人 MJ')
    })
  })

  // ================================================================
  //  5. Root 管理员 API
  // ================================================================
  await t.section('5. Root 管理员 API', async () => {
    await t.test('root:options', async () => {
      const resp = await api.get(`${BASE}/api/option/`)
      assertEq(resp.status(), 200, '获取系统选项')
    })

    await t.test('root:option_update_and_restore', async () => {
      const statusResp = await api.get(`${BASE}/api/status`)
      const original = (await statusResp.json()).data.system_name

      const resp = await api.put(`${BASE}/api/option/`, {
        data: { key: 'SystemName', value: 'API-Test-Temp' }
      })
      await assertApiSuccess(resp, '更新系统名称')

      const checkResp = await api.get(`${BASE}/api/status`)
      const body = await checkResp.json()
      assertEq(body.data.system_name, 'API-Test-Temp', '系统名称应已更新')

      await api.put(`${BASE}/api/option/`, {
        data: { key: 'SystemName', value: original }
      })
    })

    await t.test('root:performance_stats', async () => {
      const resp = await api.get(`${BASE}/api/performance/stats`)
      assertEq(resp.status(), 200, '获取性能统计')
    })

    await t.test('root:system_tasks', async () => {
      const resp = await api.get(`${BASE}/api/system-task/list`)
      assertEq(resp.status(), 200, '获取系统任务列表')
    })

    await t.test('root:system_task_current', async () => {
      const resp = await api.get(`${BASE}/api/system-task/current`)
      assertEq(resp.status(), 200, '获取当前系统任务')
    })

    await t.test('root:system_instances', async () => {
      const resp = await api.get(`${BASE}/api/system-info/instances`)
      assertEq(resp.status(), 200, '获取系统实例列表')
    })

    await t.test('root:channel_affinity_cache', async () => {
      const resp = await api.get(`${BASE}/api/option/channel_affinity_cache`)
      assertEq(resp.status(), 200, '获取通道亲和性缓存')
    })

    await t.test('root:ratio_sync_channels', async () => {
      const resp = await api.get(`${BASE}/api/ratio_sync/channels`)
      assertEq(resp.status(), 200, '获取可同步渠道')
    })
  })

  // ================================================================
  //  6. 订阅 API
  // ================================================================
  await t.section('6. 订阅 API', async () => {
    await t.test('subscription:plans', async () => {
      const resp = await api.get(`${BASE}/api/subscription/plans`)
      assertEq(resp.status(), 200, '获取订阅计划')
    })

    await t.test('subscription:self', async () => {
      const resp = await api.get(`${BASE}/api/subscription/self`)
      assertEq(resp.status(), 200, '获取个人订阅')
    })

    await t.test('subscription:admin_plans', async () => {
      const resp = await api.get(`${BASE}/api/subscription/admin/plans`)
      assertEq(resp.status(), 200, '获取管理员订阅计划列表')
    })
  })

  // ================================================================
  //  7. 模型列表 API (v1)
  // ================================================================
  await t.section('7. 模型 API (v1)', async () => {
    await t.test('v1:models', async () => {
      const resp = await api.get(`${BASE}/api/models`)
      assertEq(resp.status(), 200, '获取模型列表')
    })

    await t.test('dashboard:models', async () => {
      const resp = await api.get(`${BASE}/api/models`)
      assertEq(resp.status(), 200, '获取 Dashboard 模型')
    })
  })

  // ================================================================
  //  8. 数据分析 API
  // ================================================================
  await t.section('8. 数据分析', async () => {
    await t.test('data:flow', async () => {
      const resp = await api.get(`${BASE}/api/data/flow`)
      assertEq(resp.status(), 200, '获取流量数据')
    })

    await t.test('data:flow_self', async () => {
      const resp = await api.get(`${BASE}/api/data/flow/self`)
      assertEq(resp.status(), 200, '获取个人流量数据')
    })

    await t.test('data:users', async () => {
      const resp = await api.get(`${BASE}/api/data/users`)
      assertEq(resp.status(), 200, '获取用户数据')
    })

    await t.test('data:channel_affinity_usage', async () => {
      const resp = await api.get(`${BASE}/api/log/channel_affinity_usage_cache`)
      assert(resp.status() < 500, '通道亲和使用缓存不应 500')
    })
  })

  // ================================================================
  //  9. Billing API (需要 API Token 认证)
  // ================================================================
  await t.section('9. Billing API', async () => {
    let testKey = null

    await t.test('billing:get_api_key', async () => {
      const createResp = await api.post(`${BASE}/api/token/`, {
        data: { name: 'billing-test-key', expired_time: -1, unlimited_quota: true }
      })
      await assertApiSuccess(createResp, '创建 Billing 测试令牌')
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const token = tokens.find(t => t.name === 'billing-test-key')
      assert(token, '找不到测试令牌')
      const keyResp = await api.post(`${BASE}/api/token/${token.id}/key`)
      const keyBody = await keyResp.json()
      testKey = keyBody.data?.key || keyBody.data
      assert(typeof testKey === 'string' && testKey.length > 0, `获取密钥失败: ${JSON.stringify(keyBody)}`)
    })

    await t.test('billing:subscription', async () => {
      assert(testKey, '需要先获取 API Key')
      const resp = await page.request.get(`${BASE}/dashboard/billing/subscription`, {
        headers: { 'Authorization': `Bearer ${testKey}` }
      })
      assertEq(resp.status(), 200, 'Billing subscription 端点')
    })

    await t.test('billing:usage', async () => {
      assert(testKey, '需要先获取 API Key')
      const resp = await page.request.get(`${BASE}/dashboard/billing/usage`, {
        headers: { 'Authorization': `Bearer ${testKey}` }
      })
      assertEq(resp.status(), 200, 'Billing usage 端点')
    })

    await t.test('billing:v1_subscription', async () => {
      assert(testKey, '需要先获取 API Key')
      const resp = await page.request.get(`${BASE}/v1/dashboard/billing/subscription`, {
        headers: { 'Authorization': `Bearer ${testKey}` }
      })
      assertEq(resp.status(), 200, 'v1 Billing subscription')
    })

    await t.test('billing:v1_usage', async () => {
      assert(testKey, '需要先获取 API Key')
      const resp = await page.request.get(`${BASE}/v1/dashboard/billing/usage`, {
        headers: { 'Authorization': `Bearer ${testKey}` }
      })
      assertEq(resp.status(), 200, 'v1 Billing usage')
    })

    await t.test('billing:cleanup', async () => {
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const token = tokens.find(t => t.name === 'billing-test-key')
      if (token) await api.del(`${BASE}/api/token/${token.id}`)
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
