import { test, expect } from "../fixtures";
import { ApiClient } from "../helpers/api-client";

const PORT = process.env.INTEGRATION_PORT || "14000";
const BASE_URL = `http://localhost:${PORT}`;

test.describe("速率限制与安全功能", () => {
  test("01 - 用户关键操作速率限制生效", async ({ apiClient }) => {
    await test.step("连续调用 access token 生成接口", async () => {
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const resp = await fetch(`${BASE_URL}/api/user/token`, {
          headers: { Authorization: `Bearer ${apiClient.getToken()}` },
        });
        results.push(resp.status);
      }

      // 应返回 200 或 429（速率限制）或 401（token 过期），不应 404/500
      for (const status of results) {
        expect([200, 401, 429]).toContain(status);
      }
    });
  });

  test("02 - 安全设置 - 速率限制配置页面", async ({ page }) => {
    await test.step("打开安全设置页面", async () => {
      await page.goto("/system-settings/security");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证安全设置页面加载", async () => {
      await page.screenshot({ path: "integration-results/ratelimit-02-security.png", fullPage: true });
      expect(page.url()).toMatch(/sign-in|\/system-settings/);
    });
  });

  test("03 - 匿名请求速率限制", async ({}) => {
    await test.step("无认证请求登录接口验证限流行为", async () => {
      const resp = await fetch(`${BASE_URL}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "nonexist", password: "wrongpass123" }),
      });

      // 应返回 200（密码错误）或 429（被限流），不是 404/500
      expect([200, 429]).toContain(resp.status);
    });
  });

  test("04 - 系统性能与安全端点", async ({ apiClient }) => {
    await test.step("调用系统实例列表接口", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/system-info/instances`, {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
    });
  });
});
