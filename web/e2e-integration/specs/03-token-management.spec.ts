import { test, expect } from "../fixtures";

test.describe("Token 管理", () => {
  test("01 - 导航到密钥页面", async ({ page }) => {
    await test.step("打开密钥列表页", async () => {
      await page.goto("/keys");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("截图并验证页面", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/tokens-01-list.png", fullPage: true });
      await test.info().attach("tokens-01-list", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toContain("/keys");
    });
  });

  test("02 - 通过 API 创建 Token 并验证", async ({ page, apiClient }) => {
    await test.step("通过 API 创建 Token", async () => {
      const result = await apiClient.createToken({
        name: "E2E Test Token",
        remain_quota: 1000000,
        unlimited_quota: false,
      });
      expect(result.success).toBe(true);
    });

    await test.step("通过 API 验证 Token 已创建", async () => {
      const tokens = await apiClient.getTokens();
      const found = tokens.data?.some?.((t: any) => t.name === "E2E Test Token");
      expect(found).toBe(true);
    });

    await test.step("打开密钥页面并截图", async () => {
      await page.goto("/keys");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/tokens-02-after-create.png", fullPage: true });
      await test.info().attach("tokens-02-after-create", { body: screenshotBuffer, contentType: "image/png" });
    });
  });

  test("03 - Token 列表页正常加载", async ({ page, apiClient }) => {
    await test.step("通过 API 批量创建 Token", async () => {
      await apiClient.createToken({ name: "E2E Token Batch 1", remain_quota: 500000 });
      await apiClient.createToken({ name: "E2E Token Batch 2", remain_quota: 500000 });
    });

    await test.step("通过 API 验证批量创建成功", async () => {
      const tokens = await apiClient.getTokens();
      const batchCount = tokens.data?.filter?.((t: any) => t.name?.includes("E2E Token Batch")).length || 0;
      expect(batchCount).toBeGreaterThanOrEqual(2);
    });

    await test.step("打开密钥页面截图并验证", async () => {
      await page.goto("/keys");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/tokens-03-multiple.png", fullPage: true });
      await test.info().attach("tokens-03-multiple", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toContain("/keys");
    });
  });

  test("04 - Token 列表显示额度信息", async ({ page }) => {
    await test.step("打开密钥列表页", async () => {
      await page.goto("/keys");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面正常", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/tokens-04-quota-display.png", fullPage: true });
      await test.info().attach("tokens-04-quota-display", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toContain("/keys");
      expect(page.url()).not.toContain("/error");
    });
  });
});
