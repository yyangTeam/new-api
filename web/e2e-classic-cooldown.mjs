import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'

const BASE = 'http://localhost:3000'
const SHOT = '/home/admin/workspace/tmp_file'
const ADMIN_USER = 'root'
const ADMIN_PASS = '12345678'
const COOLDOWN = '60'

mkdirSync(SHOT, { recursive: true })

const results = []
function check(name, cond, extra = '') {
  results.push({ name, status: cond ? 'PASS' : 'FAIL', extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`)
}

// --- 0. Setup root account ---
await fetch(`${BASE}/api/setup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: ADMIN_USER,
    password: ADMIN_PASS,
    confirmPassword: ADMIN_PASS,
    SelfUseModeEnabled: true,
    DemoSiteEnabled: false,
  }),
})
const setupStatus = await fetch(`${BASE}/api/setup`).then((r) => r.json()).catch(() => ({}))
const rootReady = setupStatus?.data?.root_init === true || setupStatus?.data?.status === true
check('[classic] root account exists', rootReady)

// --- 1. Ensure classic theme ---
const loginResp = await fetch(`${BASE}/api/user/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
})
const cookie = loginResp.headers.get('set-cookie') || ''
const loginBody = await loginResp.json().catch(() => ({}))
const uid = loginBody?.data?.id
check('[classic] API login as root', loginBody?.success === true && !!uid)

await fetch(`${BASE}/api/option/`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Cookie: cookie, 'New-Api-User': String(uid) },
  body: JSON.stringify({ key: 'theme.frontend', value: 'classic' }),
})

// --- 2. Browser UI login at /login ---
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 200)))

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 25000 })
await page.waitForTimeout(1000)
await page.locator('input#username').fill(ADMIN_USER)
await page.locator('input#password').fill(ADMIN_PASS)
await page.screenshot({ path: `${SHOT}/classic_01_login_filled.png`, fullPage: true })
await page.locator('button[type="submit"], button[htmltype="submit"]').first().click()

let loggedIn = false
try {
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15000 })
  loggedIn = true
} catch { loggedIn = false }
check('[classic] UI login (leaves /login)', loggedIn, `url=${page.url()}`)
await page.screenshot({ path: `${SHOT}/classic_02_after_login.png`, fullPage: true })

// --- 3. Navigate to /console/personal (personal settings) ---
await page.goto(`${BASE}/console/personal`, { waitUntil: 'networkidle', timeout: 25000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: `${SHOT}/classic_03_personal_settings.png`, fullPage: true })

// Cooldown field = the Semi AutoComplete whose label contains "冷却"
// DOM structure: .semi-form-field contains label + .semi-autocomplete > input
const cooldownLabel = page.locator('text=冷却').first()
const cooldownVisible = await cooldownLabel.count() > 0
check('[classic] cooldown label "通知冷却时间" visible', cooldownVisible)

// The cooldown input is the one with placeholder "0" (input[7] from debug)
const cooldownInput = page.locator('input[placeholder="0"]').first()

// --- 4. Fill cooldown value ---
await cooldownInput.scrollIntoViewIfNeeded()
await cooldownInput.click()
await cooldownInput.fill(COOLDOWN)
await page.screenshot({ path: `${SHOT}/classic_04_cooldown_filled.png`, fullPage: true })
check('[classic] fill cooldown = ' + COOLDOWN, true)

// --- 5. Save ---
const saveBtn = page.getByRole('button', { name: /保存设置|Save Settings/i }).first()
await saveBtn.click()
await page.waitForTimeout(2000)

// Check for Semi Toast / notification
const toastContents = await page.locator('.semi-toast-content, .semi-notification-content, [class*="toast"]').allTextContents().catch(() => [])
const bodyText = await page.locator('body').innerText().catch(() => '')
const saved = toastContents.some((t) => t.includes('成功') || t.includes('success') || t.includes('Success')) ||
  bodyText.includes('Saved successfully') || bodyText.includes('保存成功') || bodyText.includes('设置保存成功')
check('[classic] save success toast', saved, `toast=${JSON.stringify(toastContents).slice(0, 200)}`)
await page.screenshot({ path: `${SHOT}/classic_05_after_save.png`, fullPage: true })

// --- 6. Reload + verify persistence ---
await page.reload({ waitUntil: 'networkidle', timeout: 25000 })
await page.waitForTimeout(2000)

const reloadedVal = await page.locator('input[placeholder="0"]').first().inputValue().catch(() => '')
check('[classic] cooldown persisted after reload', reloadedVal === COOLDOWN, `input=${reloadedVal}`)
await page.screenshot({ path: `${SHOT}/classic_06_reloaded.png`, fullPage: true })

// --- 7. API verification ---
const apiCheck = await page.evaluate(async () => {
  // Classic stores user as JSON in localStorage.user, header is New-API-User
  let uid = ''
  try { uid = String(JSON.parse(localStorage.getItem('user') || '{}')?.id || '') } catch {}
  const r = await fetch('/api/user/self', {
    credentials: 'include',
    headers: { 'New-API-User': uid },
  })
  const j = await r.json()
  let s = {}
  try { s = JSON.parse(j?.data?.setting || '{}') } catch {}
  return { status: r.status, val: s.notify_cooldown_minutes, raw: String(j?.data?.setting || '').slice(0, 200) }
})
check(`[classic] API reflects notify_cooldown_minutes=${COOLDOWN}`, String(apiCheck.val) === COOLDOWN, `status=${apiCheck.status} val=${apiCheck.val}`)
console.log('  [api] setting raw:', apiCheck.raw)

await browser.close()

const failed = results.filter((r) => r.status !== 'PASS')
console.log(`\n=== CLASSIC SUMMARY: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed ===`)
writeFileSync(`${SHOT}/classic_result.json`, JSON.stringify({ results, allPassed: failed.length === 0 }, null, 2))
process.exit(failed.length ? 1 : 0)
