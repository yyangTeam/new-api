import type { Page } from "@playwright/test";

/**
 * Mocks the app's bootstrap endpoints that the dev server cannot serve and
 * that the root route's beforeLoad awaits on EVERY navigation (so without
 * these mocks the TanStack Router stays pending and the app never renders).
 *
 * Specs already mock /api/status and /api/user/self with their own data;
 * this only adds the two bootstrap endpoints the specs were missing:
 *   - GET  /api/setup            (getSetupStatus — setup-check beforeLoad)
 *   - POST /api/user/auth/refresh (refreshAuthentication — auth bootstrap)
 *
 * Call this at the start of each spec's mock helper, before the spec's own
 * page.route() calls, so the spec's mocks take precedence for shared URLs.
 */
export async function mockBootstrapApis(page: Page) {
  await page.route("**/api/setup*", (route) =>
    route.fulfill({
      json: { success: true, message: "", data: { status: true } },
    }),
  );
  await page.route("**/api/user/auth/refresh", (route) =>
    route.fulfill({
      json: { success: false, message: "no session" },
    }),
  );
}
