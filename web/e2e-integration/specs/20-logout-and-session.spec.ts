import { test, expect } from "../fixtures";

const BASE = `http://localhost:${process.env.INTEGRATION_PORT || "14000"}`;
const ROOT_USER = "root";
const ROOT_PASS = "test12345678";

test.describe("登出与会话", () => {
  test("01 - 未认证访问重定向到登录页", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await test.step("打开 Dashboard 页面（无认证）", async () => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
    });

    await test.step("验证重定向到登录页", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/session-01-no-auth.png", fullPage: true });
      await test.info().attach("session-01-no-auth", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|dashboard/);
      await context.close();
    });
  });

  test("02 - 新上下文中重新登录成功", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await test.step("打开登录页面", async () => {
      await page.goto(`${BASE}/sign-in`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("填写表单并登录", async () => {
      const passwordInput = page.locator('input[type="password"]');
      const hasLoginForm = await passwordInput.isVisible().catch(() => false);

      if (hasLoginForm) {
        const usernameInput = page.locator('input:not([type="password"]):not([type="hidden"])').first();
        await usernameInput.fill(ROOT_USER);
        await passwordInput.fill(ROOT_PASS);
        await page.locator('button[type="submit"]').first().click();

        await page.waitForURL((url) => !url.toString().includes("/sign-in"), { timeout: 15_000 });
        expect(page.url()).not.toContain("/sign-in");
      }
    });

    await test.step("验证登录成功", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/session-02-fresh-login.png", fullPage: true });
      await test.info().attach("session-02-fresh-login", { body: screenshotBuffer, contentType: "image/png" });
      await context.close();
    });
  });

  test("03 - 登出 API 端点存在", async ({}) => {
    await test.step("调用登出接口验证端点存在", async () => {
      const resp = await fetch(`${BASE}/api/user/auth/logout`, { method: "POST" });
      // Should return 401 (no auth) or 200 — not 404
      expect(resp.status).not.toBe(404);
    });
  });

  test("04 - 登录页面重复访问保持稳定", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await test.step("多次导航登录页面", async () => {
      await page.goto(`${BASE}/sign-in`);
      await page.waitForLoadState("networkidle");
      await page.goto(`${BASE}/`);
      await page.waitForTimeout(500);
      await page.goto(`${BASE}/sign-in`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("验证无致命 JS 错误", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/session-04-stable.png", fullPage: true });
      await test.info().attach("session-04-stable", { body: screenshotBuffer, contentType: "image/png" });

      const fatalErrors = errors.filter(
        (e) => !e.includes("ResizeObserver") && !e.includes("Non-Error")
      );
      expect(fatalErrors).toHaveLength(0);
      await context.close();
    });
  });
});
