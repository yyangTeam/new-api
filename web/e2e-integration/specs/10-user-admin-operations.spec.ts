import { test, expect } from "../fixtures";

test.describe("用户管理员操作", () => {
  test("01 - 创建用户并管理额度", async ({ page, apiClient }) => {
    await test.step("通过 API 创建用户", async () => {
      const result = await apiClient.createUser({
        username: "quotauser",
        password: "testpass12345",
        display_name: "Quota User",
      });
      expect(result.success).toBe(true);
    });

    await test.step("通过 API 添加额度", async () => {
      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "quotauser");
      expect(user).toBeTruthy();

      const manageResult = await apiClient.manageUser({
        id: user.id,
        action: "add_quota",
        value: 1000000,
      });
      expect(manageResult.success).toBe(true);
    });

    await test.step("打开用户页面验证显示", async () => {
      await page.goto("/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/usr-admin-01-quota-set.png", fullPage: true });
    });

    await test.step("清理测试数据", async () => {
      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "quotauser");
      await apiClient.deleteUser(user.id);
    });
  });

  test("02 - 禁用和启用用户", async ({ page, apiClient }) => {
    await test.step("通过 API 创建用户", async () => {
      await apiClient.createUser({
        username: "banuser",
        password: "testpass12345",
        display_name: "Ban User",
      });

      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "banuser");
      expect(user).toBeTruthy();
    });

    await test.step("禁用用户并验证状态", async () => {
      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "banuser");

      const banResult = await apiClient.manageUser({ id: user.id, action: "disable" });
      expect(banResult.success).toBe(true);

      const usersAfterBan = await apiClient.getUsers();
      const bannedUser = usersAfterBan.data?.find?.((u: any) => u.username === "banuser");
      expect(bannedUser?.status).toBe(2);
    });

    await test.step("启用用户并打开用户页面", async () => {
      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "banuser");

      const unbanResult = await apiClient.manageUser({ id: user.id, action: "enable" });
      expect(unbanResult.success).toBe(true);

      await page.goto("/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/usr-admin-02-ban-unban.png", fullPage: true });
    });

    await test.step("清理测试数据", async () => {
      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "banuser");
      await apiClient.deleteUser(user.id);
    });
  });

  test("03 - 修改用户角色", async ({ page, apiClient }) => {
    await test.step("通过 API 创建用户", async () => {
      await apiClient.createUser({
        username: "roleuser",
        password: "testpass12345",
        display_name: "Role User",
      });

      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "roleuser");
      expect(user).toBeTruthy();
    });

    await test.step("提升用户为管理员并验证", async () => {
      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "roleuser");

      const roleResult = await apiClient.manageUser({ id: user.id, action: "promote" });
      expect(roleResult.success).toBe(true);

      const usersAfter = await apiClient.getUsers();
      const promoted = usersAfter.data?.find?.((u: any) => u.username === "roleuser");
      expect(promoted?.role).toBe(10);
    });

    await test.step("打开用户页面验证角色变更", async () => {
      await page.goto("/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/usr-admin-03-role-change.png", fullPage: true });
    });

    await test.step("清理测试数据", async () => {
      const users = await apiClient.getUsers();
      const user = users.data?.find?.((u: any) => u.username === "roleuser");
      await apiClient.deleteUser(user.id);
    });
  });

  test("04 - 用户页面显示多个用户", async ({ page, apiClient }) => {
    await test.step("通过 API 创建多个用户", async () => {
      await apiClient.createUser({ username: "multi1", password: "testpass12345" });
      await apiClient.createUser({ username: "multi2", password: "testpass12345" });
      await apiClient.createUser({ username: "multi3", password: "testpass12345" });
    });

    await test.step("打开用户页面验证显示多个用户", async () => {
      await page.goto("/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "integration-results/usr-admin-04-multiple.png", fullPage: true });

      const users = await apiClient.getUsers();
      const testUsers = users.data?.filter?.((u: any) => u.username?.startsWith("multi"));
      expect(testUsers?.length).toBeGreaterThanOrEqual(3);
    });

    await test.step("清理测试数据", async () => {
      const users = await apiClient.getUsers();
      const testUsers = users.data?.filter?.((u: any) => u.username?.startsWith("multi"));
      for (const u of testUsers || []) {
        await apiClient.deleteUser(u.id);
      }
    });
  });
});
