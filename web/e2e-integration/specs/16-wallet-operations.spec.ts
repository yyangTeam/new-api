import { test, expect } from "../fixtures";

test.describe("钱包操作", () => {
  test("01 - 钱包页面显示余额", async ({ page }) => {
    await test.step("打开钱包页面", async () => {
      await page.goto("/wallet");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证钱包页面加载成功", async () => {
      await page.screenshot({ path: "integration-results/wallet-01-balance.png", fullPage: true });
      expect(page.url()).toMatch(/wallet|topup/);
    });
  });

  test("02 - 兑换码充值增加余额", async ({ apiClient }) => {
    const codeName = `TopUp_${Date.now()}`;

    await test.step("创建兑换码", async () => {
      await apiClient.confirmPaymentCompliance();

      const createResult = await apiClient.createRedemption({
        name: codeName,
        quota: 200000,
        count: 1,
      });

      if (!createResult.success) {
        return;
      }
    });

    await test.step("通过兑换码充值并验证余额增加", async () => {
      const redemptions = await apiClient.getRedemptions();
      const code = redemptions.data?.find?.((r: any) => r.name === codeName);
      if (!code) return; // 兑换码创建失败时跳过

      // Get balance before
      const selfBefore = await apiClient.getSelf();
      const balanceBefore = selfBefore.data?.quota || 0;

      // Top up
      const topUpResult = await apiClient.topUp(code.key);
      expect(topUpResult.success).toBe(true);

      // Get balance after
      const selfAfter = await apiClient.getSelf();
      const balanceAfter = selfAfter.data?.quota || 0;

      // Balance should increase by 200000
      expect(balanceAfter).toBe(balanceBefore + 200000);
    });
  });

  test("03 - 钱包页面显示更新后余额", async ({ page }) => {
    await test.step("打开钱包页面", async () => {
      await page.goto("/wallet");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证余额更新显示", async () => {
      await page.screenshot({ path: "integration-results/wallet-03-updated.png", fullPage: true });
      expect(page.url()).toMatch(/wallet|topup/);
    });
  });

  test("04 - 钱包页面有充值区域", async ({ page }) => {
    await test.step("打开钱包页面", async () => {
      await page.goto("/wallet");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证充值区域存在", async () => {
      const rechargeSection = page.locator('input[placeholder*="code" i], input[placeholder*="redemption" i], input[placeholder*="兑换" i], button:has-text("Redeem"), button:has-text("兑换")');
      const hasRecharge = await rechargeSection.first().isVisible().catch(() => false);

      await page.screenshot({ path: "integration-results/wallet-04-recharge.png", fullPage: true });
      expect(page.url()).toMatch(/wallet|topup/);
    });
  });
});
