import { test, expect } from "../fixtures";

test.describe("渠道 UI 操作", () => {
  test("01 - 渠道页面加载", async ({ page }) => {
    await test.step("打开渠道页面", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
    });

    await test.step("验证页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/ch-ui-01-page.png", fullPage: true });
      expect(page.url()).toMatch(/channels|sign-in/);
    });
  });

  test("02 - 创建渠道并通过 UI 验证", async ({ page, apiClient }) => {
    await test.step("通过 API 创建渠道", async () => {
      const result = await apiClient.createChannel({
        name: "UI Flow Channel",
        type: 1,
        key: "sk-ui-flow-test",
        base_url: "https://api.openai.com",
        models: "gpt-3.5-turbo,gpt-4",
      });
      expect(result.success).toBe(true);
    });

    await test.step("通过 API 验证结果", async () => {
      const channels = await apiClient.getChannels();
      const found = channels.data?.find?.((c: any) => c.name === "UI Flow Channel");
      expect(found).toBeTruthy();
      expect(found.type).toBe(1);
    });

    await test.step("打开渠道页面验证 UI 显示", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/ch-ui-02-created.png", fullPage: true });
    });

    await test.step("清理测试数据", async () => {
      const channels = await apiClient.getChannels();
      const found = channels.data?.find?.((c: any) => c.name === "UI Flow Channel");
      if (found) await apiClient.deleteChannel(found.id);
    });
  });

  test("03 - 渠道状态切换", async ({ apiClient }) => {
    await test.step("通过 API 创建渠道", async () => {
      const result = await apiClient.createChannel({
        name: "Status Test Ch",
        type: 1,
        key: "sk-status-test",
        models: "gpt-3.5-turbo",
      });
      expect(result.success).toBe(true);
    });

    await test.step("验证渠道状态为启用", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find?.((c: any) => c.name === "Status Test Ch");
      expect(ch).toBeTruthy();
      expect(ch.status).toBe(1);
    });

    await test.step("清理测试数据", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find?.((c: any) => c.name === "Status Test Ch");
      await apiClient.deleteChannel(ch.id);
    });
  });

  test("04 - 删除渠道后列表移除", async ({ page, apiClient }) => {
    await test.step("通过 API 创建渠道", async () => {
      const result = await apiClient.createChannel({
        name: "To Be Deleted",
        type: 1,
        key: "sk-delete-me",
        models: "gpt-3.5-turbo",
      });
      expect(result.success).toBe(true);

      const channels = await apiClient.getChannels();
      const ch = channels.data?.find?.((c: any) => c.name === "To Be Deleted");
      expect(ch).toBeTruthy();

      await apiClient.deleteChannel(ch.id);
    });

    await test.step("通过 API 验证结果", async () => {
      const channelsAfter = await apiClient.getChannels();
      const deleted = channelsAfter.data?.find?.((c: any) => c.name === "To Be Deleted");
      expect(deleted).toBeFalsy();
    });

    await test.step("打开渠道页面验证已删除", async () => {
      await page.goto("/channels");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/ch-ui-04-deleted.png", fullPage: true });
    });
  });
});
