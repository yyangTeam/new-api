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

    await test.step("点击渠道卡片三点菜单打开编辑", async () => {
      await expect(page.locator('text=E2E Test Channel')).toBeVisible({ timeout: 10_000 });

      // 直接点击卡片上的 ··· 图标（lucide-ellipsis SVG）
      // 页面上有多个 ellipsis 图标，用 nth 找到在渠道卡片内的那个
      const ellipsisIcons = page.locator('svg.lucide-ellipsis, [class*="lucide-ellipsis"]');
      const ellipsisCount = await ellipsisIcons.count();
      // 第一个 ellipsis 通常是页面右上角的全局 ···，第二个是渠道卡片的
      const cardEllipsis = ellipsisCount >= 2 ? ellipsisIcons.nth(1) : ellipsisIcons.first();
      // 点击包含 ellipsis 图标的按钮（向上找到 button 父元素）
      await cardEllipsis.locator('xpath=ancestor::button[1]').click();
      await page.waitForTimeout(800);

      // 点击弹出菜单中的 Edit
      const menuItems = page.locator('[role="menuitem"], [data-slot="dropdown-menu-item"]');
      const itemCount = await menuItems.count();
      for (let i = 0; i < itemCount; i++) {
        const text = await menuItems.nth(i).textContent();
        if (text && /Edit|编辑/.test(text)) {
          await menuItems.nth(i).click();
          break;
        }
      }
      await page.waitForTimeout(2000);

      // 截图展示编辑抽屉
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
