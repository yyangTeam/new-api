import { test as base, type Page } from "@playwright/test";
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
      // 在每个页面加载后注入 auth bundle 到 Zustand store
      page.on("load", async () => {
        const freshExpiry = Math.floor(Date.now() / 1000) + 840;
        await page.evaluate(({ b, exp }) => {
          const w = window as any;
          // TanStack Router + Zustand: find the auth store and inject state
          if (w.__zustand_stores__?.auth) {
            w.__zustand_stores__.auth.getState().auth.setBundle({
              ...b,
              access_expires_at: exp,
            });
          }
        }, { b: bundle, exp: freshExpiry }).catch(() => {});
      });

      // 同时 mock refresh 作为后备
      await page.route("**/api/user/auth/refresh", async (route) => {
        const data = {
          access_token: bundle.access_token,
          token_type: "Bearer",
          access_expires_at: Math.floor(Date.now() / 1000) + 840,
          user: bundle.user,
          session: bundle.session,
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "", data }),
        });
      });
    }
    await use(page);
  },
});

export { expect } from "@playwright/test";
export { BASE_URL, ROOT_USER, ROOT_PASS };
