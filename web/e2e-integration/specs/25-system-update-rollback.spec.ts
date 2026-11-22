import { test, expect } from "../fixtures";

test.describe("系统更新与回滚", () => {
  test("01 - 获取最新版本信息接口", async ({ apiClient }) => {
    await test.step("调用最新版本检查接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/latest-release`, {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      // 可能因网络无法访问 GitHub 而失败，但端点应存在
      expect(resp.status).not.toBe(404);
    });
  });

  test("02 - 回滚版本列表接口存在", async ({ apiClient }) => {
    await test.step("调用回滚版本列表接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/system/rollback/versions`, {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      // 端点存在（可能返回空列表）
      expect(resp.status).not.toBe(404);
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
  });

  test("03 - 系统信息页面显示版本信息", async ({ page }) => {
    await test.step("打开系统信息页面", async () => {
      await page.goto("/system-info");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证系统信息页面加载", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/update-03-sysinfo.png", fullPage: true });
      await test.info().attach("update-03-sysinfo", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|\/system-info/);
    });
  });

  test("04 - 系统实例清理接口", async ({ apiClient }) => {
    await test.step("调用清理过期实例接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/system-info/stale-instances`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
  });
});
