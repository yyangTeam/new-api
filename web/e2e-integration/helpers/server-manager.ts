import { execSync, spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "../../../");
const WEB_DIR = path.resolve(__dirname, "../../");
const TEST_DIR = path.join(REPO_ROOT, ".test");
const BINARY_PATH = path.join(TEST_DIR, "newapi-test");
const SERVER_INFO_PATH = path.join(TEST_DIR, "server-info.json");
const GO_BIN = process.env.GO_BIN || path.join(process.env.HOME || "/root", ".local/go/bin/go");

export interface ServerInfo {
  pid: number;
  port: string;
  dbDir: string;
  dbPath: string;
}

export function buildFrontend(): void {
  const distIndex = path.join(WEB_DIR, "dist/index.html");
  if (existsSync(distIndex)) {
    const mtime = statSync(distIndex).mtime;
    if (Date.now() - mtime.getTime() < 5 * 60 * 1000) {
      console.log("[server-manager] Frontend dist is fresh, skipping build");
      return;
    }
  }
  console.log("[server-manager] Building frontend...");
  execSync("bun run build", { cwd: WEB_DIR, stdio: "inherit" });
}

export function buildBackend(): void {
  mkdirSync(TEST_DIR, { recursive: true });
  console.log("[server-manager] Building Go backend...");
  execSync(`${GO_BIN} build -o ${BINARY_PATH} .`, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, CGO_ENABLED: "1" },
  });
}

export function startServer(port: string): ServerInfo {
  const dbDir = `/tmp/newapi-e2e-${randomUUID().slice(0, 8)}`;
  mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "test.db");

  console.log(`[server-manager] Starting server on port ${port}, DB: ${dbPath}`);

  const child: ChildProcess = spawn(BINARY_PATH, [`--port`, port], {
    env: {
      ...process.env,
      SQLITE_PATH: dbPath,
      GIN_MODE: "release",
      SESSION_SECRET: "e2e-test-secret-fixed",
      MEMORY_CACHE_ENABLED: "true",
      BATCH_UPDATE_ENABLED: "false",
      SYNC_FREQUENCY: "0",
      CRITICAL_RATE_LIMIT_ENABLE: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  child.stdout?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line) console.log(`[server] ${line}`);
  });
  child.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line) console.log(`[server:err] ${line}`);
  });

  child.unref();

  const info: ServerInfo = { pid: child.pid!, port, dbDir, dbPath };
  writeFileSync(SERVER_INFO_PATH, JSON.stringify(info, null, 2));
  return info;
}

export async function waitForReady(baseUrl: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  const url = `${baseUrl}/api/status`;
  console.log(`[server-manager] Waiting for server at ${url}...`);

  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        console.log("[server-manager] Server is ready");
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

export function stopServer(): void {
  if (!existsSync(SERVER_INFO_PATH)) {
    console.log("[server-manager] No server-info.json found, nothing to stop");
    return;
  }

  const info: ServerInfo = JSON.parse(readFileSync(SERVER_INFO_PATH, "utf-8"));
  console.log(`[server-manager] Stopping server PID ${info.pid}...`);

  try {
    process.kill(info.pid, "SIGTERM");
  } catch (e: any) {
    if (e.code !== "ESRCH") throw e;
    console.log("[server-manager] Process already exited");
  }

  // Wait briefly for process to exit
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      process.kill(info.pid, 0);
      execSync("sleep 0.1");
    } catch {
      break;
    }
  }

  // Clean up temp DB
  if (existsSync(info.dbDir)) {
    console.log(`[server-manager] Removing temp DB dir: ${info.dbDir}`);
    rmSync(info.dbDir, { recursive: true, force: true });
  }

  // Clean up server info file
  rmSync(SERVER_INFO_PATH, { force: true });
}

export function getServerInfo(): ServerInfo | null {
  if (!existsSync(SERVER_INFO_PATH)) return null;
  return JSON.parse(readFileSync(SERVER_INFO_PATH, "utf-8"));
}
