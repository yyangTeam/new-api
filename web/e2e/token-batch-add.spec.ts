import { expect, test, type Page } from "@playwright/test";

const authStatePath = "e2e/.auth/pw-auth-state-classic.json";

async function mockTokenPageApis(page: Page) {
  await page.route("**/api/status", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: {
          system_name: "New API",
          logo: "/logo.png",
          footer_html: "",
          quota_per_unit: 500000,
          display_in_currency: true,
          quota_display_type: "USD",
          enable_drawing: false,
          enable_task: false,
          enable_data_export: false,
          chats: [],
          data_export_default_time: "hour",
          default_collapse_sidebar: false,
          mj_notify_enabled: false,
          default_use_auto_group: false,
        },
      },
    });
  });

  await page.route(/.*\/api\/token\/\?p=.*/, async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: {
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
        },
      },
    });
  });

  await page.route("**/api/user/models", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: ["gpt-4", "claude-3"],
      },
    });
  });

  await page.route("**/api/user/self/groups", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: {
          default: { desc: "Default", ratio: 1 },
          auto: { desc: "Auto", ratio: 1 },
        },
      },
    });
  });
}

async function goToTokenPage(page: Page) {
  await mockTokenPageApis(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.goto("/console/token");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Batch Add Tokens" })).toBeVisible();
}

async function openBatchAddModal(page: Page) {
  await page.getByRole("button", { name: "Batch Add Tokens" }).click();
  await expect(page.getByText("Token Name List", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Supports one delimiter type per batch: comma .*Chinese comma/,
    ),
  ).toBeVisible();
}

async function fillTokenNames(page: Page, value: string) {
  await page.getByPlaceholder("Example: token-a, token-b, token-c").fill(value);
}

test.use({ storageState: authStatePath });

test.describe("Batch add tokens (classic frontend)", () => {
  test("button opens an independent batch add modal", async ({ page }) => {
    await goToTokenPage(page);

    await openBatchAddModal(page);

    await expect(page.getByText("Set token names and shared configuration")).toBeVisible();
    await expect(page.getByText("Quota Settings")).toBeVisible();
    await expect(page.getByText("Access Limits", { exact: true })).toBeVisible();
    await expect(page.getByText("Please enter token name list")).toBeVisible();
  });

  test("parses comma, semicolon, and whitespace delimiter modes", async ({ page }) => {
    await goToTokenPage(page);
    await openBatchAddModal(page);

    await fillTokenNames(page, "comma-a, comma-b，comma-c");
    await expect(page.getByText("Will create 3 tokens. Full keys will not be shown in the creation result.")).toBeVisible();

    await fillTokenNames(page, "semi-a; semi-b；semi-c");
    await expect(page.getByText("Will create 3 tokens. Full keys will not be shown in the creation result.")).toBeVisible();

    await fillTokenNames(page, "space-a\nspace-b\tspace-c");
    await expect(page.getByText("Will create 3 tokens. Full keys will not be shown in the creation result.")).toBeVisible();
  });

  test("blocks mixed delimiters and invalid name lists before submitting", async ({ page }) => {
    const submittedBodies: unknown[] = [];
    await page.route("**/api/token/batch/create", async (route) => {
      submittedBodies.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { created: 0, failed: 0, items: [], errors: [] },
        },
      });
    });
    await goToTokenPage(page);
    await openBatchAddModal(page);

    await fillTokenNames(page, "mixed-a, mixed-b; mixed-c");
    await expect(page.getByText("Please use only one delimiter")).toBeVisible();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect.poll(() => submittedBodies.length).toBe(0);

    await fillTokenNames(page, "empty-a,,empty-b");
    await expect(page.getByText("Token name cannot be empty")).toBeVisible();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect.poll(() => submittedBodies.length).toBe(0);

    await fillTokenNames(page, "dup-a dup-a");
    await expect(page.getByText("Duplicate names exist in this batch")).toBeVisible();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect.poll(() => submittedBodies.length).toBe(0);

    await fillTokenNames(page, "x".repeat(51));
    await expect(page.getByText("Token name cannot exceed 50 characters")).toBeVisible();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect.poll(() => submittedBodies.length).toBe(0);

    await fillTokenNames(
      page,
      Array.from({ length: 51 }, (_, index) => `too-many-${index}`).join(" "),
    );
    await expect(page.getByText("Token count must be 1-50")).toBeVisible();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect.poll(() => submittedBodies.length).toBe(0);
  });

  test("submits parsed names without exposing full keys in the result", async ({ page }) => {
    const submittedBodies: unknown[] = [];
    await page.route("**/api/token/batch/create", async (route) => {
      submittedBodies.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            created: 3,
            failed: 0,
            items: [
              { name: "api-a", status: "created" },
              { name: "api-b", status: "created" },
              { name: "api-c", status: "created" },
            ],
            errors: [],
          },
        },
      });
    });

    await goToTokenPage(page);
    await openBatchAddModal(page);

    await fillTokenNames(page, "api-a，api-b，api-c");
    await page.getByRole("button", { name: "Never expires" }).click();
    await page.getByRole("button", { name: "Submit" }).click();

    await expect.poll(() => submittedBodies.length).toBe(1);
    expect(submittedBodies[0]).toMatchObject({
      names: ["api-a", "api-b", "api-c"],
      expired_time: -1,
      remain_quota: 0,
      unlimited_quota: true,
      model_limits_enabled: false,
      model_limits: "",
      cross_group_retry: false,
    });
    expect(JSON.stringify(submittedBodies[0])).not.toContain("key");
    await expect(page.getByText("Batch add tokens succeeded. Created 3 tokens.")).toBeVisible();
  });
});
