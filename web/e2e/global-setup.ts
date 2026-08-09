import fs from "node:fs";
import path from "node:path";

/**
 * Global setup for Playwright E2E tests.
 *
 * Creates a mock auth state file that simulates a logged-in user session.
 * The auth state includes a fake JWT token in localStorage so that mocked
 * tests can bypass the login page.
 */
export default function globalSetup() {
  const authDir = path.join(__dirname, ".auth");
  const authFile = path.join(authDir, "pw-auth-state-classic.json");

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Only create the file if it doesn't already exist (allows manual overrides)
  if (!fs.existsSync(authFile)) {
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6MTAwLCJleHAiOjk5OTk5OTk5OTl9." +
      "fake-signature-for-e2e-testing";

    const authState = {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:3000",
          localStorage: [
            { name: "token", value: fakeJwt },
            { name: "i18nextLng", value: "en" },
          ],
        },
      ],
    };

    fs.writeFileSync(authFile, JSON.stringify(authState, null, 2));
  }
}
