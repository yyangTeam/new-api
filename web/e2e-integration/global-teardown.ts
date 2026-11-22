import { fileURLToPath } from "url";
import { stopServer } from "./helpers/server-manager";
import { rmSync, existsSync } from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalTeardown() {
  console.log("\n=== Integration Test Global Teardown ===\n");

  stopServer();

  // Clean auth state
  const authFile = path.resolve(__dirname, ".auth/integration-auth.json");
  if (existsSync(authFile)) {
    rmSync(authFile, { force: true });
  }

  console.log("\n=== Global Teardown Complete ===\n");
}

export default globalTeardown;
