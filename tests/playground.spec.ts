import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('loads the artwork and keeps the page within the viewport', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Make yourself a little friend.' })).toBeVisible();
  const art = await page.request.get('/cozy-room.png');
  expect(art.ok()).toBeTruthy();
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'cat');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('typing triggers the configured animations without stealing text input', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Typing playground' });
  await input.fill('Hello');
  await input.press('Space');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-action', 'jump');
  await expect(input).toHaveValue('Hello ');
  await input.press('Enter');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-action', 'cheer');
  await input.press('Backspace');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-action', 'surprise');
  await expect(input).toHaveValue('Hello ');
  await expect(page.locator('.typing-stats')).toContainText('3 reactions');
});

test('customizes a pet and restores the draft after reload', async ({ page }) => {
  await page.getByLabel('Name', { exact: true }).fill('Peaches');
  await page.getByRole('button', { name: 'Bunny', exact: true }).click();
  await page.getByRole('button', { name: 'Strawberry color' }).click();
  await page.getByRole('button', { name: 'Star accessory' }).click();
  await page.getByLabel('Pet size').fill('115');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Meet Peaches' })).toBeVisible();
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'bunny');
  await expect(page.getByRole('button', { name: 'Strawberry color' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Star accessory' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Pet size')).toHaveValue('115');
});

test('adds, edits, previews, and removes a custom key reaction', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a reaction', exact: true }).click();
  await page.getByRole('textbox', { name: 'Reaction key', exact: true }).press('k');
  await page.getByLabel('Reaction animation').selectOption('dance');
  await page.getByLabel('Reaction message').fill('Keep creating!');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('textbox', { name: 'Typing playground' }).press('k');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-action', 'dance');
  await expect(page.locator('.speech-bubble')).toContainText('Keep creating!');
  await page.getByRole('button', { name: 'Edit K reaction', exact: true }).click();
  await page.getByLabel('Reaction message').fill('Updated message!');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await page.getByRole('button', { name: 'Preview K reaction', exact: true }).click();
  await expect(page.locator('.speech-bubble')).toContainText('Updated message!');
  await page.getByRole('button', { name: 'Remove K reaction', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview K reaction', exact: true })).toHaveCount(
    0,
  );
});

test('rejects duplicate keys and allows editing an existing binding', async ({ page }) => {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter already has a reaction');
  await page.getByRole('button', { name: 'Edit Enter reaction', exact: true }).click();
  await page.getByLabel('Reaction animation').selectOption('sleep');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-action', 'sleep');
});

test('saves, loads, updates, and deletes pets from the local collection', async ({ page }) => {
  await page.getByLabel('Name', { exact: true }).fill('Kiwi');
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(page.getByRole('heading', { name: 'Kiwi', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create a pet', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Bean');
  await page.getByRole('button', { name: 'Blob', exact: true }).click();
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Kiwi', exact: true }) })
    .getByRole('button', { name: 'Hang out' })
    .click();
  await expect(page.getByRole('heading', { name: 'Meet Kiwi' })).toBeVisible();
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'cat');
  await page.getByLabel('Name', { exact: true }).fill('Kiwi Jr');
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Kiwi Jr', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Bean', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my buddy' }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete Bean', exact: true }).click();
  await page.getByRole('button', { name: 'Remove pet', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('focus, evening, and pet affection controls work', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch to evening' }).click();
  await expect(page.locator('.room')).toHaveClass(/night/);
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(page.locator('.design-column')).toBeHidden();
  await page.getByRole('button', { name: 'Pet Mochi', exact: true }).click();
  await expect(page.locator('.speech-bubble')).toContainText('Aww, I love you too!');
  await page.getByRole('button', { name: 'Exit focus mode' }).click();
  await expect(page.locator('.design-column')).toBeVisible();
});

test('invalid saved data falls back to a usable default', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('keycritter-draft', '{corrupted');
    localStorage.setItem(
      'keycritter-pets',
      JSON.stringify([{ id: 'bad', design: { name: 'Broken' } }]),
    );
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Meet Mochi' })).toBeVisible();
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(page.getByRole('heading', { name: 'A little friend is waiting.' })).toBeVisible();
});
