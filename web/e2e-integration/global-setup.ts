import { fileURLToPath } from "url";
import path from "path";
import { writeFileSync, mkdirSync } from "fs";
import {
  buildFrontend,
  buildBackend,
  startServer,
  waitForReady,
} from "./helpers/server-manager";
import { ApiClient } from "./helpers/api-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.INTEGRATION_PORT || "14000";
const BASE_URL = `http://localhost:${PORT}`;
const ROOT_USER = "root";
const ROOT_PASS = "test12345678";

async function globalSetup() {
  console.log("\n=== Integration Test Global Setup ===\n");

  // Step 1: Build frontend
  buildFrontend();

  // Step 2: Build Go backend
  buildBackend();

  // Step 3: Start server
  const info = startServer(PORT);
  console.log(`[global-setup] Server started: PID=${info.pid}, port=${info.port}`);

  // Step 4: Wait for server to be ready
  await waitForReady(BASE_URL, 30_000);

  // Step 5: Setup root user via API
  const client = new ApiClient(BASE_URL);
  const setupResult = await client.setupRootUser(ROOT_USER, ROOT_PASS);
  console.log(`[global-setup] Setup result: ${JSON.stringify(setupResult)}`);

  // Step 6: Login and save auth state
  const auth = await client.login(ROOT_USER, ROOT_PASS);
  console.log(`[global-setup] Logged in as root, uid=${auth.uid}, token=${auth.token.slice(0, 20)}...`);

  // Step 7: Save storage state for Playwright (browser cookies/localStorage)
  const authDir = path.resolve(__dirname, ".auth");
  mkdirSync(authDir, { recursive: true });

  // Save API auth info for test fixtures
  writeFileSync(
    path.join(authDir, "api-auth.json"),
    JSON.stringify(auth, null, 2)
  );

  const storageState = {
    cookies: auth.cookie
      ? parseCookies(auth.cookie, PORT)
      : [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [
          { name: "token", value: auth.token },
          { name: "uid", value: String(auth.uid) },
        ],
      },
    ],
  };

  writeFileSync(
    path.join(authDir, "integration-auth.json"),
    JSON.stringify(storageState, null, 2)
  );

  console.log("[global-setup] Auth state saved");
  console.log("\n=== Global Setup Complete ===\n");
}

function parseCookies(setCookieHeader: string, port: string) {
  const cookies: any[] = [];
  const parts = setCookieHeader.split(",").map((s) => s.trim());

  for (const part of parts) {
    const segments = part.split(";").map((s) => s.trim());
    const [nameValue] = segments;
    if (!nameValue || !nameValue.includes("=")) continue;

    const eqIdx = nameValue.indexOf("=");
    const name = nameValue.slice(0, eqIdx);
    const value = nameValue.slice(eqIdx + 1);

    if (!name || name.toLowerCase() === "path" || name.toLowerCase() === "expires") continue;

    cookies.push({
      name,
      value,
      domain: "localhost",
      path: "/",
      httpOnly: segments.some((s) => s.toLowerCase() === "httponly"),
      secure: false,
      sameSite: "Lax",
      expires: -1,
    });
  }
  return cookies;
}

export default globalSetup;
