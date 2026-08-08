import { chromium } from "@playwright/test";

export default async function globalSetup() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Step 1: Login via API (ctx.request so cookie lands in the browser context)
  const resp = await ctx.request.post("http://localhost:3000/api/user/login", {
    data: { username: "pw_test_user", password: "PwTest@2026" },
  });
  if (!resp.ok()) throw new Error(`Login failed: ${resp.status()} ${await resp.text()}`);
  const loginBody = await resp.json();
  if (!loginBody.success || !loginBody.data) {
    throw new Error(`Login unsuccessful: ${JSON.stringify(loginBody)}`);
  }
  // loginBody.data = { id, username, display_name, role, status, group }
  const userObj = loginBody.data;

  // Step 2: Navigate to the frontend to establish origin context for localStorage injection
  await page.goto("http://localhost:5173");
  await page.waitForLoadState("networkidle");

  // Step 3: Inject auth state into localStorage.
  //   - 'user'  → auth-store reads this; non-null means authenticated (no API call needed)
  //   - 'uid'   → sent as New-Api-User header on every API request
  //   - 'setup_status_checked' → skip setup status check on every navigation
  await page.evaluate((user) => {
    window.localStorage.setItem("user", JSON.stringify(user));
    window.localStorage.setItem("uid", String(user.id));
    window.localStorage.setItem("setup_status_checked", "true");
  }, userObj);

  // Step 4: Save storageState (cookies + localStorage for http://localhost:5173)
  await ctx.storageState({ path: "/tmp/pw-auth-state.json" });
  await browser.close();
}
