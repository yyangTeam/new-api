import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const localBrowserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
      ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      : undefined);

const authStatePath =
  process.env.PW_CLASSIC_AUTH_STATE ||
  path.resolve(process.cwd(), "e2e/.auth/pw-auth-state-classic.json");

export default async function globalSetup() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: localBrowserExecutable,
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const password = process.env.PW_CLASSIC_PASSWORD || "PwTest@2026";
  const username = process.env.PW_CLASSIC_USER || "pw_test_user";

  const login = async () => {
    const resp = await ctx.request.post("http://localhost:3000/api/user/login", {
      data: { username, password },
    });
    if (!resp.ok()) {
      throw new Error(`Login failed: ${resp.status()} ${await resp.text()}`);
    }
    return resp.json();
  };

  // Step 1: Ensure a loginable test user exists, then login via API.
  let loginBody = await login();
  if (!loginBody.success || !loginBody.data) {
    const registerResp = await ctx.request.post(
      "http://localhost:3000/api/user/register",
      {
        data: { username, password },
      },
    );
    if (!registerResp.ok()) {
      throw new Error(
        `Register failed: ${registerResp.status()} ${await registerResp.text()}`,
      );
    }
    const registerBody = await registerResp.json();
    if (!registerBody.success) {
      throw new Error(`Register unsuccessful: ${JSON.stringify(registerBody)}`);
    }
    loginBody = await login();
  }
  if (!loginBody.success || !loginBody.data) {
    throw new Error(`Login unsuccessful: ${JSON.stringify(loginBody)}`);
  }
  // loginBody.data = { id, username, display_name, role, status, group }
  const userObj = loginBody.data;

  // Step 2: Navigate to the classic frontend to establish origin context for localStorage injection
  await page.goto("http://localhost:5174");
  await page.waitForLoadState("networkidle");

  // Step 3: Inject auth state into localStorage.
  //   - 'user'  → non-null means authenticated
  //   - 'uid'   → sent as New-Api-User header on every API request
  await page.evaluate((user) => {
    window.localStorage.setItem("user", JSON.stringify(user));
    window.localStorage.setItem("uid", String(user.id));
  }, userObj);

  // Step 4: Save storageState (cookies + localStorage for http://localhost:5174)
  mkdirSync(path.dirname(authStatePath), { recursive: true });
  await ctx.storageState({ path: authStatePath });
  await browser.close();
}
