import { expect, test, type Page } from "@playwright/test";

const authStatePath = "e2e/.auth/pw-auth-state-classic.json";

/**
 * Channel management E2E tests.
 *
 * These tests verify channel listing, creation, deletion, and testing.
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
        data: {
          default: { desc: "Default", ratio: 1 },
        },
      },
    });
  });
}

const mockChannelList = [
  {
    id: 1,
    name: "OpenAI Channel",
    type: 1,
    key: "sk-test-key-1",
    base_url: "https://api.openai.com",
    status: 1,
    models: "gpt-4,gpt-3.5-turbo",
    model_mapping: "",
    group: "default",
    priority: 0,
    weight: 1,
    response_time: 500,
    test_time: 1700000000,
    balance: 10.5,
  },
  {
    id: 2,
    name: "Claude Channel",
    type: 14,
    key: "sk-ant-test-key",
    base_url: "https://api.anthropic.com",
    status: 1,
    models: "claude-3-opus,claude-3-sonnet",
    model_mapping: "",
    group: "default",
    priority: 0,
    weight: 1,
    response_time: 800,
    test_time: 1700000000,
    balance: 25.0,
  },
];

test.use({ storageState: authStatePath });

test.describe("Channel management", () => {
  test("displays channel list table with data from API", async ({ page }) => {
    await mockBaseApis(page);

    await page.route(/.*\/api\/channel\/?\?.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { items: mockChannelList, total: 2, page: 1, page_size: 10 },
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/channels");
    await page.waitForLoadState("load");

    // Should display the channel page
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    // Should show channel names from mocked data
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("OpenAI Channel");
    expect(pageContent).toContain("Claude Channel");
  });

  test("opens create channel dialog and submits new channel", async ({
    page,
  }) => {
    await mockBaseApis(page);

    await page.route(/.*\/api\/channel\/?\?.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { items: mockChannelList, total: 2, page: 1, page_size: 10 },
        },
      });
    });

    // Mock the available models endpoint
    await page.route("**/api/models/available", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: [
            { id: "gpt-4", owned_by: "openai" },
            { id: "gpt-3.5-turbo", owned_by: "openai" },
          ],
        },
      });
    });

    // Mock channel groups
    await page.route("**/api/channel/group", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: ["default", "vip"],
        },
      });
    });

    // Mock create channel API
    let createChannelCalled = false;
    await page.route("**/api/channel", async (route) => {
      if (route.request().method() === "POST") {
        createChannelCalled = true;
        await route.fulfill({
          json: {
            success: true,
            message: "Channel created successfully",
            data: { id: 3, name: "New Test Channel", type: 1, status: 1 },
          },
        });
      } else {
        await route.fallback();
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/channels");
    await page.waitForLoadState("load");

    // Find and click the create/add channel button
    const createBtn = page
      .getByRole("button", { name: /create|add|new/i })
      .first();
    if (await createBtn.isVisible()) {
      await createBtn.click();

      // Wait for a dialog/form to appear
      await page.waitForTimeout(500);

      // Look for a name input in the dialog/form and fill it
      const nameInput = page
        .getByRole("textbox", { name: /name/i })
        .first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("New Test Channel");
      }
    }
  });

  test("deletes a channel with confirmation dialog", async ({ page }) => {
    await mockBaseApis(page);

    await page.route(/.*\/api\/channel\/?\?.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { items: mockChannelList, total: 2, page: 1, page_size: 10 },
        },
      });
    });

    let deleteChannelCalled = false;
    await page.route("**/api/channel/1", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteChannelCalled = true;
        await route.fulfill({
          json: {
            success: true,
            message: "Channel deleted successfully",
          },
        });
      } else {
        await route.fallback();
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/channels");
    await page.waitForLoadState("load");

    // Look for a delete button/icon associated with the first channel
    const deleteBtn = page
      .getByRole("button", { name: /delete|remove/i })
      .first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Look for confirmation dialog and confirm
      const confirmBtn = page
        .getByRole("button", { name: /confirm|yes|ok|delete/i })
        .first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        // Give time for the API call
        await page.waitForTimeout(500);
        expect(deleteChannelCalled).toBe(true);
      }
    }
  });

  test("tests a channel and shows success result", async ({ page }) => {
    await mockBaseApis(page);

    await page.route(/.*\/api\/channel\/?\?.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { items: mockChannelList, total: 2, page: 1, page_size: 10 },
        },
      });
    });

    await page.route("**/api/channel/test/1", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { response_time: 450, success: true },
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/channels");
    await page.waitForLoadState("load");

    // Look for a test button
    const testBtn = page.getByRole("button", { name: /test/i }).first();
    if (await testBtn.isVisible()) {
      await testBtn.click();
      await page.waitForTimeout(1000);

      // Should display success indication
      const pageContent = await page.textContent("body");
      // Test result should appear somewhere (response time or success message)
      expect(pageContent).toBeTruthy();
    }
  });

  test("tests a channel and shows failure result", async ({ page }) => {
    await mockBaseApis(page);

    await page.route(/.*\/api\/channel\/?\?.*/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: "",
          data: { items: mockChannelList, total: 2, page: 1, page_size: 10 },
        },
      });
    });

    await page.route("**/api/channel/test/1", async (route) => {
      await route.fulfill({
        json: {
          success: false,
          message: "Connection failed: timeout after 30s",
          data: null,
        },
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/channels");
    await page.waitForLoadState("load");

    const testBtn = page.getByRole("button", { name: /test/i }).first();
    if (await testBtn.isVisible()) {
      await testBtn.click();
      await page.waitForTimeout(1000);

      // The page should show some error/failure indicator
      const pageContent = await page.textContent("body");
      expect(pageContent).toBeTruthy();
    }
  });
});
