import { test, expect } from "../fixtures";

test.describe("仪表盘", () => {
  const consoleErrors: string[] = [];

  test("01 - 仪表盘加载无 JS 错误", async ({ page }) => {
    await test.step("监听错误并打开仪表盘", async () => {
      page.on("pageerror", (error) => {
        consoleErrors.push(error.message);
      });
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("截图并验证无关键错误", async () => {
      await page.screenshot({ path: "integration-results/dashboard-01-full.png", fullPage: true });
      expect(page.url()).toContain("/dashboard");
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("ResizeObserver") && !e.includes("Non-Error")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test("02 - 仪表盘概览加载", async ({ page }) => {
    await test.step("打开仪表盘并等待加载", async () => {
      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(5000);
    });

    await test.step("截图并验证页面", async () => {
      await page.screenshot({ path: "integration-results/dashboard-02-stats.png", fullPage: true });
      expect(page.url()).toMatch(/dashboard|overview/);
    });
  });

  test("03 - 个人资料页渲染", async ({ page }) => {
    await test.step("打开个人资料页", async () => {
      await page.goto("/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      await page.screenshot({ path: "integration-results/dashboard-03-profile.png", fullPage: true });
      expect(page.url()).toContain("/profile");
    });
  });

  test("04 - 模型页面渲染", async ({ page }) => {
    await test.step("打开模型页面", async () => {
      await page.goto("/models");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      await page.screenshot({ path: "integration-results/dashboard-04-models.png", fullPage: true });
      expect(page.url()).toContain("/models");
    });
  });

  test("05 - 系统信息页渲染", async ({ page }) => {
    await test.step("打开系统信息页", async () => {
      await page.goto("/system-info");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面", async () => {
      await page.screenshot({ path: "integration-results/dashboard-05-system-info.png", fullPage: true });
      expect(page.url()).toContain("/system-info");
    });
  });
});
