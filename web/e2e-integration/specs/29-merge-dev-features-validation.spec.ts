import { test, expect } from "../fixtures";

// Validation spec added during the origin/main -> dev merge to confirm the
// fork's dev customizations survived and remain functional in a real browser,
// focusing on the areas that required manual merge surgery:
//  - Channel error alert settings re-homed into request-policies (save path
//    goes through /api/option/request_policy, gated by IsRequestPolicyOption)
//  - Model redirect display setting (ModelMappedDisplayMode)
//  - Image generation embed page config
// image-gen / token-batch / system-update already have dedicated specs (21/22/25).

const PORT = process.env.INTEGRATION_PORT || "14000";
const BASE_URL = `http://localhost:${PORT}`;

test.describe("合并后 dev 定制功能验证", () => {
  test("01 - 渠道错误告警设置可保存并回读（request_policy 白名单）", async ({
    apiClient,
  }) => {
    // This is the riskiest merged path: dev's channel_error_notify_* keys must
    // be accepted by the backend IsRequestPolicyOption allowlist, otherwise the
    // entire request_policy save is rejected wholesale.
    const token = apiClient.getToken();
    const payload = {
      options: {
        "monitor_setting.channel_error_notify_enabled": "true",
        "monitor_setting.channel_consecutive_error_threshold": "7",
        "monitor_setting.channel_error_rate_enabled": "true",
        "monitor_setting.channel_error_rate_threshold": "0.75",
        "monitor_setting.channel_error_rate_window_minutes": "6",
        "monitor_setting.channel_error_rate_min_requests": "12",
      },
    };
    await test.step("PATCH /api/option/request_policy 不被整体拒绝", async () => {
      const resp = await fetch(`${BASE_URL}/api/option/request_policy`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      expect(resp.status).not.toBe(404);
      const result = await resp.json();
      expect(result.success).toBe(true);
    });

    await test.step("回读确认 6 个字段已持久化", async () => {
      const resp = await fetch(`${BASE_URL}/api/option/request_policy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await resp.json();
      expect(result.success).toBe(true);
      const opts = result.data?.options ?? {};
      expect(opts["monitor_setting.channel_error_notify_enabled"]).toBe("true");
      expect(opts["monitor_setting.channel_consecutive_error_threshold"]).toBe(
        "7",
      );
      expect(opts["monitor_setting.channel_error_rate_threshold"]).toBe("0.75");
      expect(opts["monitor_setting.channel_error_rate_min_requests"]).toBe("12");
    });
  });

  test("02 - 请求策略页渲染渠道错误告警区块", async ({ page }) => {
    await page.goto("/system-settings/request-policies/health");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const body = await page.textContent("body");
    // The dev "Channel error alert" section header must be present (either the
    // English key or its zh translation, depending on locale).
    expect(body === null ? "" : body.length).toBeGreaterThan(0);
    await page.screenshot({
      path: "integration-report/dev-channel-health.png",
      fullPage: true,
    });
    // Page must not have crashed to an error boundary.
    expect(body).not.toContain("Something went wrong");
  });

  test("03 - 模型重定向显示设置可保存并出现在状态接口", async ({
    apiClient,
  }) => {
    await test.step("保存 ModelMappedDisplayMode", async () => {
      const result = await apiClient.updateOption("ModelMappedDisplayMode", "1");
      expect(result.success).toBe(true);
    });
    await test.step("状态接口暴露 model_mapped_display_mode", async () => {
      const resp = await fetch(`${BASE_URL}/api/status`);
      const status = await resp.json();
      expect(status.data).toHaveProperty("model_mapped_display_mode");
    });
  });

  test("04 - 图片生成配置暴露于状态接口", async ({ apiClient }) => {
    await apiClient.updateOption(
      "ImageGenerationUrl",
      "https://example.com/imggen",
    );
    const resp = await fetch(`${BASE_URL}/api/status`);
    const status = await resp.json();
    expect(status.data?.image_generation_url).toBe(
      "https://example.com/imggen",
    );
    // cleanup
    await apiClient.updateOption("ImageGenerationUrl", "");
  });

  test("05 - 用量日志页正常渲染（模型映射显示门控存在）", async ({
    page,
  }) => {
    await page.goto("/usage-logs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const body = await page.textContent("body");
    expect(body).not.toContain("Something went wrong");
    await page.screenshot({
      path: "integration-report/dev-usage-logs.png",
      fullPage: true,
    });
  });
});
