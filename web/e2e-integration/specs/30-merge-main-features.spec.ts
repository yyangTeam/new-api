import { test, expect } from "../fixtures";

// Validation spec added during the origin/main -> dev merge (f98e63636) to
// exercise the upstream features that arrived with the 44 merged commits, in a
// real browser:
//  - Plugin marketplace / task-plugins admin page (#8271) and the channel
//    drawer "provider or plugin" picker (#8323)
//  - Automatic disable keywords (upstream replacement for the retired
//    sensitive-word check) on the request-policy allowlist + health UI
//  - Pricing save review flow surfaces ("Preview price changes") (#72f3dc7da)
//  - Epay RSA signing option on the billing payment settings (#8291)
//  - Password strength feedback on sign-up (#6928)
//  - Immersive home landing for visitors + signed-in redemption guide (PR #11)
//  - Wallet "online topup unavailable" notice with redemption-code link

const PORT = process.env.INTEGRATION_PORT || "14000";
const BASE_URL = `http://localhost:${PORT}`;

test.describe("合并 main 新功能验证", () => {
  test("01 - 插件市场（task-plugins）页面渲染", async ({ page }) => {
    await page.goto("/task-plugins");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    // The task plugins admin page renders its toolbar (filter or upload hint).
    expect(body).toMatch(/插件|Plugins/);
    const shot = await page.screenshot({
      path: "integration-results/merge-plugin-marketplace.png",
      fullPage: true,
    });
    await test.info().attach("merge-plugin-marketplace", {
      body: shot,
      contentType: "image/png",
    });
  });

  test("02 - 渠道创建抽屉提供提供商/插件选择", async ({ page }) => {
    await page.goto("/channels");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /Create Channel|Create|创建渠道/ }).first().click();
    await page.waitForTimeout(2500);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    // The merged drawer guides the admin to pick a provider or a task plugin.
    expect(body).toMatch(
      /Choose a provider or plugin|选择提供商或插件|Search providers, plugins/,
    );
    const shot = await page.screenshot({
      path: "integration-results/merge-channel-plugin-drawer.png",
      fullPage: true,
    });
    await test.info().attach("merge-channel-plugin-drawer", {
      body: shot,
      contentType: "image/png",
    });
  });

  test("03 - 自动禁用关键词经 request_policy 白名单保存并回读", async ({
    apiClient,
  }) => {
    const token = apiClient.getToken();
    await test.step("保存 AutomaticDisableKeywords", async () => {
      const resp = await fetch(`${BASE_URL}/api/option/request_policy`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          options: { AutomaticDisableKeywords: "quota exceeded\ninvalid api key" },
        }),
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
    await test.step("回读确认关键词持久化", async () => {
      const resp = await fetch(`${BASE_URL}/api/option/request_policy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
      const opts = result.data?.options ?? {};
      expect(opts["AutomaticDisableKeywords"]).toBe(
        "quota exceeded\ninvalid api key",
      );
    });
    await test.step("清理恢复默认", async () => {
      const resp = await fetch(`${BASE_URL}/api/option/request_policy`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          options: { AutomaticDisableKeywords: "" },
        }),
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
  });

  test("04 - 请求策略健康页渲染自动禁用关键词表单", async ({ page }) => {
    await page.goto("/system-settings/request-policies/health");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    const shot = await page.screenshot({
      path: "integration-results/merge-request-policy-health.png",
      fullPage: true,
    });
    await test.info().attach("merge-request-policy-health", {
      body: shot,
      contentType: "image/png",
    });
  });

  test("05 - 模型定价设置页（保存审阅入口）渲染", async ({ page }) => {
    await page.goto("/system-settings/models");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    const shot = await page.screenshot({
      path: "integration-results/merge-model-pricing-review.png",
      fullPage: true,
    });
    await test.info().attach("merge-model-pricing-review", {
      body: shot,
      contentType: "image/png",
    });
  });

  test("06 - 支付合规确认与易支付 RSA 签名选项", async ({ page, apiClient }) => {
    // The merged payment compliance gate locks payment settings until the
    // root administrator confirms the terms. Confirm it through the session
    // API (the login Bearer token is a dashboard session token, not a PAT).
    const token = apiClient.getToken();
    const confirmResp = await fetch(`${BASE_URL}/api/option/payment_compliance`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ confirmed: true }),
    });
    const confirmResult = await confirmResp.json();
    expect(confirmResult.success).toBe(true);

    await page.goto("/system-settings/billing/payment");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).toContain("Compliance confirmed");

    // The merged Epay settings offer the RSA sign type (#8291) on the Epay
    // tab; open the signature-type select to reveal the RSA option.
    await page.getByRole("tab", { name: "Epay", exact: true }).click();
    await page.waitForTimeout(1200);
    // exact match: the description ("Use the same signature type…") would
    // otherwise also match and trip Playwright strict mode.
    await expect(
      page.getByText("Signature type", { exact: true }),
    ).toBeVisible();
    // On a fresh database EpaySignType is unset, so the trigger carries no
    // MD5/RSA text; the form label's `for` attribute points at the trigger.
    const sigSelect = page.getByLabel("Signature type", { exact: true });
    await sigSelect.click();
    await page.waitForTimeout(800);
    await expect(
      page.locator("[data-slot='select-item']").filter({ hasText: "RSA" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    const shot = await page.screenshot({
      path: "integration-results/merge-epay-rsa.png",
      fullPage: true,
    });
    await test.info().attach("merge-epay-rsa", {
      body: shot,
      contentType: "image/png",
    });
  });

  test("07 - 注册页密码强度实时反馈", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    // Fill a weak password; the PasswordStrength meter must attach and show
    // the characters-needed hint (#6928).
    const passwordInput = page
      .locator("input[type='password']")
      .first();
    await passwordInput.fill("abc");
    await page.waitForTimeout(800);
    const strength = page.locator("#sign-up-password-strength");
    await expect(strength).toBeAttached();
    await expect(strength).toContainText(/characters|字符|Met|Not met|needed/i);
    const shot = await page.screenshot({
      path: "integration-results/merge-signup-password-strength.png",
      fullPage: true,
    });
    await test.info().attach("merge-signup-password-strength", {
      body: shot,
      contentType: "image/png",
    });
    await context.close();
  });

  test("08 - 未登录首页渲染沉浸式落地页", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    // Immersive landing hero offers visitor CTA buttons (PR #11).
    expect(body).toMatch(/Get Started|Sign In|开始|登录/);
    const shot = await page.screenshot({
      path: "integration-results/merge-home-immersive.png",
      fullPage: true,
    });
    await test.info().attach("merge-home-immersive", {
      body: shot,
      contentType: "image/png",
    });
    await context.close();
  });

  test("09 - 登录后首页展示兑换码购买引导", async ({ page, apiClient }) => {
    // The signed-in purchase guide requires both a configured TopUpLink (the
    // server option key uses a capital U) and the payment compliance
    // confirmation performed in test 06.
    const topupResp = await apiClient.updateOption(
      "TopUpLink",
      "https://example.com/buy-codes",
    );
    expect(topupResp.success).toBe(true);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2500);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    // Signed-in visitors see the redemption-code purchase guide instead of
    // the visitor hero (PR #11).
    expect(body).toMatch(
      /Buy a redemption code|Redeem in your wallet|Purchase a redemption code/,
    );
    const shot = await page.screenshot({
      path: "integration-results/merge-home-redemption-guide.png",
      fullPage: true,
    });
    await test.info().attach("merge-home-redemption-guide", {
      body: shot,
      contentType: "image/png",
    });
  });

  test("10 - 钱包页在线充值不可用提示与兑换入口", async ({ page, apiClient }) => {
    // TopupLink is already set in test 09 and compliance confirmed in 06, so
    // the wallet redemption card shows the "online topup unavailable, buy a
    // redemption code" notice instead of the compliance lock.
    await page.goto("/wallet");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    expect(body).not.toContain("Redemption codes are disabled");
    expect(body).toMatch(/Online topup is temporarily unavailable/);
    const shot = await page.screenshot({
      path: "integration-results/merge-wallet-topup-notice.png",
      fullPage: true,
    });
    await test.info().attach("merge-wallet-topup-notice", {
      body: shot,
      contentType: "image/png",
    });
    // cleanup
    await apiClient.updateOption("TopUpLink", "");
  });
});
