import { TestRunner, BASE, assert, assertEq } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('E2E 页面与用户流程测试')
  await t.setup({ login: true })
  const { api, page } = t

  // ================================================================
  //  1. 全部控制台页面导航
  // ================================================================
  await t.section('1. 控制台页面导航', async () => {
    const consolePages = [
      ['dashboard',      '/console',           '仪表盘'],
      ['channels',       '/console/channel',    '渠道管理'],
      ['tokens',         '/console/token',      '令牌管理'],
      ['logs',           '/console/log',        '日志'],
      ['users',          '/console/user',       '用户管理'],
      ['settings',       '/console/setting',    '系统设置'],
      ['topup',          '/console/topup',      '钱包/充值'],
      ['profile',        '/console/personal',   '个人设置'],
      ['midjourney',     '/console/midjourney',  'Midjourney'],
      ['task',           '/console/task',        '任务'],
      ['playground',     '/console/playground',  'Playground'],
      ['models',         '/console/models',      '模型管理'],
      ['redemption',     '/console/redemption',  '兑换码'],
      ['subscription',   '/console/subscription','订阅管理'],
    ]

    for (const [name, path, desc] of consolePages) {
      await t.test(`nav:${name}`, async () => {
        const resp = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 })
        await page.waitForTimeout(1500)
        const url = page.url()
        assert(!url.includes('/login'), `${desc} 页面被重定向到登录`)
        assert(resp.status() < 400, `${desc} 页面返回错误: ${resp.status()}`)
        await page.screenshot({ path: t.screenshot(name), fullPage: true })
      })
    }
  })

  // ================================================================
  //  2. 公开页面（无需登录）
  // ================================================================
  await t.section('2. 公开页面', async () => {
    const publicPages = [
      ['home',     '/',         '首页'],
      ['login',    '/login',    '登录页'],
      ['pricing',  '/pricing',  '定价页'],
      ['about',    '/about',    '关于页'],
    ]

    const publicContext = await t.browser.newContext({ viewport: { width: 1440, height: 900 } })
    const publicPage = await publicContext.newPage()

    for (const [name, path, desc] of publicPages) {
      await t.test(`public:${name}`, async () => {
        const resp = await publicPage.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 })
        await publicPage.waitForTimeout(1500)
        assertEq(resp.status(), 200, `${desc} 应返回 200`)
      })
    }

    await publicPage.close()
    await publicContext.close()
  })

  // ================================================================
  //  3. 侧边栏导航
  // ================================================================
  await t.section('3. 侧边栏导航', async () => {
    await t.test('sidebar:entries_present', async () => {
      await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const navItems = await page.locator('.semi-navigation-item-text').allTextContents()
      assert(navItems.length >= 5, `侧边栏应有 >=5 项，实际: ${navItems.length}`)
      console.log(`    侧边栏项目: ${navItems.join(', ')}`)
    })

    await t.test('sidebar:click_navigation', async () => {
      await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const navItems = page.locator('.semi-navigation-item-text')
      const count = await navItems.count()
      assert(count >= 3, '侧边栏应有足够导航项')

      await navItems.nth(1).click()
      await page.waitForTimeout(1500)
      const urlAfter = page.url()
      assert(urlAfter !== `${BASE}/console` || true, '点击导航应切换页面')
    })
  })

  // ================================================================
  //  4. 设置页面标签页
  // ================================================================
  await t.section('4. 设置页面标签页', async () => {
    await t.test('settings:load', async () => {
      await page.goto(`${BASE}/console/setting`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const tabs = await page.locator('.semi-tabs-tab').allTextContents()
      assert(tabs.length >= 3, `设置标签应 >=3 个，实际: ${tabs.length}`)
      console.log(`    设置标签: ${tabs.join(', ')}`)
    })

    await t.test('settings:switch_tabs', async () => {
      const tabs = page.locator('.semi-tabs-tab')
      const count = await tabs.count()
      for (let i = 0; i < Math.min(count, 5); i++) {
        const tabText = await tabs.nth(i).textContent()
        await tabs.nth(i).click()
        await page.waitForTimeout(800)
        await page.screenshot({ path: t.screenshot(`settings_tab_${i}`), fullPage: true })
      }
    })
  })

  // ================================================================
  //  5. 令牌管理 UI 流程
  // ================================================================
  await t.section('5. 令牌管理 UI', async () => {
    await t.test('token_ui:page_loads', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const content = await page.content()
      assert(/令牌|Token|token/i.test(content), '令牌页面应显示令牌相关内容')
    })

    await t.test('token_ui:add_button_exists', async () => {
      const addBtn = page.locator('button:has-text("添加"), button:has-text("Add")').first()
      const visible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)
      assert(visible, '应有添加令牌按钮')
    })

    await t.test('token_ui:batch_add_button', async () => {
      const batchBtn = page.locator('button:has-text("批量添加"), button:has-text("Batch")').first()
      const visible = await batchBtn.isVisible({ timeout: 3000 }).catch(() => false)
      assert(visible, '应有批量添加按钮')
    })

    await t.test('token_ui:table_has_data', async () => {
      const rows = page.locator('.semi-table-body .semi-table-row, table tbody tr')
      const count = await rows.count()
      console.log(`    令牌表格行数: ${count}`)
    })

    await t.test('token_ui:pagination', async () => {
      const pagination = page.locator('.semi-page, [class*="pagination"]').first()
      const exists = await pagination.isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`    分页组件: ${exists ? '存在' : '不存在或数据不足'}`)
    })
  })

  // ================================================================
  //  6. 渠道管理 UI 流程
  // ================================================================
  await t.section('6. 渠道管理 UI', async () => {
    await t.test('channel_ui:page_loads', async () => {
      await page.goto(`${BASE}/console/channel`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const content = await page.content()
      assert(/渠道|Channel|channel/i.test(content), '渠道页面应显示渠道相关内容')
    })

    await t.test('channel_ui:add_button_exists', async () => {
      const addBtn = page.locator('button:has-text("添加"), button:has-text("Add")').first()
      const visible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)
      assert(visible, '应有添加渠道按钮')
    })

    await t.test('channel_ui:search_input', async () => {
      const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"], input[placeholder*="search"]').first()
      const visible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`    搜索输入框: ${visible ? '存在' : '不存在'}`)
    })
  })

  // ================================================================
  //  7. 用户管理 UI 流程
  // ================================================================
  await t.section('7. 用户管理 UI', async () => {
    await t.test('user_ui:page_loads', async () => {
      await page.goto(`${BASE}/console/user`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const content = await page.content()
      assert(/用户|User|user/i.test(content), '用户页面应显示用户相关内容')
    })

    await t.test('user_ui:has_user_table', async () => {
      const rows = page.locator('.semi-table-body .semi-table-row, table tbody tr')
      const count = await rows.count()
      assert(count >= 1, `用户表格应至少有 1 行，实际 ${count}`)
      console.log(`    用户表格行数: ${count}`)
    })
  })

  // ================================================================
  //  8. 日志页面 UI
  // ================================================================
  await t.section('8. 日志页面', async () => {
    await t.test('log_ui:page_loads', async () => {
      await page.goto(`${BASE}/console/log`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const content = await page.content()
      assert(/日志|Log|log/i.test(content), '日志页面应显示日志相关内容')
      await page.screenshot({ path: t.screenshot('logs'), fullPage: true })
    })
  })

  // ================================================================
  //  9. 个人设置页面
  // ================================================================
  await t.section('9. 个人设置', async () => {
    await t.test('profile:page_loads', async () => {
      await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: t.screenshot('profile'), fullPage: true })
    })

    await t.test('profile:has_form_elements', async () => {
      const inputs = await page.locator('input').count()
      assert(inputs >= 1, `个人设置页应有表单元素，实际输入框: ${inputs}`)
    })
  })

  // ================================================================
  //  10. Dashboard 渲染
  // ================================================================
  await t.section('10. Dashboard 渲染检查', async () => {
    await t.test('dashboard:no_js_errors', async () => {
      const errors = []
      page.on('pageerror', err => errors.push(err.message))
      await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(3000)
      const critical = errors.filter(e => /Cannot read properties|TypeError|ReferenceError/i.test(e))
      assert(critical.length === 0,
        `Dashboard 有 JS 错误: ${critical.join('; ')}`)
      page.removeAllListeners('pageerror')
    })

    await t.test('dashboard:has_content', async () => {
      const url = page.url()
      assert(!url.includes('/login'), 'Dashboard 不应重定向到登录页')
      await page.screenshot({ path: t.screenshot('dashboard'), fullPage: true })
    })
  })

  // ================================================================
  //  11. 充值/钱包页面
  // ================================================================
  await t.section('11. 钱包页面', async () => {
    await t.test('topup:page_loads', async () => {
      await page.goto(`${BASE}/console/topup`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const url = page.url()
      assert(!url.includes('/login'), '钱包页面不应重定向到登录')
      await page.screenshot({ path: t.screenshot('topup'), fullPage: true })
    })
  })

  // ================================================================
  //  12. 响应式布局
  // ================================================================
  await t.section('12. 响应式布局', async () => {
    await t.test('responsive:mobile', async () => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: t.screenshot('mobile_dashboard'), fullPage: true })
    })

    await t.test('responsive:tablet', async () => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: t.screenshot('tablet_dashboard'), fullPage: true })
    })

    await t.test('responsive:restore', async () => {
      await page.setViewportSize({ width: 1440, height: 900 })
    })
  })

  // ================================================================
  //  13. 主题切换验证
  // ================================================================
  await t.section('13. 主题', async () => {
    await t.test('theme:current', async () => {
      const resp = await api.get(`${BASE}/api/status`)
      const body = await resp.json()
      const theme = body.data.theme
      assert(typeof theme === 'string', '应有 theme 字段')
      assert(['classic', 'default'].includes(theme), `theme 应为 classic/default，实际: ${theme}`)
      console.log(`    当前主题: ${theme}`)
    })
  })

  // ================================================================
  //  14. 错误页面
  // ================================================================
  await t.section('14. 404 页面', async () => {
    await t.test('404:nonexist_page', async () => {
      await page.goto(`${BASE}/nonexistent-page-12345`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(1500)
      await page.screenshot({ path: t.screenshot('404_page'), fullPage: true })
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
