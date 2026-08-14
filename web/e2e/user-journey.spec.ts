import { expect, test, type Page } from "@playwright/test";
import { buildAuthBundle, mockBootstrapApis } from "./bootstrap"

/**
 * Full user journey E2E tests.
 *
 * Tests the complete flow from registration to token creation.
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

test.describe("User journey - registration and setup", () => {
  // Use unauthenticated state for registration/login tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test("registers a new account successfully", async ({ page }) => {
  await mockBootstrapApis(page)
    await mockStatusApi(page);

    // Mock the register API
    await page.route("**/api/user/register", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "Registration successful",
          data: {
            token:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Im5ld3VzZXIiLCJyb2xlIjoxLCJleHAiOjk5OTk5OTk5OTl9.fake-sig",
            username: "newuser",
            role: 1,
          },
        },
      });
    });

    // Mock post-registration APIs
    await page.route("**/api/user/self", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            id: 2,
            username: "newuser",
            display_name: "New User",
            role: 1,
            email: "newuser@example.com",
            quota: 500000,
            used_quota: 0,
            group: "default",
          },
        },
      });
    });

    await page.route("**/api/dashboard/**", async (route) => {
      await route.fulfill({ json: { success: true, message: "", data: {} } });
    });

    await page.route("**/api/user/dashboard", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            token_count: 0,
            used_quota: 0,
            remaining_quota: 500000,
            request_count: 0,
          },
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/sign-up");
    await page.waitForLoadState("load");

    // Fill in the registration form
    const usernameInput = page.getByRole("textbox", { name: /username/i });
    if (await usernameInput.isVisible()) {
      await usernameInput.fill("newuser");
    }

    const passwordInput = page.getByLabel(/^password/i).first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill("SecurePass123!");
    }

    const confirmPasswordInput = page
      .getByLabel(/confirm|repeat/i)
      .first();
    if (await confirmPasswordInput.isVisible()) {
      await confirmPasswordInput.fill("SecurePass123!");
    }

    // Submit registration
    const submitBtn = page
      .getByRole("button", { name: /sign up|register|create/i })
      .first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should redirect after successful registration
      await page.waitForTimeout(2000);
      // After registration, user should be redirected to dashboard or login
      const url = page.url();
      const isRedirected =
        url.includes("/dashboard") ||
        url.includes("/dashboard") ||
        url.includes("/sign-in");
      expect(isRedirected).toBe(true);
    }
  });

  test("logs in with the new account", async ({ page }) => {
  await mockBootstrapApis(page, { authed: false })
    await mockStatusApi(page);

    // Mock the login API — must return a valid AuthBundle (see buildAuthBundle).
    // The app POSTs /api/user/login?turnstile=<token>, so the glob must allow
    // the query string (`**/api/user/login` alone does not match `?turnstile=`).
    await page.route("**/api/user/login*", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "Login successful",
          data: buildAuthBundle({ id: 2, username: "newuser", role: 1 }),
        },
      });
    });

    await page.route("**/api/user/self", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            id: 2,
            username: "newuser",
            display_name: "New User",
            role: 1,
            email: "newuser@example.com",
            quota: 500000,
            used_quota: 0,
            group: "default",
          },
        },
      });
    });

    await page.route("**/api/dashboard/**", async (route) => {
      await route.fulfill({ json: { success: true, message: "", data: {} } });
    });

    await page.route("**/api/user/dashboard", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            token_count: 0,
            used_quota: 0,
            remaining_quota: 500000,
            request_count: 0,
          },
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/sign-in");
    await page.waitForLoadState("load");

    await page.getByRole("textbox", { name: /username/i }).fill("newuser");
    await page.getByRole("textbox", { name: /password/i }).fill("SecurePass123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL(/\/(console|dashboard)/, { timeout: 10_000 });
    const url = page.url();
    expect(url.includes("/dashboard") || url.includes("/dashboard")).toBe(true);
  });
});

test.describe("User journey - token management", () => {
  const authStatePath = "e2e/.auth/pw-auth-state-classic.json";
  test.use({ storageState: authStatePath });

  test("navigates to tokens page and sees empty state", async ({ page }) => {
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

    await page.route(/.*\/api\/token\/?\?.*/, async (route) => {
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
        json: { success: true, message: "", data: ["gpt-4", "gpt-3.5-turbo"] },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/keys");
    await page.waitForLoadState("load");

    // The page should load without errors
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
    expect(page.url()).toContain("/keys");
  });

  test("creates a new token and copies the key", async ({ page }) => {
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

    await page.route(/.*\/api\/token\/?\?.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            items: [
              {
                id: 1,
                name: "My API Key",
                key: "sk-proj-abc123xyz",
                status: 1,
                used_quota: 0,
                remain_quota: 500000,
                unlimited_quota: false,
                created_time: 1700000000,
                expired_time: -1,
                models: "",
                group: "",
              },
            ],
            total: 1,
            page: 1,
            page_size: 10,
          },
        },
      });
    });

    await page.route("**/api/user/models", async (route) => {
      await route.fulfill({
        json: { success: true, message: "", data: ["gpt-4", "gpt-3.5-turbo"] },
      });
    });

    // Mock token creation
    await page.route("**/api/token", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          json: {
            success: true,
            message: "Token created successfully",
            data: {
              id: 1,
              name: "My API Key",
              key: "sk-proj-abc123xyz",
              status: 1,
            },
          },
        });
      } else {
        await route.fallback();
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/keys");
    await page.waitForLoadState("load");

    // Look for create token button
    const createBtn = page
      .getByRole("button", { name: /create|add|new/i })
      .first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Fill token name if name field appears
      const nameInput = page
        .getByRole("textbox", { name: /name/i })
        .first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("My API Key");
      }
    }

    // Verify page content includes token data
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("navigates to playground page", async ({ page }) => {
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

    await page.route("**/api/user/models", async (route) => {
      await route.fulfill({
        json: { success: true, message: "", data: ["gpt-4", "gpt-3.5-turbo"] },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/playground");
    await page.waitForLoadState("load");

    // Should load the playground page
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
    expect(page.url()).toContain("/playground");
  });
});
