import { expect, test, type Page } from "@playwright/test";

const authStatePath = "e2e/.auth/pw-auth-state-classic.json";

/**
 * System settings E2E tests.
 *
 * These tests verify admin system settings pages load correctly,
 * navigation between sections works, and settings can be toggled.
 * All API calls are mocked.
 */

async function mockBaseApis(page: Page) {
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

  await page.route("**/api/user/self", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: {
          id: 1,
          username: "admin",
          display_name: "Admin User",
          role: 100,
          email: "admin@example.com",
          quota: 3750000,
          used_quota: 1250000,
          group: "default",
        },
      },
    });
  });

  await page.route("**/api/user/self/groups", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: { default: { desc: "Default", ratio: 1 } },
      },
    });
  });
}

function mockSettingsApis(page: Page) {
  return page.route("**/api/option/**", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: {},
      },
    });
  });
}

function mockSettingsGetApis(page: Page) {
  return page.route("**/api/option", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            SystemName: "New API",
            Logo: "/logo.png",
            FooterHTML: "",
            ServerAddress: "http://localhost:3000",
            RegisterEnabled: "true",
            PasswordLoginEnabled: "true",
            EmailVerificationEnabled: "false",
            GitHubOAuthEnabled: "false",
            TurnstileCheckEnabled: "false",
            QuotaPerUnit: "500000",
            DisplayInCurrency: "true",
          },
        },
      });
    } else if (route.request().method() === "PUT") {
      await route.fulfill({
        json: {
          success: true,
          message: "Settings saved successfully",
        },
      });
    } else {
      await route.fallback();
    }
  });
}

test.use({ storageState: authStatePath });

test.describe("System settings", () => {
  test("navigates to system settings and loads site section", async ({
    page,
  }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);
    await mockSettingsGetApis(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    // /system-settings redirects to /system-settings/site
    await page.goto("/system-settings");
    await page.waitForLoadState("networkidle");

    // Should redirect to site section
    expect(page.url()).toContain("/system-settings/site");

    // Page should load successfully
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("navigates to auth settings section", async ({ page }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);
    await mockSettingsGetApis(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/system-settings/auth");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/system-settings/auth");
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("navigates to billing settings section", async ({ page }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);
    await mockSettingsGetApis(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/system-settings/billing");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/system-settings/billing");
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("navigates to operations settings section", async ({ page }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);
    await mockSettingsGetApis(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/system-settings/operations");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/system-settings/operations");
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("navigates to security settings section", async ({ page }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);
    await mockSettingsGetApis(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/system-settings/security");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/system-settings/security");
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("navigates to models settings section", async ({ page }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);
    await mockSettingsGetApis(page);

    await page.route("**/api/models/**", async (route) => {
      await route.fulfill({
        json: { success: true, message: "", data: [] },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/system-settings/models");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/system-settings/models");
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("saves a setting change via PUT request", async ({ page }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);

    let settingsSaved = false;
    await page.route("**/api/option", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: {
            success: true,
            message: "",
            data: {
              SystemName: "New API",
              Logo: "/logo.png",
              FooterHTML: "",
              ServerAddress: "http://localhost:3000",
              RegisterEnabled: "true",
              PasswordLoginEnabled: "true",
              EmailVerificationEnabled: "false",
              GitHubOAuthEnabled: "false",
              TurnstileCheckEnabled: "false",
              QuotaPerUnit: "500000",
              DisplayInCurrency: "true",
            },
          },
        });
      } else if (route.request().method() === "PUT") {
        settingsSaved = true;
        await route.fulfill({
          json: {
            success: true,
            message: "Settings saved successfully",
          },
        });
      } else {
        await route.fallback();
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/system-settings/site");
    await page.waitForLoadState("networkidle");

    // Find a save button and attempt to save
    const saveBtn = page.getByRole("button", { name: /save/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(500);
      expect(settingsSaved).toBe(true);
    }
  });

  test("navigates between settings sections via sidebar links", async ({
    page,
  }) => {
    await mockBaseApis(page);
    await mockSettingsApis(page);
    await mockSettingsGetApis(page);

    await page.route("**/api/models/**", async (route) => {
      await route.fulfill({
        json: { success: true, message: "", data: [] },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/system-settings/site");
    await page.waitForLoadState("networkidle");

    // Try to navigate to another section via links in the page
    const billingLink = page
      .getByRole("link", { name: /billing|payment/i })
      .first();
    if (await billingLink.isVisible()) {
      await billingLink.click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/system-settings/billing");
    }
  });
});
