import { test, expect } from "../fixtures";

test.describe("渠道高级功能", () => {
  let channelId: number = 0;

  test("01 - 创建渠道并验证模型列表", async ({ apiClient }) => {
    await test.step("创建包含多模型的渠道", async () => {
      const result = await apiClient.createChannel({
        name: "Advanced Feature Ch",
        type: 1,
        key: "sk-advanced-test",
        base_url: "https://api.openai.com",
        models: "gpt-3.5-turbo,gpt-4,gpt-4-turbo,gpt-4o",
      });
      expect(result.success).toBe(true);
    });

    await test.step("获取渠道 ID 并验证模型", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find((c: any) => c.name === "Advanced Feature Ch");
      expect(ch).toBeTruthy();
      expect(ch.models).toContain("gpt-4");
      channelId = ch.id;
    });
  });

  test("02 - 渠道测试接口（预期失败无真实 key）", async ({ apiClient }) => {
    test.setTimeout(15_000);
    await test.step("获取渠道 ID 并调用测试接口", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find((c: any) => c.name === "Advanced Feature Ch");
      if (!ch) return;

      channelId = ch.id;
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const resp = await fetch(`http://localhost:${PORT}/api/channel/test/${channelId}`, {
          headers: { Authorization: `Bearer ${apiClient.getToken()}` },
          signal: controller.signal,
        });
        expect(resp.status).not.toBe(404);
      } catch (e: any) {
        // Timeout is acceptable (upstream unreachable)
        if (e.name !== "AbortError") throw e;
      } finally {
        clearTimeout(timeout);
      }
    });
  });

  test("03 - 渠道余额查询接口", async ({ apiClient }) => {
    test.setTimeout(15_000);
    await test.step("调用余额更新接口", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find((c: any) => c.name === "Advanced Feature Ch");
      if (!ch) return;

      const PORT = process.env.INTEGRATION_PORT || "14000";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const resp = await fetch(`http://localhost:${PORT}/api/channel/update_balance/${ch.id}`, {
          headers: { Authorization: `Bearer ${apiClient.getToken()}` },
          signal: controller.signal,
        });
        expect(resp.status).not.toBe(404);
      } catch (e: any) {
        if (e.name !== "AbortError") throw e;
      } finally {
        clearTimeout(timeout);
      }
    });
  });

  test("04 - 渠道模型列表接口", async ({ apiClient }) => {
    await test.step("获取所有渠道的模型列表", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/channel/models`, {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
      // 应该包含我们创建渠道的模型
      const models = result.data || [];
      expect(models.length).toBeGreaterThan(0);
    });
  });

  test("05 - 渠道列表搜索功能", async ({ apiClient }) => {
    await test.step("通过关键词搜索渠道", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/channel/search?keyword=Advanced`, {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
  });

  test("06 - 清理测试渠道", async ({ apiClient }) => {
    await test.step("删除测试渠道", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find((c: any) => c.name === "Advanced Feature Ch");
      if (ch) {
        await apiClient.deleteChannel(ch.id);
      }
    });

    await test.step("验证已删除", async () => {
      const channels = await apiClient.getChannels();
      const ch = channels.data?.find((c: any) => c.name === "Advanced Feature Ch");
      expect(ch).toBeFalsy();
    });
  });
});
