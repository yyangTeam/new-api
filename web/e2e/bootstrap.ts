import type { Page } from "@playwright/test";

/**
 * Mocks the app's bootstrap endpoints that the dev server cannot serve and
 * that the root route's beforeLoad awaits on EVERY navigation (so without
 * these mocks the TanStack Router stays pending and the app never renders).
 *
 * Specs already mock /api/status and /api/user/self with their own data;
 * this adds the bootstrap endpoints the specs were missing:
 *   - GET  /api/setup            (getSetupStatus — setup-check beforeLoad)
 *   - POST /api/user/auth/refresh (refreshAuthentication — auth bootstrap)
 *
 * The auth store is NOT persisted (in-memory), so on every page load the
 * app calls /api/user/auth/refresh to restore the session. By default this
 * returns a valid AuthBundle (admin, role 100) so authed specs are logged
 * in and authed routes render. Pass { authed: false } for specs that test
 * the unauthenticated flow (sign-in page, etc.).
 *
 * Call this at the start of each spec's mock helper, before the spec's own
 * page.route() calls, so the spec's mocks take precedence for shared URLs.
 */
/**
 * Builds a valid AuthBundle (the shape returned by /api/user/auth/refresh and
 * /api/user/login). The sign-in form validates the login response with
 * isAuthBundle(): it requires access_token/token_type/access_expires_at, a
 * user {id,username,role}, and a session {sid,current,login_method,ip,
 * user_agent,created_at,last_active_at,expires_at}. Returning {token,
 * username, role} (the legacy shape) fails that check and the form throws
 * "Login failed" instead of redirecting.
 */
export function buildAuthBundle(user: {
  id: number
  username: string
  role: number
}) {
  return {
    access_token: `e2e-${user.username}-access-token`,
    token_type: "Bearer",
    access_expires_at: 9999999999,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      status: 1,
      group: "default",
      quota: 0,
      used_quota: 0,
      request_count: 0,
    },
    session: {
      sid: `e2e-session-${user.id}`,
      current: true,
      login_method: "password",
      ip: "127.0.0.1",
      user_agent: "Playwright",
      created_at: 0,
      last_active_at: 0,
      expires_at: 9999999999,
    },
  }
}

export async function mockBootstrapApis(
  page: Page,
  opts: { authed?: boolean } = {},
) {
  const authed = opts.authed !== false;
  await page.route("**/api/setup*", (route) =>
    route.fulfill({
      json: { success: true, message: "", data: { status: true } },
    }),
  );
  await page.route("**/api/user/auth/refresh", (route) =>
    route.fulfill(
      authed
        ? {
            json: {
              success: true,
              message: "",
              data: buildAuthBundle({ id: 1, username: "admin", role: 100 }),
            },
          }
        : { json: { success: false, message: "no session" } },
    ),
  );
  // When authed, also mock the user-self endpoints the authed pages fetch on
  // mount; specs that need different user data override these.
  if (authed) {
    await page.route("**/api/user/self", (route) =>
      route.fulfill({
        json: {
          success: true,
          message: "",
          data: {
            id: 1,
            username: "admin",
            role: 100,
            status: 1,
            group: "default",
            quota: 0,
            used_quota: 0,
            request_count: 0,
          },
        },
      }),
    );
    await page.route("**/api/user/self/groups", (route) =>
      route.fulfill({ json: { success: true, message: "", data: [] } }),
    );
    await page.route("**/api/notice", (route) =>
      route.fulfill({ json: { success: true, message: "", data: "" } }),
    );
  }
}
