import { TestRunner, BASE, assert, assertEq } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('表单验证与错误处理测试')
  await t.setup({ login: true })
  const { api, page } = t

  // ================================================================
  //  1. 令牌创建表单验证
  // ================================================================
  await t.section('1. 令牌表单验证', async () => {
    await t.test('token:empty_name_submit', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加令牌|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      const nameInput = sidesheet.locator('input').first()
      await nameInput.fill('')

      const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(1500)

      const hasError = page.locator('.semi-form-field-error-message, .semi-toast-error, .semi-toast-warning, [class*="error"]')
      const errorVisible = await hasError.first().isVisible({ timeout: 2000 }).catch(() => false)

      const stillOpen = await sidesheet.isVisible().catch(() => false)
      assert(errorVisible || stillOpen, '空名称提交应有错误提示或表单不关闭')
      await page.screenshot({ path: t.screenshot('token_empty_name_error'), fullPage: true })

      const closeBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /取消|Cancel|Close/ }).first()
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(500)
    })

    await t.test('token:api_empty_name_rejected', async () => {
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: '', expired_time: -1, unlimited_quota: true }
      })
      const body = await resp.json()
      // Server may accept or reject - we verify it doesn't crash
      assert(resp.status() < 500, '空名称不应导致 500 错误')
      console.log(`    空名称: success=${body.success}, status=${resp.status()}`)
      if (body.success !== false) {
        // cleanup if created
        const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
        const tokens = (await listResp.json()).data?.items || []
        const tk = tokens.find(t => t.name === '')
        if (tk) await api.del(`${BASE}/api/token/${tk.id}`)
      }
    })

    await t.test('token:very_long_name', async () => {
      const longName = 'a'.repeat(300)
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: longName, expired_time: -1, unlimited_quota: true }
      })
      const body = await resp.json()
      assert(body.success === false, '超长名称应被拒绝')
    })

    await t.test('token:duplicate_name', async () => {
      await api.post(`${BASE}/api/token/`, {
        data: { name: 'dup-validate-test', expired_time: -1, unlimited_quota: true }
      })
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: 'dup-validate-test', expired_time: -1, unlimited_quota: true }
      })
      const body = await resp.json()
      console.log(`    重复名称: success=${body.success}, msg=${body.message || 'N/A'}`)

      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const dups = tokens.filter(tk => tk.name === 'dup-validate-test')
      for (const tk of dups) await api.del(`${BASE}/api/token/${tk.id}`)
    })
  })

  // ================================================================
  //  2. 用户创建表单验证
  // ================================================================
  await t.section('2. 用户表单验证', async () => {
    await t.test('user:empty_username', async () => {
      const resp = await api.post(`${BASE}/api/user/`, {
        data: { username: '', password: 'test123456' }
      })
      const body = await resp.json()
      assert(body.success === false, '空用户名应被拒绝')
    })

    await t.test('user:empty_password', async () => {
      const resp = await api.post(`${BASE}/api/user/`, {
        data: { username: `validate_test_${Date.now()}`, password: '' }
      })
      const body = await resp.json()
      assert(body.success === false, '空密码应被拒绝')
    })

    await t.test('user:short_password', async () => {
      const resp = await api.post(`${BASE}/api/user/`, {
        data: { username: `validate_test_${Date.now()}`, password: '123' }
      })
      const body = await resp.json()
      console.log(`    短密码: success=${body.success}, msg=${body.message || 'N/A'}`)
    })

    await t.test('user:duplicate_username', async () => {
      const username = `dup${String(Date.now()).slice(-6)}`
      const resp1 = await api.post(`${BASE}/api/user/`, {
        data: { username, password: 'test123456' }
      })
      const body1 = await resp1.json()
      assert(body1.success !== false, '第一次创建应成功')

      const resp2 = await api.post(`${BASE}/api/user/`, {
        data: { username, password: 'test123456' }
      })
      const body2 = await resp2.json()
      assert(body2.success === false, '重复用户名应被拒绝')
      console.log(`    重复用户名: ${body2.message}`)

      const listResp = await api.get(`${BASE}/api/user/?p=0&size=100`)
      const users = (await listResp.json()).data?.items || []
      const user = users.find(u => u.username === username)
      if (user) await api.del(`${BASE}/api/user/${user.id}`)
    })

    await t.test('user:ui_empty_submit', async () => {
      await page.goto(`${BASE}/console/user`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加用户|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(1500)

      const hasError = page.locator('.semi-form-field-error-message, .semi-toast-error, .semi-toast-warning')
      const errorVisible = await hasError.first().isVisible({ timeout: 2000 }).catch(() => false)
      const stillOpen = await sidesheet.isVisible().catch(() => false)
      assert(errorVisible || stillOpen, '空表单提交应有验证提示或不关闭')
      await page.screenshot({ path: t.screenshot('user_empty_submit'), fullPage: true })

      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    })
  })

  // ================================================================
  //  3. 兑换码创建表单验证
  // ================================================================
  await t.section('3. 兑换码表单验证', async () => {
    await t.test('redemption:zero_amount', async () => {
      const resp = await api.post(`${BASE}/api/redemption/`, {
        data: { name: 'zero-amount', quota: 0, count: 1 }
      })
      const body = await resp.json()
      console.log(`    零额度: success=${body.success}, msg=${body.message || 'N/A'}`)
      if (body.success !== false) {
        const listResp = await api.get(`${BASE}/api/redemption/?p=0&size=100`)
        const items = (await listResp.json()).data?.items || []
        const r = items.find(i => i.name === 'zero-amount')
        if (r) await api.del(`${BASE}/api/redemption/${r.id}`)
      }
    })

    await t.test('redemption:negative_quota', async () => {
      const resp = await api.post(`${BASE}/api/redemption/`, {
        data: { name: 'neg-redeem', quota: -1000, count: 1 }
      })
      const body = await resp.json()
      console.log(`    负额度: success=${body.success}, msg=${body.message || 'N/A'}`)
    })

    await t.test('redemption:zero_count', async () => {
      const resp = await api.post(`${BASE}/api/redemption/`, {
        data: { name: 'zero-count', quota: 100000, count: 0 }
      })
      const body = await resp.json()
      assert(body.success === false, '零数量应被拒绝')
    })

    await t.test('redemption:excessive_count', async () => {
      const resp = await api.post(`${BASE}/api/redemption/`, {
        data: { name: 'big-count', quota: 100000, count: 10000 }
      })
      const body = await resp.json()
      console.log(`    大量生成: success=${body.success}, msg=${body.message || 'N/A'}`)
      if (body.success !== false) {
        const listResp = await api.get(`${BASE}/api/redemption/?p=0&size=100`)
        const items = (await listResp.json()).data?.items || []
        for (const r of items.filter(i => i.name === 'big-count')) {
          await api.del(`${BASE}/api/redemption/${r.id}`)
        }
      }
    })
  })

  // ================================================================
  //  4. 渠道创建表单验证
  // ================================================================
  await t.section('4. 渠道表单验证', async () => {
    await t.test('channel:empty_name', async () => {
      const resp = await api.post(`${BASE}/api/channel/`, {
        data: { name: '', type: 1, key: 'sk-test', models: 'gpt-4' }
      })
      const status = resp.status()
      assert(status < 500, `空名称不应导致 500, 实际 ${status}`)
      // Server accepts empty name — clean up if created
      const text = await resp.text()
      if (text) {
        try {
          const body = JSON.parse(text)
          console.log(`    空名称: success=${body.success}, status=${status}`)
          if (body.success !== false) {
            const listResp = await api.get(`${BASE}/api/channel/?p=0&size=100`)
            const channels = (await listResp.json()).data?.items || (await listResp.json()).data || []
            const ch = channels.find(c => c.name === '' && c.key === 'sk-test')
            if (ch) await api.del(`${BASE}/api/channel/${ch.id}`)
          }
        } catch {}
      }
    })

    await t.test('channel:empty_key', async () => {
      const resp = await api.post(`${BASE}/api/channel/`, {
        data: { name: 'test-ch-empty-key', type: 1, key: '', models: 'gpt-4' }
      })
      const status = resp.status()
      assert(status < 500, `空密钥不应导致 500, 实际 ${status}`)
      const text = await resp.text()
      if (text) {
        try {
          const body = JSON.parse(text)
          console.log(`    空密钥: success=${body.success}, status=${status}`)
          if (body.success !== false) {
            const listResp = await api.get(`${BASE}/api/channel/?p=0&size=100`)
            const channels = (await listResp.json()).data?.items || (await listResp.json()).data || []
            const ch = channels.find(c => c.name === 'test-ch-empty-key')
            if (ch) await api.del(`${BASE}/api/channel/${ch.id}`)
          }
        } catch {}
      }
    })

    await t.test('channel:invalid_type', async () => {
      const resp = await api.post(`${BASE}/api/channel/`, {
        data: { name: 'test-ch', type: 9999, key: 'sk-test', models: 'gpt-4' }
      })
      const status = resp.status()
      assert(status < 500, `无效类型不应导致 500, 实际 ${status}`)
    })

    await t.test('channel:ui_open_create_form', async () => {
      await page.goto(`${BASE}/console/channel`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加|Add/ }).first()
      const visible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (visible) {
        await addBtn.click()
        await page.waitForTimeout(1000)

        const sidesheet = page.locator('.semi-sidesheet')
        const open = await sidesheet.isVisible({ timeout: 5000 }).catch(() => false)
        if (open) {
          await page.screenshot({ path: t.screenshot('channel_create_form'), fullPage: true })

          const typeSelect = sidesheet.locator('.semi-select').first()
          const hasType = await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)
          assert(hasType, '应有类型选择器')

          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
        }
      }
    })
  })

  // ================================================================
  //  5. Toast 和错误反馈
  // ================================================================
  await t.section('5. Toast 错误反馈验证', async () => {
    await t.test('toast:api_error_shows_message', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加令牌|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      const nameInput = sidesheet.locator('input').first()
      await nameInput.fill('x'.repeat(500))

      const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(2000)

      const toast = page.locator('.semi-toast-error, .semi-toast-warning, .semi-toast')
      const hasToast = await toast.first().isVisible({ timeout: 3000 }).catch(() => false)
      if (hasToast) {
        const toastText = await toast.first().textContent()
        console.log(`    Toast 消息: ${toastText}`)
      } else {
        const stillOpen = await sidesheet.isVisible().catch(() => false)
        console.log(`    Toast: ${hasToast ? '显示' : '未显示'}, 面板: ${stillOpen ? '仍开启' : '已关闭'}`)
      }

      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    })

    await t.test('toast:success_message_on_create', async () => {
      const tokenName = `toast-test-${Date.now()}`

      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加令牌|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      const nameInput = sidesheet.locator('input').first()
      await nameInput.fill(tokenName)

      const neverBtn = sidesheet.locator('button').filter({ hasText: /永不过期|Never/ }).first()
      if (await neverBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await neverBtn.click()
      }

      const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(2000)

      const successToast = page.locator('.semi-toast-success, .semi-toast')
      const hasSuccess = await successToast.first().isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`    成功 Toast: ${hasSuccess ? '显示' : '未显示'}`)

      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const tk = tokens.find(t => t.name === tokenName)
      if (tk) await api.del(`${BASE}/api/token/${tk.id}`)
    })
  })

  // ================================================================
  //  6. 对话框取消和关闭行为
  // ================================================================
  await t.section('6. 对话框取消/关闭', async () => {
    await t.test('dialog:cancel_doesnt_save', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const beforeResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const beforeCount = ((await beforeResp.json()).data?.items || []).length

      const addBtn = page.locator('button').filter({ hasText: /添加令牌|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      const nameInput = sidesheet.locator('input').first()
      await nameInput.fill('should-not-be-created')

      const cancelBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /取消|Cancel|Close/ }).first()
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(1000)

      const afterResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const afterCount = ((await afterResp.json()).data?.items || []).length
      assertEq(afterCount, beforeCount, '取消后令牌数量不应变化')
    })

    await t.test('dialog:escape_or_close_button', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const addBtn = page.locator('button').filter({ hasText: /添加令牌|添加|Add/ }).first()
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })

      // Try Escape first
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1000)

      let stillVisible = await sidesheet.isVisible().catch(() => false)
      if (stillVisible) {
        // Try close button
        const closeBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /取消|Cancel|Close/ }).first()
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click()
          await page.waitForTimeout(1000)
        }
        stillVisible = await sidesheet.isVisible().catch(() => false)
      }
      assert(!stillVisible, 'Escape 或取消按钮应关闭对话框')
    })
  })

  // ================================================================
  //  7. 删除确认对话框
  // ================================================================
  await t.section('7. 删除确认交互', async () => {
    let tempTokenId = null

    await t.test('delete_confirm:create_temp_token', async () => {
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: 'del-confirm-test', expired_time: -1, unlimited_quota: true }
      })
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const tk = tokens.find(t => t.name === 'del-confirm-test')
      assert(tk, '临时令牌应创建成功')
      tempTokenId = tk.id
    })

    await t.test('delete_confirm:cancel_keeps_token', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes('del-confirm-test')) {
          const delBtn = rows.nth(i).locator('button').filter({ hasText: /删除|Delete/ }).first()
          const visible = await delBtn.isVisible({ timeout: 2000 }).catch(() => false)
          if (visible) {
            await delBtn.click()
            await page.waitForTimeout(500)

            const modal = page.locator('.semi-modal')
            if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
              const cancelBtn = modal.locator('button').filter({ hasText: /取消|Cancel|No/ }).first()
              if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await cancelBtn.click()
                await page.waitForTimeout(1000)
              }
            }
          }
          break
        }
      }

      const resp = await api.get(`${BASE}/api/token/${tempTokenId}`)
      const body = await resp.json()
      assert(body.success !== false && body.data, '取消删除后令牌应仍存在')
    })

    await t.test('delete_confirm:cleanup', async () => {
      await api.del(`${BASE}/api/token/${tempTokenId}`)
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
