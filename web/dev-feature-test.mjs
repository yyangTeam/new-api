import { chromium } from 'playwright'

const BASE = 'http://localhost:13000'
const DIR = '/home/admin/tmp_file'
const USER = 'qqqqqqq1'
const PASS = 'test123456'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const results = []
  let screenshotIdx = 0

  function nextScreenshot(name) {
    screenshotIdx++
    return `${DIR}/dev_${String(screenshotIdx).padStart(2, '0')}_${name}.png`
  }

  async function test(name, fn) {
    try {
      await fn()
      results.push({ name, status: 'PASS' })
      console.log(`  PASS  ${name}`)
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.message.split('\n')[0] })
      console.log(`  FAIL  ${name} — ${e.message.split('\n')[0]}`)
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg)
  }

  // ── Login ──
  const page = await context.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(500)
  const loginInputs = await page.locator('input').all()
  await loginInputs[0].fill(USER)
  await loginInputs[1].fill(PASS)
  const submitBtn = page.locator('button[type="submit"]').first()
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click()
  } else {
    const btns = page.locator('button')
    const count = await btns.count()
    for (let i = 0; i < count; i++) {
      const text = await btns.nth(i).textContent()
      if (text && /登录|Login|Continue|Sign in/i.test(text)) {
        await btns.nth(i).click()
        break
      }
    }
  }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${DIR}/dev_00_login.png`, fullPage: true })
  console.log('Logged in, starting tests...\n')

  const H = { 'New-Api-User': '1' }
  const api = {
    post: (url, opts) => page.request.post(url, { ...opts, headers: { ...H, ...opts?.headers } }),
    put: (url, opts) => page.request.put(url, { ...opts, headers: { ...H, ...opts?.headers } }),
    get: (url) => page.request.get(url, { headers: H }),
    del: (url) => page.request.delete(url, { headers: H }),
  }

  // ================================================================
  //  SECTION 1: Batch Token Create — API tests
  // ================================================================
  console.log('── 1. Batch Token Create (API) ──')

  await test('api:batch_create:3_tokens', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: {
        names: ['e2e-batch-1', 'e2e-batch-2', 'e2e-batch-3'],
        expired_time: -1,
        unlimited_quota: true,
      }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${JSON.stringify(body)}`)
    assert(body.data.created === 3, `Expected 3 created, got ${body.data.created}`)
    assert(body.data.failed === 0, `Expected 0 failed, got ${body.data.failed}`)
    assert(body.data.items.length === 3, `Expected 3 items, got ${body.data.items.length}`)
    for (const item of body.data.items) {
      assert(item.status === 'created', `Item ${item.name} has status ${item.status}`)
    }
  })

  await test('api:batch_create:with_quota', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: {
        names: ['e2e-quota-1', 'e2e-quota-2'],
        expired_time: -1,
        unlimited_quota: false,
        remain_quota: 500000,
      }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${JSON.stringify(body)}`)
    assert(body.data.created === 2, `Expected 2 created, got ${body.data.created}`)
  })

  await test('api:batch_create:with_model_limits', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: {
        names: ['e2e-model-1'],
        expired_time: -1,
        unlimited_quota: true,
        model_limits_enabled: true,
        model_limits: 'gpt-4,gpt-3.5-turbo',
      }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${JSON.stringify(body)}`)
    assert(body.data.created === 1, `Expected 1 created`)
    // Verify token has model limits set
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    const token = tokens.find(t => t.name === 'e2e-model-1')
    assert(token, 'Token e2e-model-1 not found in list')
    assert(token.model_limits_enabled === true, 'model_limits_enabled not set')
    assert(token.model_limits === 'gpt-4,gpt-3.5-turbo', `model_limits wrong: ${token.model_limits}`)
  })

  await test('api:batch_create:with_ip_whitelist', async () => {
    const allowIps = '192.168.1.0/24\n10.0.0.1'
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: {
        names: ['e2e-ip-1'],
        expired_time: -1,
        unlimited_quota: true,
        allow_ips: allowIps,
      }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${JSON.stringify(body)}`)
    // Verify IP whitelist persisted
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    const token = tokens.find(t => t.name === 'e2e-ip-1')
    assert(token, 'Token e2e-ip-1 not found')
    assert(token.allow_ips === allowIps, `allow_ips wrong: ${token.allow_ips}`)
  })

  await test('api:batch_create:with_expiry', async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 86400 * 30
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: {
        names: ['e2e-expire-1'],
        expired_time: futureTime,
        unlimited_quota: true,
      }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${JSON.stringify(body)}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    const token = tokens.find(t => t.name === 'e2e-expire-1')
    assert(token, 'Token not found')
    assert(token.expired_time === futureTime, `expired_time wrong: ${token.expired_time} vs ${futureTime}`)
  })

  await test('api:batch_create:with_cross_group_retry', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: {
        names: ['e2e-cgr-1'],
        expired_time: -1,
        unlimited_quota: true,
        cross_group_retry: true,
      }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${JSON.stringify(body)}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    const token = tokens.find(t => t.name === 'e2e-cgr-1')
    assert(token, 'Token not found')
    assert(token.cross_group_retry === true, `cross_group_retry not set`)
  })

  await test('api:batch_create:reject_empty_names', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names: [], expired_time: -1, unlimited_quota: true }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject empty names')
    assert(/between 1 and/.test(body.message), `Wrong error: ${body.message}`)
  })

  await test('api:batch_create:reject_duplicate_names', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names: ['dup-test', 'dup-test'], expired_time: -1, unlimited_quota: true }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject duplicates')
    assert(/duplicate/i.test(body.message), `Wrong error: ${body.message}`)
  })

  await test('api:batch_create:reject_over_50', async () => {
    const names = Array.from({ length: 51 }, (_, i) => `overflow-${i}`)
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names, expired_time: -1, unlimited_quota: true }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject >50')
    assert(/exceed|cannot exceed/.test(body.message), `Wrong error: ${body.message}`)
  })

  await test('api:batch_create:reject_name_too_long', async () => {
    const longName = 'a'.repeat(51)
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names: [longName], expired_time: -1, unlimited_quota: true }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject name > 50 chars')
    assert(/exceed.*characters/i.test(body.message), `Wrong error: ${body.message}`)
  })

  await test('api:batch_create:reject_negative_quota', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names: ['neg-q'], expired_time: -1, unlimited_quota: false, remain_quota: -100 }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject negative quota')
    assert(/negative/i.test(body.message), `Wrong error: ${body.message}`)
  })

  await test('api:batch_create:trims_whitespace', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names: ['  e2e-trim  ', ' e2e-trim2 '], expired_time: -1, unlimited_quota: true }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    assert(body.data.items[0].name === 'e2e-trim', `Name not trimmed: ${body.data.items[0].name}`)
    assert(body.data.items[1].name === 'e2e-trim2', `Name not trimmed: ${body.data.items[1].name}`)
  })

  await test('api:batch_create:reject_empty_name_in_list', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names: ['valid', '  ', 'also-valid'], expired_time: -1, unlimited_quota: true }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject empty name after trim')
    assert(/empty/i.test(body.message), `Wrong error: ${body.message}`)
  })

  // ================================================================
  //  SECTION 2: Batch Token Edit — API tests
  // ================================================================
  console.log('\n── 2. Batch Token Edit (API) ──')

  let testTokenIds = []
  await test('api:batch_edit:collect_ids', async () => {
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    testTokenIds = tokens
      .filter(t => /^e2e-/.test(t.name))
      .map(t => t.id)
    assert(testTokenIds.length >= 3, `Need >=3 test tokens, got ${testTokenIds.length}`)
    console.log(`    Found ${testTokenIds.length} test tokens`)
  })

  await test('api:batch_edit:update_group', async () => {
    const ids = testTokenIds.slice(0, 2)
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, group: 'test-group' }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    for (const id of ids) {
      const t = tokens.find(tok => tok.id === id)
      assert(t, `Token id=${id} not found`)
      assert(t.group === 'test-group', `Token ${t.name} group=${t.group}, expected test-group`)
    }
  })

  await test('api:batch_edit:update_expiry', async () => {
    const ids = testTokenIds.slice(0, 2)
    const futureTime = Math.floor(Date.now() / 1000) + 86400 * 60
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, expired_time: futureTime }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    for (const id of ids) {
      const t = tokens.find(tok => tok.id === id)
      assert(t.expired_time === futureTime, `Token ${t.name} expired_time=${t.expired_time}`)
    }
  })

  await test('api:batch_edit:update_model_limits', async () => {
    const ids = testTokenIds.slice(0, 2)
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, model_limits: 'gpt-4o,claude-3-opus' }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    for (const id of ids) {
      const t = tokens.find(tok => tok.id === id)
      assert(t.model_limits_enabled === true, `model_limits_enabled should be true for ${t.name}`)
      assert(t.model_limits === 'gpt-4o,claude-3-opus', `model_limits wrong for ${t.name}: ${t.model_limits}`)
    }
  })

  await test('api:batch_edit:clear_model_limits', async () => {
    const ids = testTokenIds.slice(0, 2)
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, model_limits: '' }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    for (const id of ids) {
      const t = tokens.find(tok => tok.id === id)
      assert(t.model_limits_enabled === false, `model_limits_enabled should be false for ${t.name}`)
    }
  })

  await test('api:batch_edit:update_unlimited_quota', async () => {
    const ids = testTokenIds.slice(0, 2)
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, unlimited_quota: false, remain_quota: 100000 }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    for (const id of ids) {
      const t = tokens.find(tok => tok.id === id)
      assert(t.unlimited_quota === false, `unlimited_quota should be false for ${t.name}`)
      assert(t.remain_quota === 100000, `remain_quota wrong for ${t.name}: ${t.remain_quota}`)
    }
  })

  await test('api:batch_edit:update_cross_group_retry', async () => {
    const ids = testTokenIds.slice(0, 2)
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, cross_group_retry: true }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    for (const id of ids) {
      const t = tokens.find(tok => tok.id === id)
      assert(t.cross_group_retry === true, `cross_group_retry should be true for ${t.name}`)
    }
  })

  await test('api:batch_edit:update_allow_ips', async () => {
    const ids = testTokenIds.slice(0, 2)
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, allow_ips: '10.0.0.0/8' }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    for (const id of ids) {
      const t = tokens.find(tok => tok.id === id)
      assert(t.allow_ips === '10.0.0.0/8', `allow_ips wrong for ${t.name}: ${t.allow_ips}`)
    }
  })

  await test('api:batch_edit:reject_empty_ids', async () => {
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids: [], group: 'x' }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject empty ids')
  })

  await test('api:batch_edit:reject_over_100_ids', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1)
    const resp = await api.put(`${BASE}/api/token/batch`, {
      data: { ids, group: 'x' }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject >100 ids')
  })

  // ================================================================
  //  SECTION 3: Batch Token Keys (批量获取密钥)
  // ================================================================
  console.log('\n── 3. Batch Token Keys (API) ──')

  await test('api:batch_keys:get_keys', async () => {
    const ids = testTokenIds.slice(0, 2)
    const resp = await api.post(`${BASE}/api/token/batch/keys`, {
      data: { ids }
    })
    const body = await resp.json()
    assert(body.success !== false, `API failed: ${body.message}`)
    assert(body.data.keys, 'No keys in response')
    const keyCount = Object.keys(body.data.keys).length
    assert(keyCount === 2, `Expected 2 keys, got ${keyCount}`)
    for (const [id, key] of Object.entries(body.data.keys)) {
      assert(typeof key === 'string' && key.length > 0, `Key for ${id} is empty`)
    }
  })

  await test('api:batch_keys:reject_empty', async () => {
    const resp = await api.post(`${BASE}/api/token/batch/keys`, {
      data: { ids: [] }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject empty ids')
  })

  await test('api:batch_keys:reject_over_100', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1)
    const resp = await api.post(`${BASE}/api/token/batch/keys`, {
      data: { ids }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject >100 ids')
  })

  // ================================================================
  //  SECTION 4: Batch Token Delete (批量删除)
  // ================================================================
  console.log('\n── 4. Batch Token Delete (API) ──')

  await test('api:batch_delete:reject_empty', async () => {
    const resp = await api.post(`${BASE}/api/token/batch`, {
      data: { ids: [] }
    })
    const body = await resp.json()
    assert(body.success === false, 'Should reject empty ids')
  })

  await test('api:batch_delete:works', async () => {
    // Create 2 tokens, then delete them in batch
    const createResp = await api.post(`${BASE}/api/token/batch/create`, {
      data: { names: ['e2e-del-1', 'e2e-del-2'], expired_time: -1, unlimited_quota: true }
    })
    const createBody = await createResp.json()
    assert(createBody.success !== false, `Create failed: ${createBody.message}`)
    // Get IDs
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    const delIds = tokens.filter(t => t.name === 'e2e-del-1' || t.name === 'e2e-del-2').map(t => t.id)
    assert(delIds.length === 2, `Expected 2 tokens to delete, got ${delIds.length}`)
    // Delete
    const resp = await api.post(`${BASE}/api/token/batch`, {
      data: { ids: delIds }
    })
    const body = await resp.json()
    assert(body.success !== false, `Delete failed: ${body.message}`)
    assert(body.data === 2, `Expected 2 deleted, got ${body.data}`)
    // Verify gone
    const listResp2 = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens2 = (await listResp2.json()).data?.items || []
    assert(!tokens2.find(t => t.name === 'e2e-del-1'), 'e2e-del-1 still exists')
    assert(!tokens2.find(t => t.name === 'e2e-del-2'), 'e2e-del-2 still exists')
  })

  // ================================================================
  //  SECTION 5: Batch Token Create — UI tests
  // ================================================================
  console.log('\n── 5. Batch Token Create (UI) ──')

  await test('ui:batch_create:open_dialog', async () => {
    await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: nextScreenshot('token_list_before'), fullPage: true })
    const btn = page.locator('button:has-text("批量添加")').first()
    assert(await btn.isVisible(), 'Batch add button not visible')
    await btn.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: nextScreenshot('batch_create_dialog'), fullPage: true })
    const content = await page.content()
    assert(/批量添加/.test(content), 'SideSheet not opened')
  })

  await test('ui:batch_create:fill_and_submit', async () => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('e2e-ui-token-1, e2e-ui-token-2, e2e-ui-token-3')
    await page.waitForTimeout(300)
    const neverExpire = page.locator('button:has-text("永不过期"), button:has-text("Never expires")').first()
    if (await neverExpire.isVisible({ timeout: 2000 }).catch(() => false)) {
      await neverExpire.click()
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: nextScreenshot('batch_create_filled'), fullPage: true })
    // SideSheet footer submit button
    const submitBtn = page.locator('.semi-sidesheet-footer button:has-text("提交"), .semi-sidesheet-footer button:has-text("Submit")').first()
    await submitBtn.click({ timeout: 10000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: nextScreenshot('batch_create_submitted'), fullPage: true })
  })

  await test('ui:batch_create:verify_in_list', async () => {
    await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    const content = await page.content()
    await page.screenshot({ path: nextScreenshot('batch_create_verify_list'), fullPage: true })
    assert(content.includes('e2e-ui-token-1'), 'e2e-ui-token-1 not found in list')
    assert(content.includes('e2e-ui-token-2'), 'e2e-ui-token-2 not found in list')
    assert(content.includes('e2e-ui-token-3'), 'e2e-ui-token-3 not found in list')
  })

  // ================================================================
  //  SECTION 6: Batch Token Edit — UI tests
  // ================================================================
  console.log('\n── 6. Batch Token Edit (UI) ──')

  await test('ui:batch_edit:no_selection_warning', async () => {
    await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    const editBtn = page.locator('button:has-text("批量编辑")').first()
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: nextScreenshot('batch_edit_no_selection'), fullPage: true })
    }
  })

  await test('ui:batch_edit:select_and_open', async () => {
    await page.goto(`${BASE}/console/token`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    const checkboxes = page.locator('.semi-checkbox-inner-display')
    const count = await checkboxes.count()
    assert(count >= 3, `Expected >=3 checkboxes, got ${count}`)
    await checkboxes.nth(1).click({ force: true })
    await page.waitForTimeout(200)
    await checkboxes.nth(2).click({ force: true })
    await page.waitForTimeout(500)
    await page.screenshot({ path: nextScreenshot('batch_edit_selected'), fullPage: true })

    const editBtn = page.locator('button:has-text("批量编辑")').first()
    assert(await editBtn.isVisible(), 'Batch edit button not visible')
    await editBtn.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: nextScreenshot('batch_edit_dialog'), fullPage: true })
    const content = await page.content()
    assert(/批量编辑|过期时间|额度/.test(content), 'Batch edit dialog not opened')
  })

  await test('ui:batch_edit:close_dialog', async () => {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  // ================================================================
  //  SECTION 7: Image Generation Settings
  // ================================================================
  console.log('\n── 7. Image Generation ──')

  const originalStatus = await (await api.get(`${BASE}/api/status`)).json()
  const originalImageUrl = originalStatus.data.image_generation_url || ''
  const originalImageMode = originalStatus.data.image_generation_open_mode || 'embed'
  const TEST_IMAGE_URL = 'https://test.example.com/image-gen-e2e'

  await test('imagegen:settings_tab', async () => {
    await page.goto(`${BASE}/console/setting`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    const tab = page.locator('.semi-tabs-tab:has-text("生图设置")').first()
    assert(await tab.isVisible({ timeout: 3000 }).catch(() => false), 'Image gen settings tab not found')
    await tab.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: nextScreenshot('imagegen_settings'), fullPage: true })
  })

  await test('imagegen:api_set_embed_url', async () => {
    let resp = await api.put(`${BASE}/api/option/`, {
      data: { key: 'ImageGenerationUrl', value: TEST_IMAGE_URL }
    })
    let body = await resp.json()
    assert(body.success !== false, `Set URL failed: ${body.message}`)
    resp = await api.put(`${BASE}/api/option/`, {
      data: { key: 'ImageGenerationOpenMode', value: 'embed' }
    })
    body = await resp.json()
    assert(body.success !== false, `Set mode failed: ${body.message}`)
  })

  await test('imagegen:api_status_reflects_settings', async () => {
    const resp = await api.get(`${BASE}/api/status`)
    const body = await resp.json()
    assert(body.data.image_generation_url === TEST_IMAGE_URL,
      `URL expected "${TEST_IMAGE_URL}", got "${body.data.image_generation_url}"`)
    assert(body.data.image_generation_open_mode === 'embed',
      `Mode expected "embed", got "${body.data.image_generation_open_mode}"`)
  })

  await test('imagegen:sidebar_visible', async () => {
    await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: nextScreenshot('imagegen_sidebar_visible'), fullPage: true })
    const navItems = await page.locator('.semi-navigation-item-text').allTextContents()
    const hasImageGen = navItems.some(t => t === '生图')
    assert(hasImageGen, `Sidebar should show image gen entry. Items: ${navItems.join(', ')}`)
  })

  await test('imagegen:embed_page', async () => {
    const navItem = page.locator('.semi-navigation-item-text').filter({ hasText: '生图' }).first()
    await navItem.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: nextScreenshot('imagegen_embed_page'), fullPage: true })
    const iframe = page.locator('iframe')
    const iframeCount = await iframe.count()
    assert(iframeCount > 0, 'No iframe found on image-gen page in embed mode')
    const src = await iframe.first().getAttribute('src')
    assert(src === TEST_IMAGE_URL, `iframe src="${src}", expected "${TEST_IMAGE_URL}"`)
  })

  await test('imagegen:switch_to_new_tab', async () => {
    const resp = await api.put(`${BASE}/api/option/`, {
      data: { key: 'ImageGenerationOpenMode', value: 'new_tab' }
    })
    const body = await resp.json()
    assert(body.success !== false, `Set mode failed: ${body.message}`)
    const status = await (await api.get(`${BASE}/api/status`)).json()
    assert(status.data.image_generation_open_mode === 'new_tab',
      `Mode expected "new_tab", got "${status.data.image_generation_open_mode}"`)
  })

  await test('imagegen:new_tab_page', async () => {
    await page.goto(`${BASE}/console/image-gen`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: nextScreenshot('imagegen_new_tab_page'), fullPage: true })
    const iframe = page.locator('iframe')
    const iframeCount = await iframe.count()
    const content = await page.content()
    const hasRedirectOrButton = /打开|open|redirect|new.*tab/i.test(content) || iframeCount === 0
    assert(hasRedirectOrButton, 'New tab mode should redirect or show open button, not embed')
  })

  await test('imagegen:clear_url_hides_sidebar', async () => {
    await api.put(`${BASE}/api/option/`, {
      data: { key: 'ImageGenerationUrl', value: '' }
    })
    await page.waitForTimeout(500)
    await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: nextScreenshot('imagegen_sidebar_hidden'), fullPage: true })
    const navItems = await page.locator('.semi-navigation-item-text').allTextContents()
    const hasImageGen = navItems.some(t => t === '生图')
    assert(!hasImageGen, `Sidebar should hide image gen entry when URL is empty. Items: ${navItems.join(', ')}`)
  })

  await test('imagegen:set_url_shows_sidebar_again', async () => {
    await api.put(`${BASE}/api/option/`, {
      data: { key: 'ImageGenerationUrl', value: TEST_IMAGE_URL }
    })
    await page.waitForTimeout(500)
    await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    const navItems = await page.locator('.semi-navigation-item-text').allTextContents()
    const hasImageGen = navItems.some(t => t === '生图')
    assert(hasImageGen, `Sidebar should show image gen entry after restoring URL`)
  })

  // ================================================================
  //  SECTION 8: Theme Settings UI
  // ================================================================
  console.log('\n── 8. Theme Settings ──')

  await test('theme:api_check', async () => {
    const resp = await api.get(`${BASE}/api/status`)
    const body = await resp.json()
    assert(typeof body.data.theme === 'string', 'theme field not found')
    console.log(`    Current theme: ${body.data.theme}`)
  })

  await test('theme:settings_other_tab', async () => {
    await page.goto(`${BASE}/console/setting`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000)
    const tabs = await page.locator('.semi-tabs-tab').all()
    let found = false
    for (const tab of tabs) {
      const text = await tab.textContent()
      if (/其他|Other/i.test(text)) {
        await tab.click()
        await page.waitForTimeout(1500)
        found = true
        break
      }
    }
    await page.screenshot({ path: nextScreenshot('theme_settings'), fullPage: true })
    assert(found, 'Other settings tab not found')
  })

  // ================================================================
  //  SECTION 9: Dashboard renders without crash
  // ================================================================
  console.log('\n── 9. Dashboard ──')

  await test('dashboard:renders_without_crash', async () => {
    const errors = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: nextScreenshot('dashboard'), fullPage: true })
    const criticalErrors = errors.filter(e => /createCanvas|vrender|Cannot read properties/i.test(e))
    assert(criticalErrors.length === 0,
      `Dashboard has critical rendering errors: ${criticalErrors.join('; ')}`)
    page.removeAllListeners('pageerror')
  })

  // ================================================================
  //  Cleanup
  // ================================================================
  console.log('\n── Cleanup ──')

  await test('cleanup:delete_test_tokens', async () => {
    const listResp = await api.get(`${BASE}/api/token/?p=0&size=100`)
    const tokens = (await listResp.json()).data?.items || []
    const testTokens = tokens.filter(t => /^e2e-/.test(t.name))
    let deleted = 0
    for (const t of testTokens) {
      const resp = await api.del(`${BASE}/api/token/${t.id}`)
      const body = await resp.json()
      if (body.success !== false) deleted++
    }
    console.log(`    Deleted ${deleted}/${testTokens.length} test tokens`)
  })

  await test('cleanup:restore_imagegen', async () => {
    await api.put(`${BASE}/api/option/`, {
      data: { key: 'ImageGenerationUrl', value: originalImageUrl }
    })
    await api.put(`${BASE}/api/option/`, {
      data: { key: 'ImageGenerationOpenMode', value: originalImageMode }
    })
  })

  // ── Summary ──
  await page.close()
  await browser.close()

  console.log('\n══════════════════════════════════════════════')
  console.log('  Dev Feature Test Results (Comprehensive)')
  console.log('══════════════════════════════════════════════')
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  if (failed > 0) {
    console.log('\n  FAILURES:')
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`    FAIL  ${r.name}`)
      console.log(`          ${r.error}`)
    }
  }
  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  console.log(`  Screenshots: ${DIR}/dev_*.png`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error(e); process.exit(1) })
