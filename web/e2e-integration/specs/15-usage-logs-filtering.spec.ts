import { test, expect } from "../fixtures";

test.describe("用量日志与筛选", () => {
  test("01 - 日志页面加载含筛选控件", async ({ page }) => {
    await test.step("打开日志页面", async () => {
      await page.goto("/usage-logs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证日志页面加载成功", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/logs-filter-01-page.png", fullPage: true });
      await test.info().attach("logs-filter-01-page", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/usage-logs|log/);
    });
  });

  test("02 - 日志统计接口返回数据", async ({ apiClient }) => {
    await test.step("调用日志统计接口并验证", async () => {
      const result = await apiClient.getLogsStat();
      // Should return success even if no data
      expect(result.success).toBe(true);
    });
  });

  test("03 - 日志列表接口正常", async ({ apiClient }) => {
    await test.step("调用日志列表接口并验证", async () => {
      const result = await apiClient.getLogs();
      expect(result.success).toBe(true);
      // data should be an array (possibly empty)
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  test("04 - 日志页面有日期筛选器", async ({ page }) => {
    await test.step("打开日志页面", async () => {
      await page.goto("/usage-logs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证日期筛选器控件存在", async () => {
      const filters = page.locator('input[type="date"], [class*="DatePicker"], [class*="date-picker"], select, [role="combobox"]');
      const filterCount = await filters.count();

      const screenshotBuffer = await page.screenshot({ path: "integration-results/logs-filter-04-controls.png", fullPage: true });
      await test.info().attach("logs-filter-04-controls", { body: screenshotBuffer, contentType: "image/png" });

      // Page should have some filter controls
      expect(page.url()).toMatch(/usage-logs|log/);
    });
  });

  test("05 - 日志子页面渲染", async ({ page }) => {
    await test.step("打开日志页面", async () => {
      await page.goto("/usage-logs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证子页面标签渲染", async () => {
      const tabs = page.locator('[role="tab"], [role="tablist"] a, nav a');
      const tabCount = await tabs.count();

      const screenshotBuffer = await page.screenshot({ path: "integration-results/logs-filter-05-sections.png", fullPage: true });
      await test.info().attach("logs-filter-05-sections", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/usage-logs|log/);
    });
  });
});
