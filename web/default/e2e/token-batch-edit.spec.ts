import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

const bulkBar = (page: Page) => page.locator("#bulk-actions-description");

async function goToKeysPage(page: Page) {
  await page.goto(`${BASE_URL}/keys`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

async function selectFirstRow(page: Page) {
  await page.locator("table tbody tr").first().locator('[role="checkbox"]').click();
  await page.waitForTimeout(400);
}

async function openBatchEditDialog(page: Page) {
  await bulkBar(page).locator("..").locator("button").nth(2).click();
  await page.waitForTimeout(600);
}

async function clearSelection(page: Page) {
  await bulkBar(page).locator("..").locator("button").first().click();
  await page.waitForTimeout(300);
}

test.use({ storageState: "/tmp/pw-auth-state.json" });

test.describe("Token batch edit (default frontend)", () => {
  test.beforeEach(async ({ page }) => {
    await goToKeysPage(page);
    // Close any open dialog first
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible()) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    if (await bulkBar(page).isVisible()) await clearSelection(page);
  });

  test("bulk actions bar is hidden when nothing is selected", async ({ page }) => {
    await expect(bulkBar(page)).not.toBeVisible();
  });

  test("selecting a row reveals bulk actions bar", async ({ page }) => {
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await selectFirstRow(page);
    await expect(bulkBar(page)).toBeVisible({ timeout: 5_000 });
  });

  test("bulk actions bar shows 4 buttons (clear, copy, edit, delete)", async ({ page }) => {
    await selectFirstRow(page);
    await expect(bulkBar(page).locator("..").locator("button")).toHaveCount(4);
  });

  test("batch edit dialog opens with correct title", async ({ page }) => {
    await selectFirstRow(page);
    await openBatchEditDialog(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.locator('[data-slot="dialog-title"]')).toContainText("Batch Edit");
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("batch edit dialog description explains partial update semantics", async ({ page }) => {
    await selectFirstRow(page);
    await openBatchEditDialog(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.locator('[data-slot="dialog-description"]')).toContainText(
      "Only checked fields will be updated"
    );
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("batch edit dialog shows all editable field sections", async ({ page }) => {
    await selectFirstRow(page);
    await openBatchEditDialog(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    for (const label of ["Group", "Cross-group retry", "Expiration Time", "Quota"]) {
      await expect(dialog.locator(`text=${label}`).first()).toBeVisible();
    }
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("cancel closes dialog without saving", async ({ page }) => {
    await selectFirstRow(page);
    await openBatchEditDialog(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("enabling Group field and saving succeeds and clears selection", async ({ page }) => {
    await selectFirstRow(page);
    await openBatchEditDialog(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    // Click the "Group" field label to enable it (the Label element calls onCheckedChange)
    await dialog.locator("text=Group").first().click();
    await page.waitForTimeout(200);
    await dialog.getByRole("button", { name: /save changes/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });
    await expect(bulkBar(page)).not.toBeVisible({ timeout: 5_000 });
  });

  test("select all via header checkbox updates selection count in bar", async ({ page }) => {
    const rowCount = await page.locator("table tbody tr").count();
    if (rowCount === 0) {
      // No tokens in this account — skip the assertion but don't fail
      test.skip();
      return;
    }
    await page.locator('table thead [role="checkbox"]').click();
    await page.waitForTimeout(400);
    const barText = await bulkBar(page).textContent();
    expect(barText).toContain(String(rowCount));
  });

  test("clear-selection button dismisses bulk actions bar", async ({ page }) => {
    await selectFirstRow(page);
    await expect(bulkBar(page)).toBeVisible({ timeout: 5_000 });
    await clearSelection(page);
    await expect(bulkBar(page)).not.toBeVisible();
  });
});
