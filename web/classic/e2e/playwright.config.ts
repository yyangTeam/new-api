import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "fs";

const localBrowserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
      ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      : undefined);
const screenshotMode = process.env.PW_SCREENSHOT === "on" ? "on" : "only-on-failure";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: "http://localhost:5174",
    headless: true,
    screenshot: screenshotMode,
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: localBrowserExecutable
          ? { executablePath: localBrowserExecutable }
          : undefined,
      },
    },
  ],
});
