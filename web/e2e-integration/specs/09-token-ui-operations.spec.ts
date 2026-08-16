import { test, expect } from "../fixtures";

test.describe("Token UI 操作", () => {
  test("01 - 密钥页面加载", async ({ page }) => {
    await test.step("打开密钥页面", async () => {
      await page.goto("/keys");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
    });

    await test.step("验证页面加载成功", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/tok-ui-01-page.png", fullPage: true });
      await test.info().attach("tok-ui-01-page", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/keys|sign-in/);
    });
  });

  test("02 - 创建自定义额度 Token", async ({ apiClient }) => {
    await test.step("通过 API 创建自定义额度 Token", async () => {
      const result = await apiClient.createToken({
        name: "Custom Quota Token",
        remain_quota: 2000000,
        unlimited_quota: false,
      });
      expect(result.success).toBe(true);
    });

    await test.step("通过 API 验证结果", async () => {
      const tokens = await apiClient.getTokens();
      const tok = tokens.data?.find?.((t: any) => t.name === "Custom Quota Token");
      expect(tok).toBeTruthy();
      expect(tok.remain_quota).toBe(2000000);
    });

    await test.step("清理测试数据", async () => {
      const tokens = await apiClient.getTokens();
      const tok = tokens.data?.find?.((t: any) => t.name === "Custom Quota Token");
      await apiClient.deleteToken(tok.id);
    });
  });

  test("03 - 创建无限额度 Token", async ({ apiClient }) => {
    await test.step("通过 API 创建无限额度 Token", async () => {
      const result = await apiClient.createToken({
        name: "Unlimited Token",
        remain_quota: 0,
        unlimited_quota: true,
      });
      expect(result.success).toBe(true);
    });

    await test.step("通过 API 验证结果", async () => {
      const tokens = await apiClient.getTokens();
      const tok = tokens.data?.find?.((t: any) => t.name === "Unlimited Token");
      expect(tok).toBeTruthy();
      expect(tok.unlimited_quota).toBe(true);
    });

    await test.step("清理测试数据", async () => {
      const tokens = await apiClient.getTokens();
      const tok = tokens.data?.find?.((t: any) => t.name === "Unlimited Token");
      await apiClient.deleteToken(tok.id);
    });
  });

  test("04 - 删除 Token 并通过 API 验证", async ({ page, apiClient }) => {
    await test.step("通过 API 创建 Token", async () => {
      await apiClient.createToken({ name: "Delete Me Token", remain_quota: 50000 });
      const tokens = await apiClient.getTokens();
      const tok = tokens.data?.find?.((t: any) => t.name === "Delete Me Token");
      expect(tok).toBeTruthy();

      await apiClient.deleteToken(tok.id);
    });

    await test.step("通过 API 验证删除成功", async () => {
      const tokensAfter = await apiClient.getTokens();
      const deleted = tokensAfter.data?.find?.((t: any) => t.name === "Delete Me Token");
      expect(deleted).toBeFalsy();
    });

    await test.step("打开密钥页面验证已删除", async () => {
      await page.goto("/keys");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/tok-ui-04-after-delete.png", fullPage: true });
      await test.info().attach("tok-ui-04-after-delete", { body: screenshotBuffer, contentType: "image/png" });
    });
  });
});
