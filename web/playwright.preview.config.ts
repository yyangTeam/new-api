import { defineConfig, devices } from "@playwright/test";

/**
 * Preview-only Playwright config for running e2e specs against the Go
 * preview backend (which serves the production SPA on :3000) instead of
 * starting `bun run dev` (which OOMs in this sandbox). NOT used by CI —
 * the regular `playwright test` uses playwright.config.ts with `bun run dev`.
 */
export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
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
});
