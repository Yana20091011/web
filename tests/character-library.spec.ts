import { test, expect } from '@playwright/test';
import { validDesign } from '../src/model';
import { characterDesign } from '../src/characterLibraryModel';
import characters from '../src/assets/character-library/characters.json' with { type: 'json' };

test('all 57 characters have valid, decodable artwork and persistable designs', async ({
  page,
}) => {
  expect(characters).toHaveLength(57);
  expect(new Set(characters.map((c) => c.id)).size).toBe(57);
  expect(characters[0].id).toBe('laptop-buddy');
  expect(characters.filter((c) => c.category === 'Anime')).toHaveLength(29);
  expect(characters.filter((c) => c.category === 'Game')).toHaveLength(27);
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
  expect(decoded).toHaveLength(228);
  expect(decoded.every(Boolean)).toBe(true);
});

test('browse, filter, and preview the library without changing saved pets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  const cards = page.locator('.character-card');
  await expect(cards).toHaveCount(57);
  await expect(cards.first()).toHaveAttribute('data-character-id', 'laptop-buddy');
  await page.getByRole('button', { name: 'Anime', exact: true }).click();
  await expect(cards).toHaveCount(29);
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  await expect(cards).toHaveCount(27);
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
  // Freeze timers while inspecting the brief typing pose, then advance explicitly.
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('textbox', { name: 'Typing playground' }).press('a');
  await expect(image).toHaveAttribute('data-pose', 'typing');
  await expect(image).toHaveAttribute(
    'src',
    characters.find((c) => c.id === 'naruto')!.poses.typing,
  );
  await page.clock.runFor(350);
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
  await expect(page.locator('.character-card')).toHaveCount(57);
});

test('shows a partial library directly below typing and opens the full collection', async ({
  page,
}) => {
  await page.goto('/');
  const preview = page.getByTestId('character-library-preview');
  await expect(preview.locator('.character-card')).toHaveCount(8);
  await expect(preview.locator('.character-card').first()).toHaveAttribute(
    'data-character-id',
    'laptop-buddy',
  );
  for (const name of ['Frieren', 'Fern', 'Inuyasha', 'Kagome', 'Crash', 'Spyro', 'Rayman'])
    await expect(
      preview.getByRole('button', { name: `Choose ${name}`, exact: true }),
    ).toBeVisible();
  const typing = await page.locator('.typing-card').boundingBox();
  const library = await preview.boundingBox();
  expect(library!.y).toBeGreaterThanOrEqual(typing!.y + typing!.height);
  expect(library!.y - typing!.y - typing!.height).toBeLessThan(40);
  const input = page.getByRole('textbox', { name: 'Typing playground' });
  await input.fill('Keep my writing');
  await preview.getByRole('button', { name: 'Choose Frieren', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Frieren' })).toBeVisible();
  await expect(input).toHaveValue('Keep my writing');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute(
    'data-animated',
    'true',
  );
  await preview.getByRole('button', { name: 'Browse all 57 pets', exact: true }).click();
  await expect(page.locator('.character-card')).toHaveCount(57);
  await expect(page.getByRole('searchbox', { name: 'Search characters' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Spyro');
  await expect(page.locator('.character-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Choose Spyro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Spyro' })).toBeVisible();
  await expect(page.getByTestId('character-library-preview')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
