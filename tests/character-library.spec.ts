import { test, expect } from '@playwright/test';
import { validDesign } from '../src/model';
import { characterDesign } from '../src/characterLibraryModel';
import characters from '../src/assets/character-library/characters.json' with { type: 'json' };
import catalog from '../src/assets/character-library/catalog.json' with { type: 'json' };
import { classifiedSeries, franchiseFor } from '../src/libraryTaxonomy';
const TOTAL = characters.length;
const PAGE_SIZE = 24;

test('at least 300 unique characters have valid, decodable artwork and persistable designs', async ({
  page,
}) => {
  test.setTimeout(60000);
  expect(TOTAL).toBeGreaterThanOrEqual(300);
  expect(catalog.entries).toHaveLength(TOTAL);
  for (const entry of catalog.entries) {
    const series = classifiedSeries(entry.id, entry.series);
    expect(series.trim().length).toBeGreaterThan(0);
    expect(franchiseFor(series).trim().length).toBeGreaterThan(0);
  }
  expect(new Set(characters.map((c) => c.id)).size).toBe(TOTAL);
  expect(characters[0].id).toBe('laptop-buddy');
  expect(characters.filter((c) => c.category === 'Anime').length).toBeGreaterThanOrEqual(100);
  expect(characters.filter((c) => c.category === 'Game').length).toBeGreaterThanOrEqual(90);
  for (const character of characters) {
    expect(validDesign(characterDesign(character))).toBe(true);
    if (character.id !== 'laptop-buddy')
      expect(new Set(Object.values(character.poses)).size).toBe(4);
  }
  await page.goto('/');
  const decoded = await page.evaluate(async (characters) => {
    const images = characters.flatMap((c) => Object.values(c.poses));
    const result: boolean[] = [];
    for (let offset = 0; offset < images.length; offset += 24) {
      result.push(
        ...(await Promise.all(
          images.slice(offset, offset + 24).map(async (src) => {
            const image = new Image();
            image.src = src;
            await image.decode();
            return image.naturalWidth > 0 && image.naturalHeight > 0;
          }),
        )),
      );
    }
    return result;
  }, characters);
  expect(decoded).toHaveLength(TOTAL * 4);
  expect(decoded.every(Boolean)).toBe(true);
});

