import { test as base } from "@playwright/test";
import { ApiClient, type AuthInfo } from "./helpers/api-client";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.INTEGRATION_PORT || "14000";
const BASE_URL = `http://localhost:${PORT}`;
const ROOT_USER = "root";
const ROOT_PASS = "test12345678";

type IntegrationFixtures = {
  apiClient: ApiClient;
};

function loadApiAuth(): AuthInfo | null {
  const authFile = path.join(__dirname, ".auth/api-auth.json");
  if (existsSync(authFile)) {
    return JSON.parse(readFileSync(authFile, "utf-8"));
  }
  return null;
}

export const test = base.extend<IntegrationFixtures>({
  apiClient: async ({}, use) => {
    const client = new ApiClient(BASE_URL);
    const savedAuth = loadApiAuth();
    if (savedAuth) {
      client.setAuth(savedAuth);
    } else {
      await client.login(ROOT_USER, ROOT_PASS);
    }
    await use(client);
  },
});

/**
 * 等待页面渲染完成后再截图。如果页面白屏(body 内容 < 500 chars)，
 * 额外等待 3 秒让 SPA hydrate。
 */
export async function screenshotAfterRender(page: import("@playwright/test").Page, path: string): Promise<void> {
  const bodyLen = await page.evaluate(() => document.body.innerHTML.length).catch(() => 0);
  if (bodyLen < 500) {
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path, fullPage: true });
}

export { expect } from "@playwright/test";
export { BASE_URL, ROOT_USER, ROOT_PASS };
