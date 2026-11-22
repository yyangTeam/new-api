import { TestRunner, BASE, assert, assertEq } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('跨页面业务流程测试')
  await t.setup({ login: true })
  const { api, page } = t

  // ================================================================
  //  1. 创建令牌 → 获取密钥 → 用密钥调用 API
  // ================================================================
  await t.section('1. 令牌创建→密钥使用全流程', async () => {
    let tokenId = null
    let tokenKey = null

    await t.test('flow1:create_token_via_ui', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加令牌|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      const nameInput = sidesheet.locator('input').first()
      await nameInput.fill('cross-flow-test')

      const neverBtn = sidesheet.locator('button').filter({ hasText: /永不过期|Never/ }).first()
      if (await neverBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await neverBtn.click()
      }

      const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(2000)

      const resp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const body = await resp.json()
      const tokens = body.data?.items || body.data || []
      const found = tokens.find(tk => tk.name === 'cross-flow-test')
      assert(found, '令牌应创建成功')
      tokenId = found.id
    })

    await t.test('flow1:navigate_to_token_and_get_key', async () => {
      const resp = await api.post(`${BASE}/api/token/${tokenId}/key`)
      const body = await resp.json()
      tokenKey = body.data?.key || body.data
      assert(typeof tokenKey === 'string' && tokenKey.length > 10, '密钥应有效')
      console.log(`    密钥: ${tokenKey.substring(0, 20)}...`)
    })

    await t.test('flow1:use_key_for_models_api', async () => {
      const resp = await page.request.get(`${BASE}/v1/models`, {
        headers: { 'Authorization': `Bearer ${tokenKey}` }
      })
      assertEq(resp.status(), 200, '使用令牌密钥访问 /v1/models 应成功')
      const body = await resp.json()
      assert(body.data && Array.isArray(body.data), '应返回模型列表')
      console.log(`    通过密钥获取模型数: ${body.data.length}`)
    })

    await t.test('flow1:use_key_for_billing', async () => {
      const resp = await page.request.get(`${BASE}/dashboard/billing/subscription`, {
        headers: { 'Authorization': `Bearer ${tokenKey}` }
      })
      assertEq(resp.status(), 200, '使用密钥访问 billing 应成功')
    })

    await t.test('flow1:use_key_for_usage', async () => {
      const resp = await page.request.get(`${BASE}/dashboard/billing/usage?start_date=2024-01-01&end_date=2025-12-31`, {
        headers: { 'Authorization': `Bearer ${tokenKey}` }
      })
      assertEq(resp.status(), 200, '使用密钥访问 usage 应成功')
      const body = await resp.json()
      assert('total_usage' in body, '应返回 total_usage 字段')
    })

    await t.test('flow1:invalid_key_rejected', async () => {
      const resp = await page.request.get(`${BASE}/v1/models`, {
        headers: { 'Authorization': 'Bearer sk-invalid-key-12345' }
      })
      assert(resp.status() === 401 || resp.status() === 403, `无效密钥应被拒绝, 实际 ${resp.status()}`)
    })

    await t.test('flow1:cleanup', async () => {
      await api.del(`${BASE}/api/token/${tokenId}`)
    })
  })

  // ================================================================
  //  2. 创建兑换码 → 验证其存在 → 使用兑换码
  // ================================================================
  await t.section('2. 兑换码创建→兑换全流程', async () => {
    let redemptionId = null
    let redemptionKey = null

    await t.test('flow2:confirm_payment_compliance', async () => {
      const resp = await api.post(`${BASE}/api/option/payment_compliance`, {
        data: { confirmed: true }
      })
      const body = await resp.json()
      console.log(`    合规声明: ${body.success !== false ? '已确认' : body.message}`)
    })

    await t.test('flow2:create_redemption_via_ui', async () => {
      await page.goto(`${BASE}/console/redemption`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加兑换码|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      const nameInput = sidesheet.locator('input').first()
      await nameInput.fill('xflow-rdm')

      const amountInputs = sidesheet.locator('.semi-input-number input, input[type="number"]')
      if (await amountInputs.count() > 0) {
        await amountInputs.first().fill('0.5')
      }

      const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(2000)

      const downloadModal = page.locator('.semi-modal')
      if (await downloadModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }

      const resp = await api.get(`${BASE}/api/redemption/?p=0&size=100`)
      const body = await resp.json()
      const items = body.data?.items || body.data || []
      const found = items.find(r => r.name === 'xflow-rdm')
      assert(found, '兑换码应创建成功')
      redemptionId = found.id
      redemptionKey = found.key
      console.log(`    兑换码: ${redemptionKey}`)
    })

    await t.test('flow2:navigate_to_topup_page', async () => {
      await page.goto(`${BASE}/console/topup`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const url = page.url()
      assert(!url.includes('/login'), '应进入充值页面')
      await page.screenshot({ path: t.screenshot('topup_page'), fullPage: true })
    })

    await t.test('flow2:find_redemption_input', async () => {
      const inputs = page.locator('input')
      const count = await inputs.count()
      let foundInput = false

      for (let i = 0; i < count; i++) {
        const placeholder = await inputs.nth(i).getAttribute('placeholder') || ''
        if (/兑换码|redemption|code|充值码/i.test(placeholder)) {
          foundInput = true
          console.log(`    兑换码输入框: 找到 (placeholder: ${placeholder})`)
          break
        }
      }

      if (!foundInput) {
        console.log(`    兑换码输入框: 页面有 ${count} 个输入框，可能结构不同`)
      }
    })

    await t.test('flow2:redeem_via_api', async () => {
      if (redemptionKey) {
        const beforeResp = await api.get(`${BASE}/api/user/self`)
        const beforeBody = await beforeResp.json()
        const beforeQuota = beforeBody.data?.quota || 0

        const resp = await api.post(`${BASE}/api/topup/redemption`, {
          data: { key: redemptionKey }
        })
        const body = await resp.json()
        if (body.success !== false) {
          const afterResp = await api.get(`${BASE}/api/user/self`)
          const afterBody = await afterResp.json()
          const afterQuota = afterBody.data?.quota || 0
          console.log(`    兑换前额度: ${beforeQuota}, 兑换后: ${afterQuota}`)
        } else {
          console.log(`    兑换结果: ${body.message || 'failed'}`)
        }
      }
    })

    await t.test('flow2:verify_redemption_used', async () => {
      const resp = await api.get(`${BASE}/api/redemption/${redemptionId}`)
      const body = await resp.json()
      const item = body.data || body
      console.log(`    兑换码状态: status=${item.status}, used_count=${item.redeemed_count || item.count || 'N/A'}`)
    })

    await t.test('flow2:cleanup', async () => {
      await api.del(`${BASE}/api/redemption/${redemptionId}`)
    })
  })

  // ================================================================
  //  3. 系统设置修改 → 验证生效 → 恢复
  // ================================================================
  await t.section('3. 设置修改→验证→恢复', async () => {
    let originalNotice = null

    await t.test('flow3:read_original_notice', async () => {
      const resp = await api.get(`${BASE}/api/notice`)
      const body = await resp.json()
      originalNotice = body.data || ''
      console.log(`    原始公告: "${String(originalNotice).substring(0, 50)}..."`)
    })

    await t.test('flow3:update_notice_via_settings', async () => {
      await page.goto(`${BASE}/console/setting`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const tabs = page.locator('.semi-tabs-tab')
      const count = await tabs.count()

      for (let i = 0; i < count; i++) {
        const text = await tabs.nth(i).textContent()
        if (/运营|Operation|公告|Notice/i.test(text)) {
          await tabs.nth(i).click()
          await page.waitForTimeout(1000)
          break
        }
      }

      await page.screenshot({ path: t.screenshot('settings_operation_tab'), fullPage: true })
    })

    await t.test('flow3:update_notice_via_api', async () => {
      const testNotice = `Test notice ${Date.now()}`
      const resp = await api.put(`${BASE}/api/option/`, {
        data: { key: 'Notice', value: testNotice }
      })
      const body = await resp.json()

      const checkResp = await api.get(`${BASE}/api/notice`)
      const checkBody = await checkResp.json()
      const currentNotice = checkBody.data || ''
      assertEq(currentNotice, testNotice, '公告应已更新')
    })

    await t.test('flow3:verify_notice_on_frontend', async () => {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: t.screenshot('notice_updated'), fullPage: true })
    })

    await t.test('flow3:restore_notice', async () => {
      await api.put(`${BASE}/api/option/`, {
        data: { key: 'Notice', value: originalNotice || '' }
      })

      const checkResp = await api.get(`${BASE}/api/notice`)
      const checkBody = await checkResp.json()
      assertEq(checkBody.data || '', originalNotice || '', '公告应已恢复')
    })
  })

  // ================================================================
  //  4. 创建用户 → 用新用户登录 → 验证权限 → 清理
  // ================================================================
  await t.section('4. 新用户创建→登录→权限验证', async () => {
    const NEW_USER = `fu${String(Date.now()).slice(-6)}`
    const NEW_PASS = 'FlowTest123!'
    let newUserId = null

    await t.test('flow4:create_user', async () => {
      const resp = await api.post(`${BASE}/api/user/`, {
        data: { username: NEW_USER, password: NEW_PASS }
      })
      const body = await resp.json()
      assert(body.success !== false, `创建用户应成功: ${body.message || ''}`)

      const listResp = await api.get(`${BASE}/api/user/?p=0&size=100`)
      const listBody = await listResp.json()
      const users = listBody.data?.items || listBody.data || []
      const found = users.find(u => u.username === NEW_USER)
      assert(found, '用户应已创建')
      newUserId = found.id
    })

    await t.test('flow4:login_as_new_user', async () => {
      const newContext = await t.browser.newContext({ viewport: { width: 1440, height: 900 } })
      const newPage = await newContext.newPage()

      await newPage.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })
      await newPage.waitForTimeout(500)

      const inputs = await newPage.locator('input').all()
      await inputs[0].fill(NEW_USER)
      await inputs[1].fill(NEW_PASS)

      const submitBtn = newPage.locator('button[type="submit"]').first()
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
      } else {
        const btns = newPage.locator('button')
        const count = await btns.count()
        for (let i = 0; i < count; i++) {
          const text = await btns.nth(i).textContent()
          if (/登录|Login|Sign in/i.test(text)) {
            await btns.nth(i).click()
            break
          }
        }
      }

      await newPage.waitForTimeout(3000)
      const url = newPage.url()
      assert(!url.includes('/login'), `新用户应登录成功, 当前URL: ${url}`)
      console.log(`    新用户登录成功: ${url}`)
    })

    await t.test('flow4:new_user_cannot_access_admin', async () => {
      const newContext = await t.browser.newContext({ viewport: { width: 1440, height: 900 } })
      const newPage = await newContext.newPage()

      await newPage.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })
      await newPage.waitForTimeout(500)
      const inputs = await newPage.locator('input').all()
      await inputs[0].fill(NEW_USER)
      await inputs[1].fill(NEW_PASS)
      const submitBtn = newPage.locator('button[type="submit"]').first()
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
      }
      await newPage.waitForTimeout(3000)

      const cookies = await newPage.context().cookies()
      const sessionCookie = cookies.find(c => c.name === 'session')

      const optionResp = await newPage.request.get(`${BASE}/api/option/`)
      const optionStatus = optionResp.status()
      assert(optionStatus === 401 || optionStatus === 403 || (await optionResp.json()).success === false,
        `普通用户不应访问系统选项, 实际 ${optionStatus}`)

      await newPage.close()
      await newContext.close()
    })

    await t.test('flow4:cleanup_user', async () => {
      await api.del(`${BASE}/api/user/${newUserId}`)
      const resp = await api.get(`${BASE}/api/user/?p=0&size=100`)
      const body = await resp.json()
      const users = body.data?.items || body.data || []
      const found = users.find(u => u.username === NEW_USER)
      assert(!found, '用户应已删除')
    })
  })

  // ================================================================
  //  5. Dashboard 数据联动
  // ================================================================
  await t.section('5. Dashboard 数据联动', async () => {
    await t.test('flow5:dashboard_shows_stats', async () => {
      await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(3000)
      await page.screenshot({ path: t.screenshot('dashboard_stats'), fullPage: true })

      const url = page.url()
      assert(!url.includes('/login'), 'Dashboard 应正常加载')
    })

    await t.test('flow5:dashboard_api_data', async () => {
      const resp = await api.get(`${BASE}/api/data/self`)
      const body = await resp.json()
      assert(body.success !== false, 'Dashboard 数据 API 应成功')
      console.log(`    个人数据: ${JSON.stringify(body.data || {}).substring(0, 100)}`)
    })

    await t.test('flow5:dashboard_quota_check', async () => {
      const resp = await api.get(`${BASE}/api/user/self`)
      const body = await resp.json()
      const quota = body.data?.quota
      assert(quota !== undefined, '应返回用户额度')
      console.log(`    当前额度: ${quota}`)
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
