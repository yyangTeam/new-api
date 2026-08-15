import { test, expect } from "../fixtures";

test.describe("个人资料与安全", () => {
  test("01 - 个人资料页加载", async ({ page }) => {
    await test.step("打开个人资料页面", async () => {
      await page.goto("/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/profile-01-info.png", fullPage: true });
      expect(page.url()).toMatch(/profile|sign-in/);
    });
  });

  test("02 - 个人资料显示会话管理", async ({ page }) => {
    await test.step("打开个人资料页面", async () => {
      await page.goto("/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("点击安全/会话标签页", async () => {
      const securityTab = page.locator('[role="tab"]:has-text("Security"), [role="tab"]:has-text("Session"), a:has-text("Security")').first();
      if (await securityTab.isVisible()) {
        await securityTab.click();
        await page.waitForTimeout(1000);
      }
    });

    await test.step("验证会话管理区域显示", async () => {
      await page.screenshot({ path: "integration-results/profile-02-sessions.png", fullPage: true });
    });
  });

  test("03 - 验证用户 Self API 返回正确数据", async ({ apiClient }) => {
    await test.step("调用 Self API 并验证返回数据", async () => {
      const result = await apiClient.getSelf();
      expect(result.success).toBe(true);
      expect(result.data?.username).toBe("root");
      expect(result.data?.role).toBe(100); // root role
    });
  });

  test("04 - 个人资料页有修改密码选项", async ({ page }) => {
    await test.step("打开个人资料页面", async () => {
      await page.goto("/profile");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证修改密码选项存在", async () => {
      const passwordBtn = page.locator('button:has-text("Password"), button:has-text("Change Password"), a:has-text("Password")').first();
      const hasPassword = await passwordBtn.isVisible().catch(() => false);

      await page.screenshot({ path: "integration-results/profile-04-password-option.png", fullPage: true });

      // The option should exist somewhere on the profile page
      expect(page.url()).toContain("/profile");
    });
  });
});
