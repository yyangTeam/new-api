import { test, expect } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_USER = "root";
const ROOT_PASS = "test12345678";

test.describe("初始化与登录", () => {
  test("01 - 首页加载成功", async ({ page }) => {
    await test.step("打开首页", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await test.step("截图并验证标题", async () => {
      await page.screenshot({ path: "integration-results/01-home-page.png", fullPage: true });
      const title = await page.title();
      expect(title).toBeTruthy();
    });
  });

  test("02 - 登录页面正常渲染", async ({ page }) => {
    await test.step("打开登录页", async () => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
    });

    await test.step("验证密码输入框可见", async () => {
      await page.screenshot({ path: "integration-results/02-login-page.png", fullPage: true });
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible({ timeout: 10_000 });
    });
  });

  test("03 - 使用 root 账号登录成功", async ({ page }) => {
    await test.step("打开登录页", async () => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
    });

    await test.step("填写用户名和密码", async () => {
      const usernameInput = page.locator('input:not([type="password"]):not([type="hidden"])').first();
      const passwordInput = page.locator('input[type="password"]');
      await usernameInput.fill(ROOT_USER);
      await passwordInput.fill(ROOT_PASS);
      await page.screenshot({ path: "integration-results/03-login-filled.png", fullPage: true });
    });

    await test.step("点击登录按钮", async () => {
      await page.locator('button[type="submit"]').first().click();
    });

    await test.step("等待跳转离开登录页", async () => {
      await page.waitForURL((url) => !url.toString().includes("/sign-in"), {
        timeout: 15_000,
      });
      await page.waitForLoadState("networkidle");
    });

    await test.step("验证登录成功并保存认证状态", async () => {
      await page.screenshot({ path: "integration-results/03-login-success.png", fullPage: true });
      expect(page.url()).not.toContain("/sign-in");

      const authDir = path.resolve(__dirname, "../.auth");
      mkdirSync(authDir, { recursive: true });
      await page.context().storageState({
        path: path.join(authDir, "integration-auth.json"),
      });
    });
  });

  test("04 - 登录后仪表盘加载成功", async ({ page }) => {
    await test.step("登录", async () => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      const usernameInput = page.locator('input:not([type="password"]):not([type="hidden"])').first();
      const passwordInput = page.locator('input[type="password"]');
      await usernameInput.fill(ROOT_USER);
      await passwordInput.fill(ROOT_PASS);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.toString().includes("/sign-in"), {
        timeout: 15_000,
      });
    });

    await test.step("导航到仪表盘并验证", async () => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "integration-results/04-dashboard.png", fullPage: true });
      expect(page.url()).toContain("/dashboard");
    });
  });
});
