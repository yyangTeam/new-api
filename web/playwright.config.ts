import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for new-api frontend.
 *
 * The dev server (rsbuild) is started automatically via the webServer option.
 * Tests use API mocking (page.route) with a pre-seeded auth state so no real
 * backend is required.
 */
export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  // wallet.spec.ts is a preview-backend spec: it logs in via a real
  // /api/user/login POST against the Go preview server (see
  // playwright.preview.config.ts, which is NOT used by CI). Under this config
  // the rsbuild dev server has no backend, so that POST hangs and times out.
  // Run it locally with `playwright test --config playwright.preview.config.ts`.
  testIgnore: ["**/wallet.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "on",
    video: "on",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/pw-auth-state-classic.json",
      },
    },
  ],

  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
