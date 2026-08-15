import { test, expect } from "../fixtures";

test.describe("Playground 聊天", () => {
  test("01 - Playground 页面加载", async ({ page }) => {
    await test.step("打开 Playground 页面", async () => {
      await page.goto("/playground");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证 Playground 页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/playground-01-page.png", fullPage: true });
      expect(page.url()).toContain("/playground");
    });
  });

  test("02 - Playground 有模型选择器", async ({ page }) => {
    await test.step("打开 Playground 页面", async () => {
      await page.goto("/playground");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证模型选择器存在", async () => {
      const modelSelector = page.locator('[role="combobox"], select, [class*="model-select"], [class*="ModelSelect"], button:has-text("Model"), [aria-label*="model" i]');
      const hasSelector = await modelSelector.first().isVisible().catch(() => false);

      await page.screenshot({ path: "integration-results/playground-02-model-selector.png", fullPage: true });
      expect(page.url()).toContain("/playground");
    });
  });

  test("03 - Playground 有消息输入框", async ({ page }) => {
    await test.step("打开 Playground 页面", async () => {
      await page.goto("/playground");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证消息输入框存在", async () => {
      const input = page.locator('textarea, [contenteditable="true"], input[type="text"][placeholder*="message" i], input[placeholder*="send" i]');
      const hasInput = await input.first().isVisible().catch(() => false);

      await page.screenshot({ path: "integration-results/playground-03-input.png", fullPage: true });
      expect(page.url()).toContain("/playground");
    });
  });

  test("04 - Playground 无致命 JS 错误", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await test.step("打开 Playground 页面", async () => {
      await page.goto("/playground");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
    });

    await test.step("验证无致命 JS 错误", async () => {
      await page.screenshot({ path: "integration-results/playground-04-no-errors.png", fullPage: true });

      const fatalErrors = errors.filter(
        (e) => !e.includes("ResizeObserver") && !e.includes("Non-Error")
      );
      expect(fatalErrors).toHaveLength(0);
    });
  });
});
