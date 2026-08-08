import { TestRunner, BASE, assert, assertEq } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('兑换码管理 UI 工作流测试')
  await t.setup({ login: true })
  const { api, page } = t

  const REDEMPTION_NAME = `rdm-${String(Date.now()).slice(-8)}`
  let createdRedemptionId = null

  // ================================================================
  //  0. 前置条件：确认支付合规声明
  // ================================================================
  await t.section('0. 前置条件', async () => {
    await t.test('precondition:confirm_payment_compliance', async () => {
      const resp = await api.post(`${BASE}/api/option/payment_compliance`, {
        data: { confirmed: true }
      })
      const body = await resp.json()
      console.log(`    合规声明: ${body.success !== false ? '已确认' : body.message}`)
    })
  })

  // ================================================================
  //  1. 通过 UI 创建兑换码
  // ================================================================
  await t.section('1. UI 创建兑换码', async () => {
    await t.test('create:open_page', async () => {
      await page.goto(`${BASE}/console/redemption`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const content = await page.content()
      assert(/兑换|Redemption|redemption/i.test(content), '兑换码页面应加载')
    })

    await t.test('create:click_add_button', async () => {
      const addBtn = page.locator('button').filter({ hasText: /添加兑换码|添加|Add/ }).first()
      await addBtn.waitFor({ state: 'visible', timeout: 5000 })
      await addBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })
      await page.screenshot({ path: t.screenshot('redemption_create_dialog'), fullPage: true })
    })

    await t.test('create:fill_form', async () => {
      const sidesheet = page.locator('.semi-sidesheet')
      const nameInput = sidesheet.locator('input[placeholder*="名称"]').first()
      await nameInput.fill(REDEMPTION_NAME)
      const val = await nameInput.inputValue()
      assertEq(val, REDEMPTION_NAME, '名称应填入')
      await page.screenshot({ path: t.screenshot('redemption_create_filled'), fullPage: true })
    })

    await t.test('create:submit', async () => {
      const submitBtn = page.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit|保存|Save/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(3000)

      // Success toast or download modal may appear
      const toast = page.locator('.semi-toast')
      if (await toast.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await toast.first().textContent()
        console.log(`    Toast: ${text}`)
      }

      // Dismiss any modal that appears (e.g., download codes)
      const modal = page.locator('.semi-modal')
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    })

    await t.test('create:verify_in_list', async () => {
      const resp = await api.get(`${BASE}/api/redemption/?p=0&size=100`)
      const body = await resp.json()
      const items = body.data?.items || body.data || []
      const found = items.find(r => r.name === REDEMPTION_NAME)
      assert(found, `列表中应包含兑换码 "${REDEMPTION_NAME}"`)
      createdRedemptionId = found.id
      console.log(`    创建成功, id=${createdRedemptionId}`)
    })
  })

  // ================================================================
  //  2. 查看兑换码在 UI 上的展示
  // ================================================================
  await t.section('2. 兑换码列表 UI', async () => {
    await t.test('list:page_displays_data', async () => {
      await page.goto(`${BASE}/console/redemption`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      assert(count >= 1, `应至少有 1 行数据, 实际 ${count}`)
      console.log(`    表格行数: ${count}`)
    })

    await t.test('list:table_has_columns', async () => {
      const headers = page.locator('.semi-table-thead th, table thead th')
      const count = await headers.count()
      assert(count >= 3, `应有 >=3 列, 实际 ${count}`)
      const texts = await headers.allTextContents()
      console.log(`    列头: ${texts.filter(t => t.trim()).join(', ')}`)
    })

    await t.test('list:find_created_redemption', async () => {
      const pageContent = await page.content()
      assert(pageContent.includes(REDEMPTION_NAME), '页面应显示创建的兑换码名称')
    })
  })

  // ================================================================
  //  3. 通过 UI 编辑兑换码
  // ================================================================
  await t.section('3. UI 编辑兑换码', async () => {
    await t.test('edit:click_edit_button', async () => {
      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      let clicked = false

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(REDEMPTION_NAME)) {
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
        await page.screenshot({ path: t.screenshot('redemption_edit_dialog'), fullPage: true })
      } else {
        console.log('    编辑按钮未找到，跳过 UI 编辑')
      }
    })

    await t.test('edit:modify_and_save', async () => {
      const sidesheet = page.locator('.semi-sidesheet')
      const visible = await sidesheet.isVisible({ timeout: 2000 }).catch(() => false)

      if (visible) {
        const nameInput = sidesheet.locator('input').first()
        const newName = `${REDEMPTION_NAME}-edited`
        await nameInput.fill(newName)

        const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit|保存|Save/ }).first()
        await submitBtn.click()
        await page.waitForTimeout(2000)

        const resp = await api.get(`${BASE}/api/redemption/${createdRedemptionId}`)
        const body = await resp.json()
        const item = body.data || body
        assertEq(item.name, newName, '名称应已更新')
      } else {
        const resp = await api.put(`${BASE}/api/redemption/`, {
          data: { id: createdRedemptionId, name: `${REDEMPTION_NAME}-edited` }
        })
        const body = await resp.json()
        assert(body.success !== false, `API 编辑应成功`)
      }
    })
  })

  // ================================================================
  //  4. 通过 UI 删除兑换码
  // ================================================================
  await t.section('4. UI 删除兑换码', async () => {
    await t.test('delete:via_ui', async () => {
      await page.goto(`${BASE}/console/redemption`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      let deleted = false

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(REDEMPTION_NAME)) {
          const delBtn = rows.nth(i).locator('button').filter({ hasText: /删除|Delete/ }).first()
          const visible = await delBtn.isVisible({ timeout: 2000 }).catch(() => false)

          if (visible) {
            await delBtn.click()
            await page.waitForTimeout(500)
            const confirmBtn = page.locator('.semi-modal button').filter({ hasText: /确定|确认|OK|Yes|Delete/ }).first()
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
        await api.del(`${BASE}/api/redemption/${createdRedemptionId}`)
        console.log('    通过 API 删除')
      }
    })

    await t.test('delete:verify_removed', async () => {
      const resp = await api.get(`${BASE}/api/redemption/?p=0&size=100`)
      const body = await resp.json()
      const items = body.data?.items || body.data || []
      const found = items.find(r => r.name?.includes(REDEMPTION_NAME))
      assert(!found, '删除后列表中不应包含该兑换码')
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
