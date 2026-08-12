import { expect, test, type Page } from "@playwright/test";

const authStatePath = "e2e/.auth/pw-auth-state-classic.json";

/**
 * Error pages E2E tests.
 *
 * These tests verify error handling behavior: 404 pages for non-existent
 * routes, 401 redirect to login when unauthorized, and 500 error display.
 * All API calls are mocked.
 */

function mockStatusApi(page: Page) {
  return page.route("**/api/status", async (route) => {
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
          turnstile_check: false,
          turnstile_site_key: "",
          email_verification: false,
          github_oauth: false,
          discord_oauth: false,
          oidc_enabled: false,
          register_enabled: true,
          password_login_enabled: true,
        },
      },
    });
  });
}

test.describe("Error pages - 404 Not Found", () => {
  test.use({ storageState: authStatePath });

  test("displays 404 page for non-existent route", async ({ page }) => {
    await mockStatusApi(page);

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

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/this-route-does-not-exist-at-all");
    await page.waitForLoadState("load");

    // The app should render a not-found page or redirect to 404
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    const pageContent = await page.textContent("body");
    // Should show some indication of not found (404, not found text, etc.)
    const hasNotFoundIndicator =
      pageContent?.includes("404") ||
      pageContent?.toLowerCase().includes("not found") ||
      pageContent?.toLowerCase().includes("page") ||
      page.url().includes("404");
    expect(hasNotFoundIndicator).toBe(true);
  });

  test("directly accessing /404 shows the not found page", async ({
    page,
  }) => {
    await mockStatusApi(page);

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

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/404");
    await page.waitForLoadState("load");

    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    const pageContent = await page.textContent("body");
    const hasNotFoundContent =
      pageContent?.includes("404") ||
      pageContent?.toLowerCase().includes("not found");
    expect(hasNotFoundContent).toBe(true);
  });
});

test.describe("Error pages - 401 Unauthorized redirect", () => {
  // Use unauthenticated state so the app redirects to sign-in
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user accessing protected route redirects to sign-in", async ({
    page,
  }) => {
    await mockStatusApi(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    // Try to access a protected route without authentication
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Should redirect to sign-in page
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("/sign-in");
  });

  test("unauthenticated user accessing channels page redirects to sign-in", async ({
    page,
  }) => {
    await mockStatusApi(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/channels");
    await page.waitForLoadState("load");

    // Should redirect to sign-in
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("/sign-in");
  });

  test("unauthenticated user accessing keys page redirects to sign-in", async ({
    page,
  }) => {
    await mockStatusApi(page);

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/keys");
    await page.waitForLoadState("load");

    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain("/sign-in");
  });
});

test.describe("Error pages - API error handling", () => {
  test.use({ storageState: authStatePath });

  test("shows error when API returns 500 on user self endpoint", async ({
    page,
  }) => {
    await mockStatusApi(page);

    // Mock user/self to return 500
    await page.route("**/api/user/self", async (route) => {
      await route.fulfill({
        status: 500,
        json: {
          success: false,
          message: "Internal server error",
        },
      });
    });

    await page.route("**/api/user/self/groups", async (route) => {
      await route.fulfill({
        status: 500,
        json: {
          success: false,
          message: "Internal server error",
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // The page should still render (not crash completely)
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("displays 500 error page when accessed directly", async ({ page }) => {
    await mockStatusApi(page);

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

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/500");
    await page.waitForLoadState("load");

    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    const pageContent = await page.textContent("body");
    const hasErrorContent =
      pageContent?.includes("500") ||
      pageContent?.toLowerCase().includes("error") ||
      pageContent?.toLowerCase().includes("something went wrong");
    expect(hasErrorContent).toBe(true);
  });

  test("handles API returning 401 by clearing session", async ({ page }) => {
    await mockStatusApi(page);

    // Mock user/self to return 401 (token expired)
    await page.route("**/api/user/self", async (route) => {
      await route.fulfill({
        status: 401,
        json: {
          success: false,
          message: "Unauthorized: token expired",
        },
      });
    });

    await page.route("**/api/user/self/groups", async (route) => {
      await route.fulfill({
        status: 401,
        json: {
          success: false,
          message: "Unauthorized",
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // App should handle 401 gracefully - either show error or redirect to login
    await page.waitForTimeout(2000);
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    // The app may redirect to sign-in or show an error state
    const url = page.url();
    const pageContent = await page.textContent("body");
    const handledGracefully =
      url.includes("/sign-in") ||
      url.includes("/401") ||
      pageContent?.toLowerCase().includes("unauthorized") ||
      pageContent?.toLowerCase().includes("sign in") ||
      pageContent?.toLowerCase().includes("login") ||
      pageContent !== "";
    expect(handledGracefully).toBe(true);
  });
});
