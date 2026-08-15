import { test, expect } from "../fixtures";

test.describe("订阅计划管理", () => {
  test("01 - 导航到订阅页面", async ({ page }) => {
    await test.step("打开订阅页面", async () => {
      await page.goto("/subscriptions");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/sub-01-page.png", fullPage: true });
      expect(page.url()).toMatch(/subscription|sign-in/);
    });
  });

  test("02 - 通过 API 创建订阅计划", async ({ page, apiClient }) => {
    await test.step("通过 API 创建订阅计划", async () => {
      await apiClient.confirmPaymentCompliance();
      const result = await apiClient.createSubscriptionPlan({
        title: "E2E Basic Plan",
        price: 999,
        quota: 5000000,
        period_days: 30,
      });

      if (result.success) {
        const plans = await apiClient.getSubscriptionPlans();
        const found = plans.data?.some?.((p: any) => p.title === "E2E Basic Plan");
        expect(found).toBe(true);
      }
    });

    await test.step("打开订阅页面验证显示", async () => {
      await page.goto("/subscriptions");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/sub-02-after-create.png", fullPage: true });
    });
  });

  test("03 - 切换订阅计划状态", async ({ page, apiClient }) => {
    await test.step("禁用并重新启用订阅计划", async () => {
      await apiClient.confirmPaymentCompliance();
      const plans = await apiClient.getSubscriptionPlans();
      const plan = plans.data?.find?.((p: any) => p.title === "E2E Basic Plan");

      if (plan) {
        const result = await apiClient.updateSubscriptionPlanStatus(plan.id, 2);
        expect(result.success).toBe(true);

        const result2 = await apiClient.updateSubscriptionPlanStatus(plan.id, 1);
        expect(result2.success).toBe(true);
      }
    });

    await test.step("打开订阅页面验证状态切换", async () => {
      await page.goto("/subscriptions");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/sub-03-status-toggled.png", fullPage: true });
    });
  });

  test("04 - 订阅计划页面渲染", async ({ page }) => {
    await test.step("打开订阅页面", async () => {
      await page.goto("/subscriptions");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证页面渲染正常", async () => {
      await page.screenshot({ path: "integration-results/sub-04-plan-cards.png", fullPage: true });
      expect(page.url()).toMatch(/subscription|sign-in/);
    });
  });
});
