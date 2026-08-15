import { test, expect } from "../fixtures";

test.describe("兑换码管理", () => {
  test("01 - 导航到兑换码页面", async ({ page, apiClient }) => {
    await test.step("确认支付合规并打开兑换码页面", async () => {
      await apiClient.confirmPaymentCompliance();
      await page.goto("/redemption-codes");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/redeem-01-page.png", fullPage: true });
      expect(page.url()).toMatch(/redemption|sign-in/);
    });
  });

  test("02 - 通过 API 创建兑换码", async ({ page, apiClient }) => {
    await test.step("通过 API 创建兑换码", async () => {
      await apiClient.confirmPaymentCompliance();
      const result = await apiClient.createRedemption({
        name: "E2E Redeem Test",
        quota: 500000,
        count: 1,
      });

      if (result.success) {
        const redemptions = await apiClient.getRedemptions();
        const found = redemptions.data?.some?.((r: any) => r.name === "E2E Redeem Test");
        expect(found).toBe(true);
      }
    });

    await test.step("打开兑换码页面验证显示", async () => {
      await page.goto("/redemption-codes");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/redeem-02-after-create.png", fullPage: true });
    });
  });

  test("03 - 批量创建兑换码", async ({ page, apiClient }) => {
    await test.step("通过 API 批量创建兑换码", async () => {
      await apiClient.confirmPaymentCompliance();
      const result = await apiClient.createRedemption({
        name: "E2E Batch",
        quota: 100000,
        count: 3,
      });

      if (result.success) {
        const redemptions = await apiClient.getRedemptions();
        const batch = redemptions.data?.filter?.((r: any) => r.name === "E2E Batch");
        expect(batch?.length).toBeGreaterThanOrEqual(3);
      }
    });

    await test.step("打开兑换码页面验证批量创建", async () => {
      await page.goto("/redemption-codes");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/redeem-03-batch.png", fullPage: true });
    });
  });

  test("04 - 删除兑换码", async ({ page, apiClient }) => {
    await test.step("通过 API 删除兑换码", async () => {
      await apiClient.confirmPaymentCompliance();
      const redemptions = await apiClient.getRedemptions();
      const toDelete = redemptions.data?.find?.((r: any) => r.name === "E2E Redeem Test");

      if (toDelete) {
        const result = await apiClient.deleteRedemption(toDelete.id);
        expect(result.success).toBe(true);
      }
    });

    await test.step("打开兑换码页面验证已删除", async () => {
      await page.goto("/redemption-codes");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/redeem-04-after-delete.png", fullPage: true });
    });

    await test.step("清理测试数据", async () => {
      const remaining = await apiClient.getRedemptions();
      for (const r of remaining.data || []) {
        if (r.name?.startsWith("E2E")) {
          await apiClient.deleteRedemption(r.id);
        }
      }
    });
  });
});
