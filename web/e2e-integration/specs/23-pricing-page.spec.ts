import { test, expect } from "../fixtures";

test.describe("定价页面与模型计费", () => {
  test("01 - 公开定价页面加载", async ({ page }) => {
    await test.step("打开定价页面", async () => {
      await page.goto("/pricing");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证定价页面加载", async () => {
      await page.screenshot({ path: "integration-results/pricing-01-page.png", fullPage: true });
      expect(page.url()).toContain("/pricing");
    });
  });

  test("02 - 定价 API 返回数据", async ({}) => {
    await test.step("调用公开定价接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/pricing`);
      const result = await resp.json();
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
    });
  });

  test("03 - 模型比率配置接口", async ({}) => {
    await test.step("调用比率配置接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/ratio_config`);
      // 接口可能返回 200 或 401（公开/限制取决于配置）
      expect(resp.status).not.toBe(404);
    });
  });

  test("04 - 计费设置页面 - 模型定价部分", async ({ page }) => {
    await test.step("打开计费设置页面", async () => {
      await page.goto("/system-settings/billing");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证计费设置页面加载", async () => {
      await page.screenshot({ path: "integration-results/pricing-04-billing-settings.png", fullPage: true });
      expect(page.url()).toContain("/system-settings");
    });
  });

  test("05 - 模型设置页面 - 比率设置部分", async ({ page }) => {
    await test.step("打开模型设置页面", async () => {
      await page.goto("/system-settings/models");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证模型设置页面加载", async () => {
      await page.screenshot({ path: "integration-results/pricing-05-models-settings.png", fullPage: true });
      expect(page.url()).toContain("/system-settings");
    });
  });
});
