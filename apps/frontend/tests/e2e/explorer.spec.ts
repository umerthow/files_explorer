import { expect, test } from '@playwright/test';

test('loads tree, expands and selects a folder, then shows children/files', async ({ page }) => {
  await page.goto('/');

  // Left panel renders at least one root
  const leftPanel = page.getByTestId('left-panel');
  await expect(leftPanel.locator('[role="treeitem"]').first()).toBeVisible({ timeout: 10_000 });

  // Right panel is empty initially
  await expect(page.getByTestId('right-panel')).toContainText('Select a folder');

  // Click first root → right panel updates
  const firstRoot = leftPanel.locator('[role="treeitem"]').first();
  await firstRoot.locator('> div').click();
  await expect(page.getByTestId('right-panel')).not.toContainText('Select a folder');

  // Search updates right panel
  const search = page.getByTestId('search-input');
  await search.fill('report');
  await expect(page.getByTestId('right-panel')).toContainText(/report/i, { timeout: 5_000 });
});
