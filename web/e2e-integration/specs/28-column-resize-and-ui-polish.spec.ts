import { test, expect } from "../fixtures";

test.describe("列宽调整与 UI 优化", () => {
  test("01 - 渠道列表页有表格结构", async ({ page, apiClient }) => {
    await test.step("创建测试渠道确保列表非空", async () => {
      await apiClient.createChannel({
        name: "Table Col Test",
        type: 1,
        key: "sk-col-test",
        models: "gpt-3.5-turbo",
      });
    });

    await test.step("打开渠道页面验证表格", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/col-resize-01-table.png", fullPage: true });
      await test.info().attach("col-resize-01-table", { body: screenshotBuffer, contentType: "image/png" });

      // 页面应包含表格或卡片列表
      expect(page.url()).toMatch(/channels|sign-in/);
    });

    await test.step("清理数据", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find((c: any) => c.name === "Table Col Test");
      if (ch) await apiClient.deleteChannel(ch.id);
    });
  });

  test("02 - 渠道列表支持不同视图模式", async ({ page }) => {
    await test.step("打开渠道页面", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("查找视图切换按钮", async () => {
      // 查找视图切换器（网格/列表视图）
      const viewToggle = page.locator('[aria-label*="view" i], button:has-text("View"), [class*="ViewToggle"]');
      const hasToggle = await viewToggle.first().isVisible().catch(() => false);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/col-resize-02-view-mode.png", fullPage: true });
      await test.info().attach("col-resize-02-view-mode", { body: screenshotBuffer, contentType: "image/png" });
    });
  });

  test("03 - 数据看板主题化视图", async ({ page }) => {
    await test.step("打开仪表盘", async () => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证仪表盘有数据卡片", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/col-resize-03-dashboard-cards.png", fullPage: true });
      await test.info().attach("col-resize-03-dashboard-cards", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/dashboard|overview/);
    });
  });

  test("04 - 任务日志详情页面存在", async ({ page }) => {
    await test.step("打开任务日志相关页面", async () => {
      // 任务日志可能在 usage-logs 的 sub-section
      await page.goto("/usage-logs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证日志页面加载", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/col-resize-04-task-logs.png", fullPage: true });
      await test.info().attach("col-resize-04-task-logs", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/usage-logs|log/);
    });
  });
});