test('browse, filter, and preview the library without changing saved pets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  const cards = page.locator('.character-card');
  await expect(cards).toHaveCount(PAGE_SIZE);
  await expect(cards.first()).toHaveAttribute('data-character-id', 'laptop-buddy');
  await page.getByRole('button', { name: 'Anime', exact: true }).click();
  await expect(cards).toHaveCount(PAGE_SIZE);
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  await expect(cards).toHaveCount(PAGE_SIZE);
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Undertale');
  await expect(cards).toHaveCount(
    Math.min(
      PAGE_SIZE,
      characters.filter(
        (c) => c.category === 'Game' && `${c.name} ${c.series}`.toLowerCase().includes('undertale'),
      ).length,
    ),
  );
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
  await expect(page.locator('.character-card')).toHaveCount(PAGE_SIZE);
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
  for (const name of catalog.featured.map((id) => characters.find((c) => c.id === id)!.name))
    await expect(
      preview.getByRole('button', { name: `Choose ${name}`, exact: true }),
    ).toBeVisible();
  const typing = await page.locator('.typing-card').boundingBox();
  const library = await preview.boundingBox();
  expect(library!.y).toBeGreaterThanOrEqual(typing!.y + typing!.height);
  expect(library!.y - typing!.y - typing!.height).toBeLessThan(40);
  const input = page.getByRole('textbox', { name: 'Typing playground' });
  await input.fill('Keep my writing');
  await preview
    .getByRole('button', {
      name: `Choose ${characters.find((c) => c.id === catalog.featured[1])!.name}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', {
      name: `Meet ${characters.find((c) => c.id === catalog.featured[1])!.name}`,
    }),
  ).toBeVisible();
  await expect(input).toHaveValue('Keep my writing');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute(
    'data-animated',
    'true',
  );
  await preview.getByRole('button', { name: `Browse all ${TOTAL} pets`, exact: true }).click();
  await expect(page.locator('.character-card')).toHaveCount(PAGE_SIZE);
  await expect(page.getByRole('searchbox', { name: 'Search characters' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Spyro');
  await expect(page.locator('.character-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Choose Spyro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Spyro' })).toBeVisible();
  await expect(page.getByTestId('character-library-preview')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('paginates every character without duplicates and searches across all pages', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  const pages = Math.ceil(TOTAL / PAGE_SIZE);
  const seen: string[] = [];
  const cards = page.locator('.character-card');
  for (let n = 1; n <= pages; n++) {
    await expect(page.locator('.character-results')).toContainText(`Page ${n} of ${pages}`);
    await expect(cards).toHaveCount(Math.min(PAGE_SIZE, TOTAL - (n - 1) * PAGE_SIZE));
    seen.push(
      ...(await cards.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-character-id')!),
      )),
    );
    if (n < pages)
      await page.getByRole('button', { name: 'Next library page', exact: true }).click();
  }
  expect(seen).toHaveLength(TOTAL);
  expect(new Set(seen).size).toBe(TOTAL);
  await expect(page.getByRole('button', { name: 'Next library page', exact: true })).toBeDisabled();
  const last = characters.at(-1)!;
  await page.getByRole('searchbox', { name: 'Search characters' }).fill(last.name);
  await expect(page.locator(`.character-card[data-character-id="${last.id}"]`)).toBeVisible();
  await expect(page.locator('.character-results')).toContainText('Page 1 of 1');
});

test('does not fetch full pose batches until a pet or pose is selected', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/batches/')) requests.push(request.url());
  });
  await page.goto('/');
  await expect(
    page.getByTestId('character-library-preview').locator('.character-card'),
  ).toHaveCount(8);
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(page.locator('.character-card')).toHaveCount(PAGE_SIZE);
  expect(requests).toHaveLength(0);
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Ichigo');
  await page.getByRole('button', { name: 'Choose Ichigo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Ichigo' })).toBeVisible();
  expect(requests.length).toBeGreaterThan(0);
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute(
    'data-animated',
    'true',
  );
});

test('classifies by franchise and series, combines type filters, sorts, and resets cleanly', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  const franchise = page.getByRole('combobox', { name: 'Filter by franchise' });
  const series = page.getByRole('combobox', { name: 'Filter by series' });
  const cards = page.locator('.character-card');
  await franchise.selectOption('Studio Ghibli');
  await expect(cards).toHaveCount(11);
  await series.selectOption('Howl’s Moving Castle');
  await expect(cards).toHaveCount(3);
  await expect(cards.getByRole('heading', { name: 'Howl', exact: true })).toBeVisible();
  await expect(cards.getByRole('heading', { name: 'Sophie', exact: true })).toBeVisible();
  await expect(cards.getByRole('heading', { name: 'Calcifer', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Anime', exact: true }).click();
  await expect(franchise).toHaveValue('All');
  await expect(series).toHaveValue('All');
  await franchise.selectOption('Naruto');
  await expect(cards).toHaveCount(12);
  await series.selectOption('Boruto');
  await expect(cards).toHaveCount(3);
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Sarada');
  await expect(cards).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(franchise).toHaveValue('All');
  await expect(series).toHaveValue('All');
  await expect(page.getByRole('searchbox', { name: 'Search characters' })).toHaveValue('');
  await expect(cards).toHaveCount(PAGE_SIZE);
  await page.getByRole('combobox', { name: 'Sort characters' }).selectOption('name');
  const names = await cards.locator('h3').allTextContents();
  expect(names).toEqual(
    [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    ),
  );
  await page.getByRole('combobox', { name: 'Sort characters' }).selectOption('series');
  await expect(cards).toHaveCount(PAGE_SIZE);
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  await franchise.selectOption('Final Fantasy');
  await expect(cards).toHaveCount(9);
  await expect(series.locator('option')).toContainText(['All series', 'Final Fantasy VII']);
  await franchise.selectOption('Hades');
  await expect(cards).toHaveCount(5);
  await series.selectOption('Hades II');
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole('heading', { name: 'Melinoe', exact: true })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
