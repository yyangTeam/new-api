import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'

const BASE = 'http://localhost:3000'
const SHOT = '/home/admin/workspace/tmp_file'
const ADMIN_USER = 'root'
const ADMIN_PASS = '12345678' // min 8 chars per User validate tag
const COOLDOWN = '30'

mkdirSync(SHOT, { recursive: true })

const results = []
function check(name, cond, extra = '') {
  results.push({ name, status: cond ? 'PASS' : 'FAIL', extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`)
}

// --- 0. Complete first-run setup via API (creates root account) ---
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
check('root account exists after setup (root_init=true)', rootReady)

// --- 1. API login as root, then switch frontend theme to "default" (live) ---
const loginResp = await fetch(`${BASE}/api/user/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
})
const cookie = loginResp.headers.get('set-cookie') || ''
const loginBody = await loginResp.json().catch(() => ({}))
const uid = loginBody?.data?.id
check('API login as root', loginBody?.success === true && !!uid, `uid=${uid}`)

const themeResp = await fetch(`${BASE}/api/option/`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Cookie: cookie,
    'New-Api-User': String(uid),
  },
  body: JSON.stringify({ key: 'theme.frontend', value: 'default' }),
})
const themeBody = await themeResp.json().catch(() => ({}))
check('set frontend theme to default (live switch)', themeBody?.success === true, JSON.stringify(themeBody).slice(0, 120))

// sanity: / serves real index (title present)
const indexHtml = await fetch(`${BASE}/`).then((r) => r.text())
check('server serves real default index (title=New API)', /<title>New API<\/title>/.test(indexHtml))

// --- 2. Browser: UI login at /sign-in (default-theme login route) ---
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 200)))

await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle', timeout: 25000 })
await page.locator('input[type="password"]').waitFor({ state: 'visible', timeout: 15000 })
await page.locator('input[type="password"]').fill(ADMIN_PASS)
await page.locator('input:not([type="password"]):not([type="hidden"])').first().fill(ADMIN_USER)
await page.screenshot({ path: `${SHOT}/01_login_filled.png`, fullPage: true })
await page.locator('button[type="submit"]').first().click()

let loggedIn = false
try {
  await page.waitForURL((u) => !u.toString().includes('/sign-in'), { timeout: 15000 })
  loggedIn = true
} catch {
  loggedIn = false
}
check('UI login as root (leaves /sign-in)', loggedIn, `url=${page.url()}`)
await page.screenshot({ path: `${SHOT}/02_after_login.png`, fullPage: true })

// --- 3. Profile -> Settings & Preferences tab -> cooldown input ---
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 25000 })
await page.waitForTimeout(800)
await page.locator('[role="tab"]').filter({ hasText: /Settings/i }).first().click()
await page.waitForTimeout(600)

const cooldown = page.locator('#cooldown')
const cooldownVisible = await cooldown.isVisible().catch(() => false)
check('notification cooldown input (#cooldown) present', cooldownVisible)
await page.screenshot({ path: `${SHOT}/03_profile_settings_tab.png`, fullPage: true })

// --- 4. Set cooldown value + save ---
await cooldown.fill(COOLDOWN)
await page.screenshot({ path: `${SHOT}/04_cooldown_filled.png`, fullPage: true })

const saveBtn = page.getByRole('button', { name: /Save Settings/i }).first()
await saveBtn.click()

let saved = false
try {
  await page.waitForTimeout(1500)
  saved = (await page.getByText('Settings updated successfully').count()) > 0
} catch {
  saved = false
}
check('save returns success toast (Settings updated successfully)', saved)
await page.screenshot({ path: `${SHOT}/05_after_save.png`, fullPage: true })

// --- 5. Verify persistence: reload, re-open Settings tab, check input value ---
await page.reload({ waitUntil: 'networkidle', timeout: 25000 })
await page.waitForTimeout(800)
await page.locator('[role="tab"]').filter({ hasText: /Settings/i }).first().click()
await page.waitForTimeout(600)
const reloadedVal = await page.locator('#cooldown').inputValue().catch(() => '')
check('cooldown value persisted after reload (UI round-trip)', reloadedVal === COOLDOWN, `input=${reloadedVal}`)
await page.screenshot({ path: `${SHOT}/06_reloaded_persisted.png`, fullPage: true })

// --- 6. Direct API check of persisted settings ---
const apiCheck = await page.evaluate(async () => {
  // The app sends New-Api-User: <uid> (from localStorage) on every API call;
  // /api/user/self is unauthorized without it. Mirror that here.
  const uid = localStorage.getItem('uid') || ''
  const r = await fetch('/api/user/self', {
    credentials: 'include',
    headers: { 'New-Api-User': uid },
  })
  const j = await r.json()
  let s = {}
  try {
    s = JSON.parse(j?.data?.setting || '{}')
  } catch {}
  return { status: r.status, val: s.notify_cooldown_minutes, raw: String(j?.data?.setting || '').slice(0, 200) }
})
check(`GET /api/user/self reflects notify_cooldown_minutes=${COOLDOWN}`, String(apiCheck.val) === COOLDOWN, `status=${apiCheck.status} val=${apiCheck.val}`)
console.log('  [api] setting raw:', apiCheck.raw)

await browser.close()

const failed = results.filter((r) => r.status !== 'PASS')
console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed ===`)
writeFileSync(`${SHOT}/result.json`, JSON.stringify({ results, allPassed: failed.length === 0 }, null, 2))
process.exit(failed.length ? 1 : 0)
