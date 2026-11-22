import { test, expect } from "../fixtures";

test.describe("系统设置", () => {
  test("01 - 导航到系统设置页面", async ({ page }) => {
    await test.step("打开系统设置页", async () => {
      await page.goto("/system-settings");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/settings-01-page.png", fullPage: true });
      await test.info().attach("settings-01-page", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|\/system-settings/);
    });
  });

  test("02 - 站点设置子页面渲染", async ({ page }) => {
    await test.step("打开站点设置子页面", async () => {
      await page.goto("/system-settings/site");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/settings-02-site.png", fullPage: true });
      await test.info().attach("settings-02-site", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|\/system-settings/);
    });
  });

  test("03 - 通过 API 更新系统名称并验证持久化", async ({ page, apiClient }) => {
    await test.step("通过 API 更新系统名称", async () => {
      const result = await apiClient.updateOption("SystemName", "E2E Test System");
      expect(result.success).toBe(true);
    });

    await test.step("通过状态接口验证更新生效", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const statusResp = await fetch(`http://localhost:${PORT}/api/status`);
      const status = await statusResp.json();
      expect(status.data?.system_name).toBe("E2E Test System");
    });

    await test.step("打开站点设置页面并截图", async () => {
      await page.goto("/system-settings/site");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/settings-03-after-update.png", fullPage: true });
      await test.info().attach("settings-03-after-update", { body: screenshotBuffer, contentType: "image/png" });
    });
  });

  test("04 - 运维设置页面渲染", async ({ page }) => {
    await test.step("打开运维设置页面", async () => {
      await page.goto("/system-settings/operations");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/settings-04-operations.png", fullPage: true });
      await test.info().attach("settings-04-operations", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|\/system-settings/);
    });
  });

  test("05 - 安全设置页面渲染", async ({ page }) => {
    await test.step("打开安全设置页面", async () => {
      await page.goto("/system-settings/security");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/settings-05-security.png", fullPage: true });
      await test.info().attach("settings-05-security", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|\/system-settings/);
    });
  });
});
