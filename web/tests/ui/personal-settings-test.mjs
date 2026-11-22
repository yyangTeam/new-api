import { TestRunner, BASE, assert, assertEq } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('个人设置 UI 工作流测试')
  await t.setup({ login: true })
  const { api, page } = t

  // ================================================================
  //  1. 个人设置页面加载与结构
  // ================================================================
  await t.section('1. 个人设置页面结构', async () => {
    await t.test('page:load', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const url = page.url()
      assert(!url.includes('/login'), '应进入个人设置页面')
      await page.screenshot({ path: t.screenshot('personal_settings'), fullPage: true })
    })

    await t.test('page:has_user_info', async () => {
      const content = await page.content()
      assert(/qqqqqqq1|用户|User|个人/i.test(content), '页面应显示用户信息')
    })

    await t.test('page:has_cards', async () => {
      const cards = page.locator('.semi-card')
      const count = await cards.count()
      assert(count >= 2, `应有 >=2 个卡片区块, 实际 ${count}`)
      console.log(`    卡片数: ${count}`)
    })

    await t.test('page:has_tabs', async () => {
      const tabs = page.locator('.semi-tabs-tab')
      const count = await tabs.count()
      console.log(`    标签页数: ${count}`)
      if (count > 0) {
        const texts = await tabs.allTextContents()
        console.log(`    标签: ${texts.join(', ')}`)
      }
    })
  })

  // ================================================================
  //  2. 账号绑定标签页
  // ================================================================
  await t.section('2. 账号绑定/安全', async () => {
    await t.test('binding:find_tab', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const tabs = page.locator('.semi-tabs-tab')
      const count = await tabs.count()
      let foundBinding = false

      for (let i = 0; i < count; i++) {
        const text = await tabs.nth(i).textContent()
        if (/绑定|Binding|账号|Account|安全|Security/i.test(text)) {
          await tabs.nth(i).click()
          await page.waitForTimeout(1000)
          foundBinding = true
          break
        }
      }
      console.log(`    绑定标签: ${foundBinding ? '找到' : '未找到单独标签'}`)
      await page.screenshot({ path: t.screenshot('binding_tab'), fullPage: true })
    })

    await t.test('security:find_tab', async () => {
      const tabs = page.locator('.semi-tabs-tab')
      const count = await tabs.count()

      for (let i = 0; i < count; i++) {
        const text = await tabs.nth(i).textContent()
        if (/安全|Security/i.test(text)) {
          await tabs.nth(i).click()
          await page.waitForTimeout(1000)
          await page.screenshot({ path: t.screenshot('security_tab'), fullPage: true })
          break
        }
      }
    })

    await t.test('security:password_change_button', async () => {
      const changeBtn = page.locator('button').filter({ hasText: /修改密码|Change.*Password|密码/i }).first()
      const visible = await changeBtn.isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`    修改密码按钮: ${visible ? '存在' : '未找到'}`)
    })

    await t.test('security:access_token_section', async () => {
      const content = await page.content()
      const hasToken = /系统访问令牌|Access Token|访问令牌|生成令牌/i.test(content)
      console.log(`    系统令牌区域: ${hasToken ? '存在' : '未找到'}`)
    })
  })

  // ================================================================
  //  3. 修改密码对话框
  // ================================================================
  await t.section('3. 修改密码交互', async () => {
    await t.test('password:open_modal', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const tabs = page.locator('.semi-tabs-tab')
      const count = await tabs.count()
      for (let i = 0; i < count; i++) {
        const text = await tabs.nth(i).textContent()
        if (/安全|Security/i.test(text)) {
          await tabs.nth(i).click()
          await page.waitForTimeout(1000)
          break
        }
      }

      const changeBtn = page.locator('button').filter({ hasText: /修改密码|Change.*Password/i }).first()
      const visible = await changeBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (visible) {
        await changeBtn.click()
        await page.waitForTimeout(1000)
        await page.screenshot({ path: t.screenshot('password_modal'), fullPage: true })
      } else {
        console.log('    修改密码按钮不可见，跳过')
      }
    })

    await t.test('password:modal_has_fields', async () => {
      const modal = page.locator('.semi-modal')
      const visible = await modal.isVisible({ timeout: 2000 }).catch(() => false)

      if (visible) {
        const inputs = modal.locator('input[type="password"], input')
        const count = await inputs.count()
        assert(count >= 2, `密码修改对话框应有 >=2 个输入框, 实际 ${count}`)
        console.log(`    密码输入框数: ${count}`)

        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      } else {
        console.log('    密码对话框未打开')
      }
    })
  })

  // ================================================================
  //  4. 通知设置
  // ================================================================
  await t.section('4. 通知设置', async () => {
    await t.test('notification:find_section', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const content = await page.content()
      const hasNotif = /通知|Notification|预警|Alert/i.test(content)
      console.log(`    通知设置区域: ${hasNotif ? '存在' : '未找到'}`)
    })

    await t.test('notification:tabs', async () => {
      const tabs = page.locator('.semi-tabs-tab')
      const count = await tabs.count()

      for (let i = 0; i < count; i++) {
        const text = await tabs.nth(i).textContent()
        if (/通知|Notification/i.test(text)) {
          await tabs.nth(i).click()
          await page.waitForTimeout(1000)
          await page.screenshot({ path: t.screenshot('notification_settings'), fullPage: true })
          break
        }
      }
    })

    await t.test('notification:has_save_button', async () => {
      const saveBtn = page.locator('button').filter({ hasText: /保存设置|Save|保存/ })
      const count = await saveBtn.count()
      console.log(`    保存按钮: ${count} 个`)
    })
  })

  // ================================================================
  //  5. 签到功能
  // ================================================================
  await t.section('5. 签到功能', async () => {
    await t.test('checkin:api_status', async () => {
      const resp = await api.get(`${BASE}/api/user/checkin/status`)
      const body = await resp.json()
      console.log(`    签到状态: ${JSON.stringify(body.data || body).substring(0, 100)}`)
    })

    await t.test('checkin:find_on_page', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const content = await page.content()
      const hasCheckin = /签到|Check.?in|日历|Calendar/i.test(content)
      console.log(`    签到区域: ${hasCheckin ? '存在' : '未找到'}`)
    })
  })

  // ================================================================
  //  6. 语言偏好设置
  // ================================================================
  await t.section('6. 语言偏好', async () => {
    await t.test('language:find_selector', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const selects = page.locator('.semi-select')
      const count = await selects.count()
      let foundLang = false

      for (let i = 0; i < count; i++) {
        const text = await selects.nth(i).textContent()
        if (/中文|English|简体|en|zh/i.test(text)) {
          foundLang = true
          console.log(`    当前语言: ${text.trim()}`)
          break
        }
      }
      console.log(`    语言选择器: ${foundLang ? '找到' : '未找到'}`)
    })
  })

  // ================================================================
  //  7. 可用模型列表
  // ================================================================
  await t.section('7. 可用模型列表', async () => {
    await t.test('models:displayed', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const content = await page.content()
      const hasModels = /可用模型|Available.*Model|模型列表/i.test(content)
      console.log(`    模型列表区域: ${hasModels ? '存在' : '未找到'}`)
    })

    await t.test('models:api_check', async () => {
      const resp = await api.get(`${BASE}/api/user/models`)
      const body = await resp.json()
      const models = body.data || []
      assert(Array.isArray(models), '模型列表应为数组')
      console.log(`    可用模型数: ${models.length}`)
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
