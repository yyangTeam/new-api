import { expect, test, type Page } from '@playwright/test'

/**
 * Wallet page E2E tests (run against the real preview backend on :3000).
 *
 * Logs in as the seeded "preview" user, then verifies the redemption-code
 * section is visually prominent and positioned above the online-topup area,
 * and that the "online topup unavailable" notice renders as a red warning
 * box with a bold, underlined "click here to get one" link.
 *
 * Uses playwright.preview.config.ts (no webServer) so the Go preview backend
 * serves the SPA. Run: `playwright test --config playwright.preview.config.ts`.
 */

const PREVIEW_USER = process.env.E2E_USER ?? 'preview'
const PREVIEW_PASS = process.env.E2E_PASS ?? 'Preview1234!'
const TOUP_LINK =
  process.env.E2E_TOUP_LINK ?? 'https://example.com/get-redemption-code'

/** Log in via the real backend and seed localStorage so the SPA is authed. */
async function loginAsPreview(page: Page) {
  const resp = await page.context().request.post('/api/user/login', {
    data: { username: PREVIEW_USER, password: PREVIEW_PASS },
  })
  expect(resp.ok(), 'preview login succeeded').toBeTruthy()
  const { data } = await resp.json()
  const token: string = data.access_token
  await page.addInitScript(
    (t) => window.localStorage.setItem('token', t),
    token
  )
}

test.describe('Wallet page — redemption code section', () => {
  // Fresh context: no pre-seeded (mocked) auth — we log in for real.
  test.use({ storageState: undefined })
  test.use({ locale: 'en-US' })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('i18nextLng', 'en')
    })
  })

  test('redemption section and prominent warning notice render', async ({
    page,
  }) => {
    await loginAsPreview(page)
    await page.goto('/wallet')
    await page.waitForLoadState('domcontentloaded')

    // Redemption section is present.
    await expect(page.getByText('Have a Code?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Redeem' })).toBeVisible()

    // The online-topup-unavailable notice text is present.
    const noticeText = page.getByText(
      /Online topup is temporarily unavailable/i
    )
    await expect(noticeText).toBeVisible()

    // The notice sits in a red warning box: thick red border + semi-transparent
    // red background (Tailwind classes) + a leading warning icon (SVG).
    const noticeBox = noticeText.locator('xpath=ancestor::div[1]')
    await expect(noticeBox).toHaveClass(/border-2/)
    await expect(noticeBox).toHaveClass(/border-red-500/)
    await expect(noticeBox).toHaveClass(/bg-red-500\/10/) // semi-transparent red bg
    const borderWidth = await noticeBox.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).borderTopWidth)
    )
    expect(borderWidth).toBeGreaterThanOrEqual(2)
    await expect(noticeBox.locator('svg').first()).toBeVisible()

    // The "click here to get one" link: correct href, bold, underlined.
    const link = page.getByRole('link', { name: /click here to get one/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', TOUP_LINK)
    const linkStyle = await link.evaluate((el) => {
      const cs = window.getComputedStyle(el)
      return {
        fontWeight: parseFloat(cs.fontWeight),
        textDecoration: cs.textDecoration,
      }
    })
    expect(linkStyle.fontWeight).toBeGreaterThanOrEqual(600) // bold
    expect(linkStyle.textDecoration).toContain('underline')
  })

  test('redemption section appears above the online-topup area', async ({
    page,
  }) => {
    await loginAsPreview(page)
    // Override ONLY topup info so both sections render (online topup enabled
    // with a pay method + redemption enabled). Everything else hits the real
    // backend with the real session token.
    await page.route('**/api/user/topup/info', (route) =>
      route.fulfill({
        json: {
          success: true,
          message: '',
          data: {
            enable_online_topup: true,
            enable_stripe_topup: false,
            enable_creem_topup: false,
            enable_waffo_topup: false,
            enable_waffo_pancake_topup: false,
            enable_redemption: true,
            payment_compliance_confirmed: true,
            payment_compliance_terms_version: 'v1',
            waffo_pay_methods: null,
            creem_products: [],
            pay_methods: [{ name: 'Test Pay', type: 'test', min_topup: 1 }],
            min_topup: 1,
            stripe_min_topup: 1,
            waffo_min_topup: 1,
            waffo_pancake_min_topup: 1,
            amount_options: [10, 20],
            discount: '',
            topup_link: TOUP_LINK,
          },
        },
      })
    )

    await page.goto('/wallet')
    await page.waitForLoadState('domcontentloaded')

    const redemptionLabel = page.getByText('Have a Code?')
    const onlineTopupMarker = page.getByText('Test Pay')
    await expect(redemptionLabel).toBeVisible()
    await expect(onlineTopupMarker).toBeVisible()

    const r = await redemptionLabel.boundingBox()
    const t = await onlineTopupMarker.boundingBox()
    expect(r && t && r.y < t.y).toBeTruthy()
  })
})
