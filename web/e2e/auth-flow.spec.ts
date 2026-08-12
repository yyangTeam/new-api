import { expect, test } from "@playwright/test";

/**
 * Auth flow E2E tests.
 *
 * These tests verify the sign-in page rendering, form validation, and
 * successful login redirect. All API calls are mocked.
 */

// Override storageState for auth tests - we need an unauthenticated session
test.use({ storageState: { cookies: [], origins: [] } });

function mockStatusApi(page: import("@playwright/test").Page) {
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

test.describe("Sign-in page", () => {
  test("renders the sign-in form with username and password fields", async ({
    page,
  }) => {
    await mockStatusApi(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });
    await page.goto("/sign-in");
    await page.waitForLoadState("load");

    await expect(
      page.getByRole("textbox", { name: /username/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation error when submitting empty form", async ({
    page,
  }) => {
    await mockStatusApi(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });
    await page.goto("/sign-in");
    await page.waitForLoadState("load");

    await page.getByRole("button", { name: /sign in/i }).click();

    // The form should show validation feedback (either native or custom)
    const usernameInput = page.getByRole("textbox", { name: /username/i });
    const isInvalid =
      (await usernameInput.getAttribute("aria-invalid")) === "true" ||
      (await usernameInput.evaluate(
        (el: HTMLInputElement) => !el.checkValidity(),
      ));
    expect(isInvalid).toBe(true);
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await mockStatusApi(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    // Mock the login API
    await page.route("**/api/user/login", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "Login successful",
          data: {
            token:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6MTAwLCJleHAiOjk5OTk5OTk5OTl9.fake-sig",
            username: "admin",
            role: 100,
          },
        },
      });
    });

    // Mock the dashboard data endpoints
    await page.route("**/api/dashboard/**", async (route) => {
      await route.fulfill({ json: { success: true, message: "", data: {} } });
    });

    await page.goto("/sign-in");
    await page.waitForLoadState("load");

    await page.getByRole("textbox", { name: /username/i }).fill("admin");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to console/dashboard after successful login
    await page.waitForURL(/\/console/, { timeout: 10_000 });
    expect(page.url()).toContain("/console");
  });
});
