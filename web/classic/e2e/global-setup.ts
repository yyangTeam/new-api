import { chromium } from "@playwright/test";

export default async function globalSetup() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Step 1: Login via API
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
  await ctx.storageState({ path: "/tmp/pw-auth-state-classic.json" });
  await browser.close();
}
