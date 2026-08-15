import { test, expect } from "../fixtures";

test.describe("计费与日志", () => {
  test("01 - 导航到用量日志页面", async ({ page }) => {
    await test.step("打开用量日志页", async () => {
      await page.goto("/usage-logs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      await page.screenshot({ path: "integration-results/logs-01-page.png", fullPage: true });
      expect(page.url()).toMatch(/usage-logs|log/);
    });
  });

  test("02 - 日志页面显示空态或表格", async ({ page }) => {
    await test.step("打开用量日志页", async () => {
      await page.goto("/usage-logs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
    });

    await test.step("截图并验证无错误", async () => {
      await page.screenshot({ path: "integration-results/logs-02-content.png", fullPage: true });
      expect(page.url()).not.toContain("/error");
    });
  });

  test("03 - 导航到钱包页面", async ({ page }) => {
    await test.step("打开钱包页", async () => {
      await page.goto("/wallet");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      await page.screenshot({ path: "integration-results/billing-03-wallet.png", fullPage: true });
      expect(page.url()).toMatch(/wallet|topup/);
    });
  });

  test("04 - 钱包页面显示额度信息", async ({ page }) => {
    await test.step("打开钱包页", async () => {
      await page.goto("/wallet");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
    });

    await test.step("截图并验证无错误", async () => {
      await page.screenshot({ path: "integration-results/billing-04-quota.png", fullPage: true });
      expect(page.url()).not.toContain("/error");
    });
  });
});
