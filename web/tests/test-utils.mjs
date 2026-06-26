import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:13000'
const DIR = process.env.TEST_SCREENSHOT_DIR || '/home/admin/tmp_file'
const USER = process.env.TEST_USER || 'qqqqqqq1'
const PASS = process.env.TEST_PASS || 'test123456'

export { BASE, DIR, USER, PASS }

export class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName
    this.results = []
    this.screenshotIdx = 0
    this.browser = null
    this.context = null
    this.page = null
    this.startTime = Date.now()
    this.H = { 'New-Api-User': '1' }
  }

  async setup({ login = true, viewport = { width: 1440, height: 900 } } = {}) {
    this.browser = await chromium.launch({ headless: true })
    this.context = await this.browser.newContext({ viewport })
    this.page = await this.context.newPage()

    if (login) {
      await this.login()
    }

    this.api = {
      post: (url, opts) => this.page.request.post(url, { ...opts, headers: { ...this.H, ...opts?.headers } }),
      put: (url, opts) => this.page.request.put(url, { ...opts, headers: { ...this.H, ...opts?.headers } }),
      get: (url, opts) => this.page.request.get(url, { ...opts, headers: { ...this.H, ...opts?.headers } }),
      del: (url, opts) => this.page.request.delete(url, { ...opts, headers: { ...this.H, ...opts?.headers } }),
      patch: (url, opts) => this.page.request.patch(url, { ...opts, headers: { ...this.H, ...opts?.headers } }),
    }

    return this
  }

  async login() {
    await this.page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })
    await this.page.waitForTimeout(500)
    const inputs = await this.page.locator('input').all()
    if (inputs.length < 2) throw new Error('Login page missing input fields')
    await inputs[0].fill(USER)
    await inputs[1].fill(PASS)

    const submitBtn = this.page.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click()
    } else {
      const btns = this.page.locator('button')
      const count = await btns.count()
      for (let i = 0; i < count; i++) {
        const text = await btns.nth(i).textContent()
        if (text && /登录|Login|Continue|Sign in/i.test(text)) {
          await btns.nth(i).click()
          break
        }
      }
    }
    await this.page.waitForTimeout(3000)

    const url = this.page.url()
    if (url.includes('/login')) {
      throw new Error(`Login failed — still on login page: ${url}`)
    }
  }

  screenshot(name) {
    this.screenshotIdx++
    const prefix = this.suiteName.replace(/[^a-zA-Z0-9]/g, '_')
    return `${DIR}/${prefix}_${String(this.screenshotIdx).padStart(2, '0')}_${name}.png`
  }

  async test(name, fn) {
    const t0 = Date.now()
    try {
      await fn()
      const ms = Date.now() - t0
      this.results.push({ name, status: 'PASS', ms })
      console.log(`  PASS  ${name} (${ms}ms)`)
    } catch (e) {
      const ms = Date.now() - t0
      const msg = e.message.split('\n')[0]
      this.results.push({ name, status: 'FAIL', error: msg, ms })
      console.log(`  FAIL  ${name} — ${msg} (${ms}ms)`)
    }
  }

  async section(name, fn) {
    console.log(`\n── ${name} ──`)
    await fn()
  }

  async teardown() {
    if (this.page) await this.page.close().catch(() => {})
    if (this.browser) await this.browser.close().catch(() => {})
  }

  report() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length

    console.log('\n' + '═'.repeat(50))
    console.log(`  ${this.suiteName}`)
    console.log('═'.repeat(50))

    if (failed > 0) {
      console.log('\n  FAILURES:')
      for (const r of this.results.filter(r => r.status === 'FAIL')) {
        console.log(`    FAIL  ${r.name}`)
        console.log(`          ${r.error}`)
      }
    }

    console.log(`\n  Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed} | Time: ${elapsed}s`)

    return { suite: this.suiteName, total: this.results.length, passed, failed, elapsed, results: this.results }
  }

  exit() {
    const failed = this.results.filter(r => r.status === 'FAIL').length
    process.exit(failed > 0 ? 1 : 0)
  }
}

export function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

export function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'Mismatch'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

export function assertMatch(str, pattern, msg) {
  if (!pattern.test(str)) throw new Error(`${msg || 'Pattern mismatch'}: "${str}" does not match ${pattern}`)
}

export function assertIncludes(arr, value, msg) {
  if (!arr.includes(value)) throw new Error(`${msg || 'Not found'}: ${JSON.stringify(value)} not in ${JSON.stringify(arr)}`)
}

export async function assertApiSuccess(resp, msg) {
  const body = await resp.json()
  if (body.success === false) throw new Error(`${msg || 'API failed'}: ${body.message}`)
  return body
}

export async function assertApiError(resp, msg) {
  const body = await resp.json()
  if (body.success !== false) throw new Error(`${msg || 'Expected API error'}: got success`)
  return body
}

export async function assertStatus(resp, code, msg) {
  if (resp.status() !== code) throw new Error(`${msg || 'Status mismatch'}: expected ${code}, got ${resp.status()}`)
}
