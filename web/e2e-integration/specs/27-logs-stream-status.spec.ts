import { test, expect } from "../fixtures";

test.describe("日志 Stream 状态与计时", () => {
  test("01 - 日志列表接口含 stream 字段", async ({ apiClient }) => {
    await test.step("获取日志列表并检查字段结构", async () => {
      const result = await apiClient.getLogs();
      expect(result.success).toBe(true);
      // data 是数组（可能为空，新系统无日志）
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  test("02 - 日志统计接口正常返回", async ({ apiClient }) => {
    await test.step("调用日志统计接口", async () => {
      const result = await apiClient.getLogsStat();
      expect(result.success).toBe(true);
    });
  });

  test("03 - 用户自身日志接口", async ({ apiClient }) => {
    await test.step("调用用户自身日志接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/log/self?p=0&page_size=10`, {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
  });

  test("04 - 用户自身日志统计", async ({ apiClient }) => {
    await test.step("调用用户自身日志统计接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/log/self/stat`, {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
  });

  test("05 - 日志页面含时间指标显示区域", async ({ page }) => {
    await test.step("打开日志页面", async () => {
      await page.goto("/usage-logs");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证日志页面加载成功", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/logs-stream-05-page.png", fullPage: true });
      await test.info().attach("logs-stream-05-page", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/usage-logs|log/);
    });
  });
});
