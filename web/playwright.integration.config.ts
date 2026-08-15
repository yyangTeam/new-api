import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.INTEGRATION_PORT || "14000";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  globalSetup: "./e2e-integration/global-setup.ts",
  globalTeardown: "./e2e-integration/global-teardown.ts",
  testDir: "./e2e-integration/specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "integration-report", open: "never" }],
    ["list"],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "on",
    video: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: "setup",
      testMatch: "01-setup-and-login.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      dependencies: ["setup"],
      testMatch: /(?:0[2-9]|[12][0-9])-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(
          __dirname,
          "e2e-integration/.auth/integration-auth.json"
        ),
      },
    },
  ],

  outputDir: "integration-results",
  timeout: 60_000,
});
