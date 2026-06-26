import { chromium } from 'playwright'

const BASE = 'http://localhost:13000'
const DIR = '/home/admin/tmp_file'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const results = []

  async function test(name, fn) {
    try {
      await fn()
      results.push({ name, status: 'PASS' })
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.message })
    }
  }

  // === Part 1: Unauthenticated pages ===
  await test('01_home_page', async () => {
    const page = await context.newPage()
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })
    await page.screenshot({ path: `${DIR}/01_home_page.png`, fullPage: true })
    await page.close()
  })

  await test('02_login_page', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${DIR}/02_login_page.png`, fullPage: true })
    await page.close()
  })

  await test('03_api_status', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE}/api/status`, { waitUntil: 'networkidle', timeout: 10000 })
    await page.screenshot({ path: `${DIR}/03_api_status.png`, fullPage: true })
    await page.close()
  })

  // === Part 2: Login via form, then visit all authenticated pages with the same page ===
  const page = await context.newPage()

  await test('04_login', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(500)
    const inputs = await page.locator('input').all()
    if (inputs.length >= 2) {
      await inputs[0].fill('qqqqqqq1')
      await inputs[1].fill('test123456')
    }
    await page.screenshot({ path: `${DIR}/04_login_filled.png`, fullPage: true })

    const submitBtn = page.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible()) {
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
    await page.screenshot({ path: `${DIR}/04_login_success.png`, fullPage: true })
  })

  const pages = [
    ['05_dashboard', '/console'],
    ['06_channels', '/console/channel'],
    ['07_tokens', '/console/token'],
    ['08_logs', '/console/log'],
    ['09_users', '/console/user'],
    ['10_settings', '/console/setting'],
    ['11_wallet', '/console/topup'],
    ['12_profile', '/console/profile'],
  ]

  for (const [name, path] of pages) {
    await test(name, async () => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true })
    })
  }

  await page.close()
  await browser.close()

  console.log('\n=== E2E Test Results ===')
  let passed = 0, failed = 0
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'PASS' : 'FAIL'
    console.log(`  ${icon}  ${r.name}${r.error ? ' — ' + r.error : ''}`)
    if (r.status === 'PASS') passed++; else failed++
  }
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  console.log(`Screenshots: ${DIR}/`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error(e); process.exit(1) })
