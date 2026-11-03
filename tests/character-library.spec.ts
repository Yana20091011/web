import { test, expect } from '@playwright/test';
import { validDesign } from '../src/model';
import { characterDesign } from '../src/characterLibraryModel';
import characters from '../src/assets/character-library/characters.json' with { type: 'json' };

test('all 50 characters have valid, decodable artwork and persistable designs', async ({
  page,
}) => {
  expect(characters).toHaveLength(50);
  expect(new Set(characters.map((c) => c.id)).size).toBe(50);
  expect(characters[0].id).toBe('laptop-buddy');
  expect(characters.filter((c) => c.category === 'Anime')).toHaveLength(25);
  expect(characters.filter((c) => c.category === 'Game')).toHaveLength(24);
  for (const character of characters) {
    expect(validDesign(characterDesign(character))).toBe(true);
    if (character.id !== 'laptop-buddy')
      expect(new Set(Object.values(character.poses)).size).toBe(4);
  }
  await page.goto('/');
  const decoded = await page.evaluate(async (characters) => {
    const images = characters.flatMap((c) => Object.values(c.poses));
    return Promise.all(
      images.map(async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return image.naturalWidth > 0 && image.naturalHeight > 0;
      }),
    );
  }, characters);
  expect(decoded).toHaveLength(200);
  expect(decoded.every(Boolean)).toBe(true);
});

test('browse, filter, and preview the library without changing saved pets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  const cards = page.locator('.character-card');
  await expect(cards).toHaveCount(50);
  await expect(cards.first()).toHaveAttribute('data-character-id', 'laptop-buddy');
  await page.getByRole('button', { name: 'Anime', exact: true }).click();
  await expect(cards).toHaveCount(25);
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  await expect(cards).toHaveCount(24);
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Undertale');
  await expect(cards).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Tails');
  await expect(cards).toHaveCount(1);
  const image = cards.locator('img');
  const idle = await image.getAttribute('src');
  for (const pose of ['blinking', 'typing', 'happy']) {
    await cards.getByRole('button', { name: pose, exact: true }).click();
    await expect(image).toHaveAttribute('alt', `Tails ${pose} pose`);
    expect(await image.getAttribute('src')).not.toBe(idle);
  }
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('no such pet');
  await expect(cards).toHaveCount(0);
  await expect(page.getByText('No companions match.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('keycritter-pets'))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('choose, blink, type, celebrate, save and reload a library pet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page.getByRole('button', { name: 'Choose Naruto', exact: true }).click();
  const image = page.getByTestId('active-pet').locator('img');
  await expect(page.getByRole('heading', { name: 'Meet Naruto' })).toBeVisible();
  await expect(image).toHaveAttribute('data-animated', 'true');
  await expect
    .poll(() => image.getAttribute('data-frame-index'), { intervals: [25], timeout: 6000 })
    .not.toBe('0');
  await page.getByRole('textbox', { name: 'Typing playground' }).press('a');
  await expect(image).toHaveAttribute('data-pose', 'typing');
  await expect(image).toHaveAttribute(
    'src',
    characters.find((c) => c.id === 'naruto')!.poses.typing,
  );
  await expect(image).toHaveAttribute('data-pose', 'idle');
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(image).toHaveAttribute('data-pose', 'cheer');
  await expect(image).toHaveAttribute(
    'src',
    characters.find((c) => c.id === 'naruto')!.poses.happy,
  );
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Meet Naruto' })).toBeVisible();
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(
    page.locator('.saved-pet-card').filter({ has: page.getByRole('button', { name: 'Hang out' }) }),
  ).toHaveCount(1);
  await expect(page.locator('.character-card')).toHaveCount(50);
});
