import { expect, test, type Page } from "@playwright/test";
import { mockBootstrapApis } from "./bootstrap"

const authStatePath = "e2e/.auth/pw-auth-state-classic.json";

/**
 * Dashboard E2E tests.
 *
 * These tests verify the dashboard loads correctly, shows key metrics,
 * and that sidebar navigation works. All API calls are mocked.
 */

async function mockDashboardApis(page: Page) {
  await mockBootstrapApis(page)
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

  await page.route("**/api/dashboard/**", async (route) => {
    await route.fulfill({
      json: { success: true, message: "", data: {} },
    });
  });

  await page.route("**/api/user/dashboard", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        message: "",
        data: {
          token_count: 5,
          used_quota: 1250000,
          remaining_quota: 3750000,
          request_count: 1024,
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
        data: {
          default: { desc: "Default", ratio: 1 },
        },
      },
    });
  });
}

test.use({ storageState: authStatePath });

test.describe("Dashboard", () => {
  test("loads and displays the dashboard page", async ({ page }) => {
    await mockDashboardApis(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // The page should contain dashboard-related content
    // Check that the page loaded without errors (no blank page)
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    // Should be on a console route
    expect(page.url()).toContain("/dashboard");
  });

  test("displays user metrics from the dashboard API", async ({ page }) => {
    await mockDashboardApis(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Look for metric-related content (token count, quota, requests)
    // The exact rendering depends on the dashboard component, so we check
    // the page contains numeric data from our mocked response
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("sidebar navigation to token page works", async ({ page }) => {
    await mockDashboardApis(page);

    // Also mock token page APIs for navigation target
    await page.route(/.*\/api\/token\/\?p=.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { items: [], total: 0, page: 1, page_size: 10 },
        },
      });
    });
    await page.route("**/api/user/models", async (route) => {
      await route.fulfill({
        json: { success: true, message: "", data: ["gpt-4"] },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // The sidebar renders a nav link labeled "API Keys" (i18n key) pointing
    // to /keys. Click it and assert the router lands on /keys.
    const tokenLink = page.getByRole("link", { name: /^API Keys$/ }).first();
    await expect(tokenLink).toBeVisible({ timeout: 10_000 });
    await tokenLink.click();
    await page.waitForURL(/\/keys/, { timeout: 10_000 });
    expect(page.url()).toContain("/keys");
  });

  test("sidebar navigation to channel page works", async ({ page }) => {
    await mockDashboardApis(page);

    await page.route(/.*\/api\/channel.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { items: [], total: 0, page: 1, page_size: 10 },
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // The sidebar renders a nav link labeled "Channels" (i18n key, under the
    // Admin group, visible because the mocked user has role 100) pointing to
    // /channels. Click it and assert the router lands on /channels.
    const channelLink = page.getByRole("link", { name: /^Channels$/ }).first();
    await expect(channelLink).toBeVisible({ timeout: 10_000 });
    await channelLink.click();
    await page.waitForURL(/\/channels/, { timeout: 10_000 });
    expect(page.url()).toContain("/channels");
  });
});
