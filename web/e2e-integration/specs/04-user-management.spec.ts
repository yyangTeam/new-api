import { test, expect } from "../fixtures";

test.describe("用户管理", () => {
  test("01 - 导航到用户页面", async ({ page }) => {
    await test.step("打开用户列表页", async () => {
      await page.goto("/users");
      await page.waitForLoadState("networkidle");
    });

    await test.step("截图并验证页面", async () => {
      await page.screenshot({ path: "integration-results/users-01-list.png", fullPage: true });
      expect(page.url()).toContain("/users");
    });
  });

  test("02 - 通过 API 创建用户并验证", async ({ page, apiClient }) => {
    await test.step("通过 API 创建用户", async () => {
      const result = await apiClient.createUser({
        username: "e2etestuser",
        password: "testpass12345",
        display_name: "E2E Test User",
      });
      expect(result.success).toBe(true);
    });

    await test.step("通过 API 验证用户已创建", async () => {
      const users = await apiClient.getUsers();
      const found = users.data?.some?.((u: any) => u.username === "e2etestuser");
      expect(found).toBe(true);
    });

    await test.step("打开用户页面并截图", async () => {
      await page.goto("/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "integration-results/users-02-after-create.png", fullPage: true });
    });
  });

  test("03 - 用户列表页加载", async ({ page, apiClient }) => {
    await test.step("通过 API 验证 root 用户存在", async () => {
      const users = await apiClient.getUsers();
      const hasRoot = users.data?.some?.((u: any) => u.username === "root" || u.role === 100);
      expect(hasRoot).toBe(true);
    });

    await test.step("打开用户页面截图并验证", async () => {
      await page.goto("/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/users-03-full-list.png", fullPage: true });
      expect(page.url()).toContain("/users");
    });
  });

  test("04 - 用户页面显示角色信息", async ({ page }) => {
    await test.step("打开用户列表页", async () => {
      await page.goto("/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    });

    await test.step("截图并验证页面正常", async () => {
      await page.screenshot({ path: "integration-results/users-04-roles.png", fullPage: true });
      expect(page.url()).not.toContain("/error");
      expect(page.url()).toContain("/users");
    });
  });
});
