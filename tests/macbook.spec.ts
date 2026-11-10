import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  });
  await page.goto('/');
});

test('offers a usable Mac browser path from either tab without an incompatible executable', async ({
  page,
}) => {
  const section = page.getByRole('region', { name: 'A little company, on your MacBook.' });
  await expect(section).toBeVisible();
  await expect(section.getByText('Works in Safari and Chrome', { exact: false })).toBeVisible();
  await expect(section.getByRole('link', { name: 'Download for Windows' })).toHaveCount(0);
  await page.getByRole('button', { name: /My Pets/ }).click();
  await section.getByRole('button', { name: 'Start typing in this browser' }).click();
  const input = page.getByRole('textbox', { name: 'Typing playground' });
  await expect(input).toBeFocused();
  await input.press('Space');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-action', 'jump');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Command shortcuts keep the selected reaction key unchanged', async ({ page }) => {
  const key = page.getByRole('textbox', { name: 'Reaction key', exact: true });
  await expect(key).toHaveValue('Enter');
  await key.press('Meta+a');
  await expect(key).toHaveValue('Enter');
  await key.press('j');
  await expect(key).toHaveValue('J');
});

test('Mac backup preserves unsaved changes and imports back into the website', async ({ page }) => {
  await page.getByLabel('Name', { exact: true }).fill('MacBook friend');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save a pet backup' }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe('MacBook-friend.keycritter.json');
  const contents = await readFile((await file.path())!, 'utf8');
  expect(JSON.parse(contents).pet.design.name).toBe('MacBook friend');
  await page.getByLabel('Import pet file').setInputFiles({
    name: file.suggestedFilename(),
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  });
  await expect(page.getByRole('heading', { name: 'Meet MacBook friend' })).toBeVisible();
});
