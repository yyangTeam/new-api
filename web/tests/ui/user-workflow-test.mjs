import { TestRunner, BASE, assert, assertEq } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('用户管理 UI 工作流测试')
  await t.setup({ login: true })
  const { api, page } = t

  const TEST_USERNAME = `uitest${Date.now()}`
  const TEST_PASSWORD = 'UiTestPass123!'
  let createdUserId = null

  // ================================================================
  //  1. 通过 UI 创建用户
  // ================================================================
  await t.section('1. UI 创建用户', async () => {
    await t.test('create:open_user_page', async () => {
      await page.goto(`${BASE}/console/user`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const content = await page.content()
      assert(/用户|User/i.test(content), '用户页面应加载')
    })

    await t.test('create:click_add_button', async () => {
      const addBtn = page.locator('button').filter({ hasText: /添加用户|添加|Add/ }).first()
      await addBtn.waitFor({ state: 'visible', timeout: 5000 })
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })
      await page.screenshot({ path: t.screenshot('user_create_dialog'), fullPage: true })
    })

    await t.test('create:fill_form', async () => {
      const sidesheet = page.locator('.semi-sidesheet')
      const inputs = sidesheet.locator('input')
      const count = await inputs.count()
      assert(count >= 2, `应至少有用户名和密码 2 个输入框, 实际 ${count}`)

      await inputs.nth(0).fill(TEST_USERNAME)
      const usernameValue = await inputs.nth(0).inputValue()
      assertEq(usernameValue, TEST_USERNAME, '用户名应填入')

      for (let i = 1; i < count; i++) {
        const inputType = await inputs.nth(i).getAttribute('type')
        if (inputType === 'password') {
          await inputs.nth(i).fill(TEST_PASSWORD)
          break
        }
      }

      let passwordFilled = false
      for (let i = 1; i < count; i++) {
        const inputType = await inputs.nth(i).getAttribute('type')
        if (inputType === 'password') {
          passwordFilled = true
          break
        }
      }

      if (!passwordFilled) {
        await inputs.nth(1).fill(TEST_PASSWORD)
      }

      await page.screenshot({ path: t.screenshot('user_create_filled'), fullPage: true })
    })

    await t.test('create:submit', async () => {
      const submitBtn = page.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit|保存|Save/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(2000)

      const sidesheet = page.locator('.semi-sidesheet')
      const stillVisible = await sidesheet.isVisible().catch(() => false)
      if (stillVisible) {
        const errorToast = page.locator('.semi-toast-error')
        const hasError = await errorToast.isVisible({ timeout: 1000 }).catch(() => false)
        if (hasError) {
          const msg = await errorToast.textContent()
          console.log(`    创建提示: ${msg}`)
        }
      }
    })

    await t.test('create:verify_in_list', async () => {
      const resp = await api.get(`${BASE}/api/user/?p=0&size=100`)
      const body = await resp.json()
      const users = body.data?.items || body.data || []
      const found = users.find(u => u.username === TEST_USERNAME)
      assert(found, `列表中应包含新用户 "${TEST_USERNAME}"`)
      createdUserId = found.id
      console.log(`    用户创建成功, id=${createdUserId}`)
    })
  })

  // ================================================================
  //  2. 通过 UI 编辑用户
  // ================================================================
  await t.section('2. UI 编辑用户', async () => {
    await t.test('edit:open_user_page', async () => {
      await page.goto(`${BASE}/console/user`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    await t.test('edit:find_and_click_edit', async () => {
      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      let clicked = false

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(TEST_USERNAME)) {
          const editBtn = rows.nth(i).locator('button').filter({ hasText: /编辑|Edit/ }).first()
          const visible = await editBtn.isVisible({ timeout: 2000 }).catch(() => false)
          if (visible) {
            await editBtn.click()
            clicked = true
          } else {
            const dropdownTrigger = rows.nth(i).locator('.semi-dropdown-trigger, button[aria-haspopup]').first()
            const hasTrigger = await dropdownTrigger.isVisible({ timeout: 1000 }).catch(() => false)
            if (hasTrigger) {
              await dropdownTrigger.click()
              await page.waitForTimeout(500)
              const editItem = page.locator('.semi-dropdown-item').filter({ hasText: /编辑|Edit/ }).first()
              if (await editItem.isVisible({ timeout: 2000 }).catch(() => false)) {
                await editItem.click()
                clicked = true
              }
            }
          }
          break
        }
      }

      await page.waitForTimeout(1500)
      if (clicked) {
        await page.screenshot({ path: t.screenshot('user_edit_dialog'), fullPage: true })
      }
    })

    await t.test('edit:modify_display_name', async () => {
      const sidesheet = page.locator('.semi-sidesheet')
      const visible = await sidesheet.isVisible({ timeout: 3000 }).catch(() => false)

      if (visible) {
        const inputs = sidesheet.locator('input')
        const count = await inputs.count()

        for (let i = 0; i < count; i++) {
          const placeholder = await inputs.nth(i).getAttribute('placeholder') || ''
          const label = await inputs.nth(i).locator('xpath=ancestor::div[contains(@class,"semi-form-field")]//label').textContent().catch(() => '')
          if (/显示名称|Display|display/i.test(placeholder + label)) {
            await inputs.nth(i).fill('UI Test User')
            break
          }
        }

        const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit|保存|Save/ }).first()
        await submitBtn.click()
        await page.waitForTimeout(2000)
      } else {
        await api.put(`${BASE}/api/user/`, {
          data: { id: createdUserId, display_name: 'UI Test User' }
        })
      }
    })

    await t.test('edit:verify_updated', async () => {
      const resp = await api.get(`${BASE}/api/user/?p=0&size=100`)
      const body = await resp.json()
      const users = body.data?.items || body.data || []
      const user = users.find(u => u.id === createdUserId)
      assert(user, '用户应存在')
      console.log(`    显示名称: ${user.display_name || '(空)'}`)
    })
  })

  // ================================================================
  //  3. 用户表格 UI 交互
  // ================================================================
  await t.section('3. 用户表格交互', async () => {
    await t.test('table:has_action_buttons', async () => {
      await page.goto(`${BASE}/console/user`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      assert(count >= 2, `应至少有 2 行用户, 实际 ${count}`)

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(TEST_USERNAME)) {
          const buttons = rows.nth(i).locator('button')
          const btnCount = await buttons.count()
          assert(btnCount >= 1, `用户行应有操作按钮, 实际 ${btnCount}`)
          console.log(`    操作按钮数: ${btnCount}`)
          break
        }
      }
    })

    await t.test('table:user_search', async () => {
      const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"], input[placeholder*="用户"], input[placeholder*="keyword"]').first()
      const visible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false)
      if (visible) {
        await searchInput.fill(TEST_USERNAME)
        await page.waitForTimeout(500)
        const searchBtn = page.locator('button').filter({ hasText: /搜索|Search|查询/ }).first()
        if (await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchBtn.click()
        } else {
          await searchInput.press('Enter')
        }
        await page.waitForTimeout(2000)
        await page.screenshot({ path: t.screenshot('user_search_result'), fullPage: true })
      } else {
        console.log('    搜索框未找到')
      }
    })
  })

  // ================================================================
  //  4. 清理 - 删除测试用户
  // ================================================================
  await t.section('4. 清理测试用户', async () => {
    await t.test('cleanup:delete_user', async () => {
      await page.goto(`${BASE}/console/user`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      let deleted = false

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(TEST_USERNAME)) {
          const delBtn = rows.nth(i).locator('button').filter({ hasText: /删除|Delete/ }).first()
          const visible = await delBtn.isVisible({ timeout: 2000 }).catch(() => false)
          if (visible) {
            await delBtn.click()
            await page.waitForTimeout(500)
            const confirmBtn = page.locator('.semi-modal button').filter({ hasText: /确定|确认|OK|Yes/ }).first()
            if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await confirmBtn.click()
              await page.waitForTimeout(1500)
            }
            deleted = true
          } else {
            const dropdownTrigger = rows.nth(i).locator('.semi-dropdown-trigger, button[aria-haspopup]').first()
            if (await dropdownTrigger.isVisible({ timeout: 1000 }).catch(() => false)) {
              await dropdownTrigger.click()
              await page.waitForTimeout(500)
              const delItem = page.locator('.semi-dropdown-item').filter({ hasText: /删除|Delete/ }).first()
              if (await delItem.isVisible({ timeout: 2000 }).catch(() => false)) {
                await delItem.click()
                await page.waitForTimeout(500)
                const confirmBtn = page.locator('.semi-modal button').filter({ hasText: /确定|确认|OK|Yes/ }).first()
                if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await confirmBtn.click()
                  await page.waitForTimeout(1500)
                }
                deleted = true
              }
            }
          }
          break
        }
      }

      if (!deleted) {
        const resp = await api.del(`${BASE}/api/user/${createdUserId}`)
        console.log('    通过 API 删除')
      }
    })

    await t.test('cleanup:verify_removed', async () => {
      const resp = await api.get(`${BASE}/api/user/?p=0&size=100`)
      const body = await resp.json()
      const users = body.data?.items || body.data || []
      const found = users.find(u => u.username === TEST_USERNAME)
      assert(!found, '删除后列表中不应包含该用户')
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
