import { test, expect } from "../fixtures";

test.describe("系统设置表单", () => {
  test("01 - 通过 API 切换注册开关", async ({ page, apiClient }) => {
    await test.step("通过 API 关闭注册并验证", async () => {
      const result = await apiClient.updateOption("RegisterEnabled", "false");
      expect(result.success).toBe(true);

      const statusResp = await fetch(`http://localhost:${process.env.INTEGRATION_PORT || "14000"}/api/status`);
      const status = await statusResp.json();
      expect(status.data?.register_enabled).toBe(false);

      // Re-enable
      await apiClient.updateOption("RegisterEnabled", "true");
    });

    await test.step("打开认证设置页面并截图", async () => {
      await page.goto("/system-settings/auth");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/settings-form-01-auth.png", fullPage: true });
    });
  });

  test("02 - 修改计费显示设置", async ({ page, apiClient }) => {
    await test.step("通过 API 修改计费显示设置并验证", async () => {
      const result = await apiClient.updateOption("DisplayInCurrencyEnabled", "false");
      expect(result.success).toBe(true);

      const statusResp = await fetch(`http://localhost:${process.env.INTEGRATION_PORT || "14000"}/api/status`);
      const status = await statusResp.json();
      expect(status.data?.display_in_currency).toBe(false);

      // Restore
      await apiClient.updateOption("DisplayInCurrencyEnabled", "true");
    });

    await test.step("打开计费设置页面并截图", async () => {
      await page.goto("/system-settings/billing");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/settings-form-02-billing.png", fullPage: true });
    });
  });

  test("03 - 内容设置页面加载", async ({ page }) => {
    await test.step("打开内容设置页面", async () => {
      await page.goto("/system-settings/content");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证内容设置页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/settings-form-03-content.png", fullPage: true });
      expect(page.url()).toContain("/system-settings");
    });
  });

  test("04 - 模型设置页面加载", async ({ page }) => {
    await test.step("打开模型设置页面", async () => {
      await page.goto("/system-settings/models");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证模型设置页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/settings-form-04-models.png", fullPage: true });
      expect(page.url()).toContain("/system-settings");
    });
  });

  test("05 - 更新页脚 HTML 并验证", async ({ page, apiClient }) => {
    await test.step("通过 API 设置页脚并验证", async () => {
      const result = await apiClient.updateOption("Footer", "<p>E2E Test Footer</p>");
      expect(result.success).toBe(true);

      const statusResp = await fetch(`http://localhost:${process.env.INTEGRATION_PORT || "14000"}/api/status`);
      const status = await statusResp.json();
      expect(status.data?.footer_html).toContain("E2E Test Footer");

      // Clear footer
      await apiClient.updateOption("Footer", "");
    });

    await test.step("打开首页验证页脚渲染", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/settings-form-05-footer.png", fullPage: true });
    });
  });
});
