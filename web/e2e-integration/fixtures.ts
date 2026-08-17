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

function loadLoginBundle(): any | null {
  const bundleFile = path.join(__dirname, ".auth/login-bundle.json");
  if (existsSync(bundleFile)) {
    return JSON.parse(readFileSync(bundleFile, "utf-8"));
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

  page: async ({ page }, use) => {
    const bundle = loadLoginBundle();
    if (bundle) {
      const freshBundle = JSON.stringify({
        ...bundle,
        access_expires_at: Math.floor(Date.now() / 1000) + 840,
      });
      await page.addInitScript(`window.__E2E_AUTH_BUNDLE__ = ${freshBundle};`);
    }
    await use(page);
  },
});

export { expect } from "@playwright/test";
export { BASE_URL, ROOT_USER, ROOT_PASS };
