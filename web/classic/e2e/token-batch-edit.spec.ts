import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:5174";

// Selectors
const ROW_CHECKBOXES = "table tbody tr input[type='checkbox']";
const HEADER_CHECKBOX = "table thead input[type='checkbox']";

async function goToTokenPage(page: Page) {
  await page.goto(`${BASE_URL}/console/token`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

async function selectFirstRow(page: Page) {
  const firstCheckbox = page.locator(ROW_CHECKBOXES).first();
  await firstCheckbox.click({ force: true });
  await page.waitForTimeout(400);
}

async function openBatchEditModal(page: Page) {
  await page.getByText("批量编辑").click();
  await page.waitForTimeout(600);
}

test.use({ storageState: "/tmp/pw-auth-state-classic.json" });

test.describe("Token batch edit (classic frontend)", () => {
  test.beforeEach(async ({ page }) => {
    await goToTokenPage(page);
    // Close any open modal that may be lingering
    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("batch edit button is always visible in toolbar", async ({ page }) => {
    // The 批量编辑 button should be visible without any row selection
    await expect(page.getByText("批量编辑")).toBeVisible();
  });

  test("selecting a row enables batch edit", async ({ page }) => {
    const rowCount = await page.locator(ROW_CHECKBOXES).count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    // Click the first row checkbox
    await selectFirstRow(page);
    // The checkbox should now be checked
    const firstCheckbox = page.locator(ROW_CHECKBOXES).first();
    await expect(firstCheckbox).toBeChecked({ timeout: 5_000 });
    // The batch edit button is still visible
    await expect(page.getByText("批量编辑")).toBeVisible();
  });

  test("batch edit modal opens with correct title", async ({ page }) => {
    const rowCount = await page.locator(ROW_CHECKBOXES).count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    await selectFirstRow(page);
    await openBatchEditModal(page);
    // Modal should be visible and contain the expected title text
    await expect(page.locator(".semi-modal-title")).toContainText("批量编辑令牌", { timeout: 5_000 });
    // Close the modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(300);
  });

  test("batch edit modal shows all field sections", async ({ page }) => {
    const rowCount = await page.locator(ROW_CHECKBOXES).count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    await selectFirstRow(page);
    await openBatchEditModal(page);
    // Wait for modal to appear
    await expect(page.locator(".semi-modal-title")).toBeVisible({ timeout: 5_000 });

    // All 6 field section labels should be visible inside the modal body
    const modalBody = page.locator(".semi-modal-body");
    const expectedLabels = [
      "Token Group",
      "Cross-group retry",
      "Expiration time",
      "Quota Settings",
      "Model restrictions list",
      "IP whitelist (supports CIDR expressions)",
    ];
    for (const label of expectedLabels) {
      await expect(modalBody.locator(`.semi-checkbox-addon`, { hasText: label }).first()).toBeVisible();
    }
    // Close the modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(300);
  });

  test("cancel closes modal without saving", async ({ page }) => {
    const rowCount = await page.locator(ROW_CHECKBOXES).count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    await selectFirstRow(page);
    await openBatchEditModal(page);
    // Wait for modal to appear
    await expect(page.locator(".semi-modal-title")).toBeVisible({ timeout: 5_000 });
    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();
    // Modal should disappear
    await expect(page.locator(".semi-modal-title")).not.toBeVisible({ timeout: 5_000 });
  });

  test("save without any field checked shows error", async ({ page }) => {
    const rowCount = await page.locator(ROW_CHECKBOXES).count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    await selectFirstRow(page);
    await openBatchEditModal(page);
    // Wait for modal to appear
    await expect(page.locator(".semi-modal-title")).toBeVisible({ timeout: 5_000 });
    // Click Save without enabling any field
    await page.locator("button", { hasText: "Save" }).last().click({ force: true });
    await page.waitForTimeout(600);
    // Modal should still be open (error toast shown, modal does NOT close)
    await expect(page.locator(".semi-modal-title")).toBeVisible();
    // Dismiss the modal for cleanup
    await page.locator("button", { hasText: "Cancel" }).click();
    await page.waitForTimeout(300);
  });

  test("enabling Token Group field and saving succeeds", async ({ page }) => {
    const rowCount = await page.locator(ROW_CHECKBOXES).count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    await selectFirstRow(page);
    await openBatchEditModal(page);
    // Wait for modal to appear
    await expect(page.locator(".semi-modal-title")).toBeVisible({ timeout: 5_000 });
    // Click the Token Group checkbox to enable it
    const tokenGroupCheckbox = page
      .locator(".semi-modal-body .semi-checkbox-addon", { hasText: "Token Group" })
      .first();
    await tokenGroupCheckbox.click({ force: true });
    await page.waitForTimeout(300);
    // Click Save (footer primary button)
    await page.locator(".semi-modal-footer button.semi-button-primary").click();
    // Modal should close on success
    await expect(page.locator(".semi-modal-title")).not.toBeVisible({ timeout: 8_000 });
  });

  test("select all via header checkbox selects all rows", async ({ page }) => {
    const rowCount = await page.locator(ROW_CHECKBOXES).count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    // Click the header select-all checkbox
    await page.locator(HEADER_CHECKBOX).click({ force: true });
    await page.waitForTimeout(500);
    // All row checkboxes should now be checked
    const allCheckboxes = page.locator(ROW_CHECKBOXES);
    const count = await allCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(allCheckboxes.nth(i)).toBeChecked({ timeout: 5_000 });
    }
  });
});
