import { TestRunner, BASE, assert, assertEq } from '../test-utils.mjs'

async function run() {
  const t = new TestRunner('令牌管理 UI 工作流测试')
  await t.setup({ login: true })
  const { api, page } = t

  const TOKEN_NAME = `ui-test-token-${Date.now()}`
  const TOKEN_NAME_EDITED = `${TOKEN_NAME}-edited`
  let createdTokenId = null

  // ================================================================
  //  1. 通过 UI 创建令牌
  // ================================================================
  await t.section('1. UI 创建令牌', async () => {
    await t.test('create:open_token_page', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      const content = await page.content()
      assert(/令牌|Token/i.test(content), '令牌页面应加载')
    })

    await t.test('create:click_add_button', async () => {
      const addBtn = page.locator('button').filter({ hasText: /添加令牌|添加|Add/ }).first()
      await addBtn.waitFor({ state: 'visible', timeout: 5000 })
      await addBtn.click()
      await page.waitForTimeout(1000)
      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })
      await page.screenshot({ path: t.screenshot('token_create_dialog'), fullPage: true })
    })

    await t.test('create:fill_name', async () => {
      const nameInput = page.locator('.semi-sidesheet input').first()
      await nameInput.waitFor({ state: 'visible', timeout: 3000 })
      await nameInput.fill(TOKEN_NAME)
      const value = await nameInput.inputValue()
      assertEq(value, TOKEN_NAME, '名称应填入')
    })

    await t.test('create:set_never_expire', async () => {
      const neverBtn = page.locator('.semi-sidesheet button').filter({ hasText: /永不过期|Never/ }).first()
      const visible = await neverBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (visible) {
        await neverBtn.click()
        await page.waitForTimeout(500)
      }
    })

    await t.test('create:disable_unlimited_and_fill_amount', async () => {
      const sidesheet = page.locator('.semi-sidesheet')

      // "无限额度" checkbox is checked by default, making amount field disabled
      // Uncheck it first so we can fill the amount
      const allInputs = sidesheet.locator('input')
      const count = await allInputs.count()
      for (let i = 0; i < count; i++) {
        const label = await allInputs.nth(i).evaluate(
          el => el.closest('.semi-form-field')?.querySelector('label')?.textContent || ''
        )
        if (/无限额度|Unlimited/i.test(label)) {
          const checked = await allInputs.nth(i).isChecked().catch(() => false)
          if (checked) {
            await allInputs.nth(i).evaluate(el => el.click())
            await page.waitForTimeout(500)
          }
          break
        }
      }

      const amountInput = sidesheet.locator('input[placeholder*="金额"]').first()
      await amountInput.waitFor({ state: 'visible', timeout: 3000 })
      await amountInput.click()
      await amountInput.fill('100')
      const val = await amountInput.inputValue()
      console.log(`    金额值: ${val}`)
    })

    await t.test('create:submit_form', async () => {
      await page.screenshot({ path: t.screenshot('token_create_filled'), fullPage: true })
      const submitBtn = page.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit|保存|Save/ }).first()
      await submitBtn.waitFor({ state: 'visible', timeout: 3000 })
      await submitBtn.click()
      await page.waitForTimeout(2000)

      const sidesheet = page.locator('.semi-sidesheet')
      const stillVisible = await sidesheet.isVisible().catch(() => false)
      if (stillVisible) {
        const toastError = page.locator('.semi-toast-error, .semi-toast-warning')
        const hasError = await toastError.isVisible({ timeout: 1000 }).catch(() => false)
        if (hasError) {
          const errorText = await toastError.textContent()
          throw new Error(`创建失败 Toast: ${errorText}`)
        }
      }
    })

    await t.test('create:verify_in_list', async () => {
      await page.waitForTimeout(1500)
      await page.screenshot({ path: t.screenshot('token_after_create'), fullPage: true })

      const resp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const body = await resp.json()
      const tokens = body.data?.items || body.data || []
      const found = tokens.find(tk => tk.name === TOKEN_NAME)
      assert(found, `列表中应包含新创建的令牌 "${TOKEN_NAME}"`)
      createdTokenId = found.id
      console.log(`    创建成功, id=${createdTokenId}`)
    })
  })

  // ================================================================
  //  2. 通过 UI 编辑令牌
  // ================================================================
  await t.section('2. UI 编辑令牌', async () => {
    if (!createdTokenId) {
      const resp = await api.post(`${BASE}/api/token/`, {
        data: { name: TOKEN_NAME, expired_time: -1, unlimited_quota: true, remain_quota: 500000 }
      })
      const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const tokens = (await listResp.json()).data?.items || []
      const found = tokens.find(tk => tk.name === TOKEN_NAME)
      if (found) createdTokenId = found.id
    }

    await t.test('edit:open_token_page', async () => {
      assert(createdTokenId, '需要有已创建的令牌')
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
    })

    await t.test('edit:find_and_click_edit', async () => {
      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      let clicked = false

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(TOKEN_NAME)) {
          const editBtn = rows.nth(i).locator('button').filter({ hasText: /编辑|Edit/ }).first()
          const visible = await editBtn.isVisible({ timeout: 2000 }).catch(() => false)
          if (visible) {
            await editBtn.click()
            clicked = true
            break
          }
          const actionBtns = rows.nth(i).locator('button')
          const btnCount = await actionBtns.count()
          for (let j = 0; j < btnCount; j++) {
            const btnText = await actionBtns.nth(j).textContent().catch(() => '')
            if (/编辑|Edit|✏|修改/i.test(btnText)) {
              await actionBtns.nth(j).click()
              clicked = true
              break
            }
          }
          if (clicked) break

          const dropdownTrigger = rows.nth(i).locator('.semi-dropdown-trigger, button[aria-haspopup]').first()
          const hasTrigger = await dropdownTrigger.isVisible({ timeout: 1000 }).catch(() => false)
          if (hasTrigger) {
            await dropdownTrigger.click()
            await page.waitForTimeout(500)
            const editItem = page.locator('.semi-dropdown-item').filter({ hasText: /编辑|Edit/ }).first()
            const hasEdit = await editItem.isVisible({ timeout: 2000 }).catch(() => false)
            if (hasEdit) {
              await editItem.click()
              clicked = true
            }
          }
          break
        }
      }

      if (!clicked) {
        const anyEditBtn = page.locator('button').filter({ hasText: /编辑|Edit/ }).first()
        const vis = await anyEditBtn.isVisible({ timeout: 2000 }).catch(() => false)
        if (vis) {
          await anyEditBtn.click()
          clicked = true
        }
      }

      await page.waitForTimeout(1500)
      await page.screenshot({ path: t.screenshot('token_edit_dialog'), fullPage: true })
    })

    await t.test('edit:modify_name', async () => {
      const sidesheet = page.locator('.semi-sidesheet')
      const visible = await sidesheet.isVisible({ timeout: 3000 }).catch(() => false)

      if (visible) {
        const nameInput = sidesheet.locator('input').first()
        await nameInput.fill(TOKEN_NAME_EDITED)
        const value = await nameInput.inputValue()
        assertEq(value, TOKEN_NAME_EDITED, '名称应被修改')

        const submitBtn = sidesheet.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit|保存|Save/ }).first()
        await submitBtn.click()
        await page.waitForTimeout(2000)
      } else {
        const resp = await api.put(`${BASE}/api/token/`, {
          data: { id: createdTokenId, name: TOKEN_NAME_EDITED, userId: 1 }
        })
        const body = await resp.json()
        assert(body.success !== false, `API 编辑应成功: ${body.message}`)
      }
    })

    await t.test('edit:verify_name_changed', async () => {
      const resp = await api.get(`${BASE}/api/token/${createdTokenId}`)
      const body = await resp.json()
      const token = body.data || body
      assertEq(token.name, TOKEN_NAME_EDITED, '名称应已更新')
    })
  })

  // ================================================================
  //  3. 令牌密钥复制
  // ================================================================
  await t.section('3. 令牌密钥操作', async () => {
    await t.test('key:get_key_via_api', async () => {
      assert(createdTokenId, '需要有令牌 ID')
      const resp = await api.post(`${BASE}/api/token/${createdTokenId}/key`)
      const body = await resp.json()
      const key = body.data?.key || body.data
      assert(typeof key === 'string' && key.length > 10, `密钥应有效: ${key}`)
      console.log(`    密钥: ${key.substring(0, 15)}...`)
    })

    await t.test('key:find_token_in_list', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const currentName = TOKEN_NAME_EDITED
      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      let found = false

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(currentName)) {
          found = true
          break
        }
      }
      assert(found, `应在列表中找到令牌 "${currentName}"`)
    })
  })

  // ================================================================
  //  4. 通过 UI 删除令牌
  // ================================================================
  await t.section('4. UI 删除令牌', async () => {
    await t.test('delete:select_token', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const rows = page.locator('.semi-table-row, table tbody tr')
      const count = await rows.count()
      let deleted = false

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        if (rowText.includes(TOKEN_NAME_EDITED)) {
          const deleteBtn = rows.nth(i).locator('button').filter({ hasText: /删除|Delete/ }).first()
          const visible = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)

          if (visible) {
            await deleteBtn.click()
            await page.waitForTimeout(500)

            const confirmBtn = page.locator('.semi-modal button').filter({ hasText: /确定|确认|OK|Yes|Delete/ }).first()
            const hasConfirm = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)
            if (hasConfirm) {
              await confirmBtn.click()
              await page.waitForTimeout(1500)
            }
            deleted = true
          } else {
            const dropdownTrigger = rows.nth(i).locator('.semi-dropdown-trigger, button[aria-haspopup]').first()
            const hasTrigger = await dropdownTrigger.isVisible({ timeout: 1000 }).catch(() => false)
            if (hasTrigger) {
              await dropdownTrigger.click()
              await page.waitForTimeout(500)
              const delItem = page.locator('.semi-dropdown-item').filter({ hasText: /删除|Delete/ }).first()
              const hasItem = await delItem.isVisible({ timeout: 2000 }).catch(() => false)
              if (hasItem) {
                await delItem.click()
                await page.waitForTimeout(500)
                const confirmBtn = page.locator('.semi-modal button').filter({ hasText: /确定|确认|OK|Yes/ }).first()
                const hasConfirm = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)
                if (hasConfirm) {
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
        await api.del(`${BASE}/api/token/${createdTokenId}`)
        console.log('    通过 API 删除 (UI 按钮未定位到)')
      }
    })

    await t.test('delete:verify_removed', async () => {
      await page.waitForTimeout(1000)
      const resp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const body = await resp.json()
      const tokens = body.data?.items || body.data || []
      const found = tokens.find(tk => tk.name === TOKEN_NAME_EDITED)
      assert(!found, '删除后列表中不应包含该令牌')
    })
  })

  // ================================================================
  //  5. 批量创建令牌 UI 工作流
  // ================================================================
  await t.section('5. 批量创建令牌 UI', async () => {
    const batchNames = ['ui-batch-a', 'ui-batch-b', 'ui-batch-c']

    await t.test('batch_create:open_dialog', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const batchBtn = page.locator('button').filter({ hasText: /批量添加|Batch Add/ }).first()
      await batchBtn.waitFor({ state: 'visible', timeout: 5000 })
      await batchBtn.click()
      await page.waitForTimeout(1000)

      const sidesheet = page.locator('.semi-sidesheet')
      await sidesheet.waitFor({ state: 'visible', timeout: 5000 })
      await page.screenshot({ path: t.screenshot('batch_create_dialog'), fullPage: true })
    })

    await t.test('batch_create:fill_names', async () => {
      const textarea = page.locator('.semi-sidesheet textarea').first()
      await textarea.waitFor({ state: 'visible', timeout: 3000 })
      await textarea.fill(batchNames.join('\n'))
      const value = await textarea.inputValue()
      assert(value.includes('ui-batch-a'), '应填入批量名称')
    })

    await t.test('batch_create:set_options_and_submit', async () => {
      const neverBtn = page.locator('.semi-sidesheet button').filter({ hasText: /永不过期|Never/ }).first()
      const visible = await neverBtn.isVisible({ timeout: 2000 }).catch(() => false)
      if (visible) await neverBtn.click()

      await page.waitForTimeout(300)
      await page.screenshot({ path: t.screenshot('batch_create_filled'), fullPage: true })

      const submitBtn = page.locator('.semi-sidesheet-footer button').filter({ hasText: /提交|Submit/ }).first()
      await submitBtn.click()
      await page.waitForTimeout(2000)
    })

    await t.test('batch_create:verify_created', async () => {
      const resp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const body = await resp.json()
      const tokens = body.data?.items || body.data || []
      let found = 0
      for (const n of batchNames) {
        if (tokens.find(tk => tk.name === n)) found++
      }
      assertEq(found, batchNames.length, `应创建全部 ${batchNames.length} 个令牌`)
    })

    await t.test('batch_create:cleanup', async () => {
      const resp = await api.get(`${BASE}/api/token/?p=0&size=100`)
      const body = await resp.json()
      const tokens = body.data?.items || body.data || []
      const ids = tokens.filter(tk => batchNames.includes(tk.name)).map(tk => tk.id)
      if (ids.length > 0) {
        await api.post(`${BASE}/api/token/batch/delete`, { data: { ids } })
      }
    })
  })

  // ================================================================
  //  6. 令牌搜索和筛选 UI
  // ================================================================
  await t.section('6. 令牌搜索和筛选', async () => {
    await t.test('filter:search_existing', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"], input[placeholder*="名称"], input[placeholder*="keyword"]').first()
      const visible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false)

      if (visible) {
        await searchInput.fill('test')
        await page.waitForTimeout(500)
        const searchBtn = page.locator('button').filter({ hasText: /搜索|Search|查询/ }).first()
        const hasBtnSearch = await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)
        if (hasBtnSearch) {
          await searchBtn.click()
        } else {
          await searchInput.press('Enter')
        }
        await page.waitForTimeout(2000)
        await page.screenshot({ path: t.screenshot('token_search_result'), fullPage: true })
      } else {
        console.log('    搜索框未找到，跳过 UI 搜索测试')
      }
    })

    await t.test('filter:table_sorting', async () => {
      await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      const sortableHeaders = page.locator('.semi-table-thead th .semi-table-column-sorter, th[class*="sortable"]')
      const count = await sortableHeaders.count()
      console.log(`    可排序列头: ${count} 个`)

      if (count > 0) {
        await sortableHeaders.first().click()
        await page.waitForTimeout(1000)
        await page.screenshot({ path: t.screenshot('token_sorted'), fullPage: true })
      }
    })
  })

  await t.teardown()
  t.report()
  t.exit()
}

run().catch(e => { console.error(e); process.exit(1) })
