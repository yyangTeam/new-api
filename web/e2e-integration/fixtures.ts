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

export { expect } from "@playwright/test";
export { BASE_URL, ROOT_USER, ROOT_PASS };
