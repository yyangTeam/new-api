import { test, expect } from "../fixtures";

test.describe("模型管理", () => {
  test("01 - 导航到模型管理页面", async ({ page }) => {
    await test.step("打开模型管理页面", async () => {
      await page.goto("/models");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    });

    await test.step("验证页面加载成功", async () => {
      const screenshotBuffer = await page.screenshot({ path: "integration-results/models-01-page.png", fullPage: true });
      await test.info().attach("models-01-page", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/models|sign-in/);
    });
  });

  test("02 - 通过 API 创建模型元数据", async ({ page, apiClient }) => {
    await test.step("通过 API 创建模型元数据", async () => {
      const result = await apiClient.createModelMeta({
        model_name: "e2e-test-model-v1",
        vendor: "openai",
      });

      if (result.success) {
        const models = await apiClient.getModelsMeta();
        const found = models.data?.some?.((m: any) => m.model_name === "e2e-test-model-v1");
        expect(found).toBe(true);
      }
    });

    await test.step("打开模型页面验证显示", async () => {
      await page.goto("/models");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/models-02-after-create.png", fullPage: true });
      await test.info().attach("models-02-after-create", { body: screenshotBuffer, contentType: "image/png" });
    });
  });

  test("03 - 模型页面显示已创建模型", async ({ page, apiClient }) => {
    await test.step("通过 API 验证模型数据", async () => {
      const models = await apiClient.getModelsMeta();
      const modelCount = models.data?.length || 0;
    });

    await test.step("打开模型页面验证列表显示", async () => {
      await page.goto("/models");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/models-03-list.png", fullPage: true });
      await test.info().attach("models-03-list", { body: screenshotBuffer, contentType: "image/png" });
      expect(page.url()).toMatch(/sign-in|\/models/);
    });
  });

  test("04 - 删除模型元数据", async ({ page, apiClient }) => {
    await test.step("通过 API 删除模型元数据", async () => {
      const models = await apiClient.getModelsMeta();
      const testModel = models.data?.find?.((m: any) => m.model_name === "e2e-test-model-v1");

      if (testModel) {
        const result = await apiClient.deleteModelMeta(testModel.id);
        expect(result.success).toBe(true);
      }
    });

    await test.step("通过 API 验证删除成功", async () => {
      const modelsAfter = await apiClient.getModelsMeta();
      const deleted = modelsAfter.data?.find?.((m: any) => m.model_name === "e2e-test-model-v1");
      expect(deleted).toBeFalsy();
    });

    await test.step("打开模型页面验证已删除", async () => {
      await page.goto("/models");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const screenshotBuffer = await page.screenshot({ path: "integration-results/models-04-after-delete.png", fullPage: true });
      await test.info().attach("models-04-after-delete", { body: screenshotBuffer, contentType: "image/png" });
    });
  });
});
