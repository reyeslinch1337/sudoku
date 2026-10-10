import { type Page, expect, test } from '@playwright/test';

async function open(page: Page) {
  await page.goto('./');
  await expect(page.locator('.cell')).toHaveCount(81);
}

const firstEditable = (page: Page) => page.locator('.cell:not(.given)').first();

test('opens with a puzzle', async ({ page }) => {
  await open(page);
  await expect(page.locator('.rating')).toHaveText(/^9\.\d$/);
  expect(await page.locator('.cell.given').count()).toBeGreaterThan(16);
});

test('enters a digit and undoes it', async ({ page }) => {
  await open(page);
  const cell = firstEditable(page);
  await cell.click();
  await page.locator('.num').nth(4).click();
  await expect(cell).toHaveText('5');
  await page.locator('.tool').first().click();
  await expect(cell).toHaveText('');
});

test('hint opens three levels', async ({ page }) => {
  await open(page);
  await page.locator('.tool').nth(6).click();
  const more = page.locator('.hint-actions .btn').first();
  await expect(more).toBeVisible();
  await expect(page.locator('.hint-title')).not.toHaveText(/\.\.\.$/);
  await more.click();
  await expect(page.locator('.hint-detail')).toBeVisible();
  await page.locator('.hint-actions .btn').first().click();
  await expect(page.locator('.hint-line').first()).toBeVisible();
  await expect(page.locator('.hint-actions .btn.primary')).toBeVisible();
});

test('restores the game after a reload', async ({ page }) => {
  await open(page);
  const index = await firstEditable(page).getAttribute('data-cell');
  await firstEditable(page).click();
  await page.locator('.num').nth(2).click();
  await page.reload();
  await expect(page.locator(`[data-cell="${index}"]`)).toHaveText('3');
});

test('works offline after the first visit', async ({ page, context }) => {
  await open(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The first load is not controlled by the worker yet; a reload makes it controlled.
  await page.reload();
  await expect(page.locator('.cell')).toHaveCount(81);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.cell')).toHaveCount(81);
  await page.locator('.tool').nth(6).click();
  await expect(page.locator('.hint-title')).not.toHaveText(/\.\.\.$/);
});

test('starts a new game on level 11+', async ({ page }) => {
  await open(page);
  await page.locator('.header .icon-btn').first().click();
  await page.locator('.menu-list .btn.primary').click();
  await page.locator('.level-btn').nth(2).click();
  await expect(page.locator('.rating')).toHaveText('11+');
  await page.reload();
  await expect(page.locator('.rating')).toHaveText('11+');
});
