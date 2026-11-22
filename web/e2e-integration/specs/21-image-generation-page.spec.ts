import { test, expect } from "../fixtures";

test.describe("图片生成页面", () => {
  test("01 - 配置图片生成 URL", async ({ apiClient }) => {
    await test.step("通过 API 设置图片生成 URL", async () => {
      const result = await apiClient.updateOption("ImageGenerationUrl", "https://example.com/image-gen");
      expect(result.success).toBe(true);
    });

    await test.step("通过状态接口验证配置生效", async () => {
      const PORT = process.env.INTEGRATION_PORT || "14000";
      const resp = await fetch(`http://localhost:${PORT}/api/status`);
      const status = await resp.json();
      expect(status.data?.image_generation_url).toBe("https://example.com/image-gen");
    });
  });

  test("02 - 图片生成页面加载", async ({ page }) => {
    await test.step("打开图片生成页面", async () => {
      await page.goto("/image-gen");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证页面加载", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/image-gen-02-page.png", fullPage: true });
      await test.info().attach("image-gen-02-page", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/image-gen|sign-in/);
    });
  });

  test("03 - 图片生成设置页面渲染", async ({ page }) => {
    await test.step("打开内容设置页面", async () => {
      await page.goto("/system-settings/content");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证设置页面加载", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/image-gen-03-settings.png", fullPage: true });
      await test.info().attach("image-gen-03-settings", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/system-settings|sign-in/);
    });
  });

  test("04 - 清理图片生成 URL 配置", async ({ apiClient }) => {
    await test.step("通过 API 清空配置", async () => {
      const result = await apiClient.updateOption("ImageGenerationUrl", "");
      expect(result.success).toBe(true);
    });
  });
});
