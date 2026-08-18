import { test, expect } from "../fixtures";

test.describe("渠道管理", () => {
  test("01 - 导航到渠道页面", async ({ page }) => {
    await test.step("打开渠道列表页", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
    });

    await test.step("截图并验证页面", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/channels-01-list.png", fullPage: true });
      await test.info().attach("channels-01-list", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|\/channels/);
    });
  });

  test("02 - 通过 API 创建渠道并在 UI 中验证", async ({ page, apiClient }) => {
    await test.step("通过 API 创建渠道", async () => {
      const result = await apiClient.createChannel({
        name: "E2E Test Channel",
        type: 1, // OpenAI
        key: "sk-test-fake-key-for-e2e",
        base_url: "https://api.openai.com",
        models: "gpt-3.5-turbo,gpt-4",
      });
      expect(result.success).toBe(true);
    });

    await test.step("打开渠道页面并等待加载", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/channels-02-after-create.png", fullPage: true });
      await test.info().attach("channels-02-after-create", { body: screenshotBuffer, contentType: "image/png" });
    });

    await test.step("验证渠道在列表中可见", async () => {
      const channelText = page.locator('text=E2E Test Channel');
      const visible = await channelText.isVisible().catch(() => false);
      if (!visible) {
        await page.reload();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        const screenshotBuffer = await page.screenshot({ path: "integration-results/channels-02-after-reload.png", fullPage: true });
        await test.info().attach("channels-02-after-reload", { body: screenshotBuffer, contentType: "image/png" });
      }
      await expect(page.locator('text=E2E Test Channel')).toBeVisible({ timeout: 10_000 });
    });
  });

  test("03 - 渠道详情显示正确信息", async ({ page }) => {
    await test.step("打开渠道列表页", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证渠道卡片内容正确", async () => {
      // 等待渠道列表加载并验证名称可见
      await expect(page.locator('text=E2E Test Channel')).toBeVisible({ timeout: 10_000 });
      // 验证 Priority 和 Weight 数值存在（卡片上的数字按钮）
      await expect(page.getByTitle('0').first()).toBeVisible({ timeout: 5_000 });
      await expect(page.getByTitle('1').first()).toBeVisible({ timeout: 5_000 });

      const screenshotBuffer = await page.screenshot({ path: "integration-results/channels-03-detail.png", fullPage: true });
      await test.info().attach("channels-03-detail", { body: screenshotBuffer, contentType: "image/png" });
    });
  });

  test("04 - 通过 API 删除渠道并验证移除", async ({ page, apiClient }) => {
    await test.step("通过 API 查找并删除测试渠道", async () => {
      const channels = await apiClient.getChannels();
      const testChannel = channels.data?.find?.((ch: any) => ch.name === "E2E Test Channel");

      if (testChannel) {
        const deleteResult = await apiClient.deleteChannel(testChannel.id);
        expect(deleteResult.success).toBe(true);
      }
    });

    await test.step("打开渠道页面并验证已删除", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/channels-04-after-delete.png", fullPage: true });
      await test.info().attach("channels-04-after-delete", { body: screenshotBuffer, contentType: "image/png" });

      const channelName = page.getByText("E2E Test Channel");
      await expect(channelName).not.toBeVisible({ timeout: 5_000 });
    });
  });
});
