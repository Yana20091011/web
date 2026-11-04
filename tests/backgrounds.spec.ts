import { test, expect } from '@playwright/test';
import catalog from '../desktop/background-catalog.json' with { type: 'json' };
import characters from '../src/assets/character-library/catalog.json' with { type: 'json' };
import { classifiedSeries, franchiseFor } from '../src/libraryTaxonomy';
import { DEFAULT_PET, DEFAULT_REACTIONS, validDesign } from '../src/model';
import { exportPetFile, importPetFile } from '../src/petTransferFormat';

test('background metadata covers every character world and safely transfers known choices', () => {
  expect(catalog.length).toBe(22);
  expect(new Set(catalog.map((background) => background.id)).size).toBe(catalog.length);
  for (const character of characters.entries.filter((entry) => entry.category !== 'Original')) {
    const series = classifiedSeries(character.id, character.series);
    expect(
      catalog.some(
        (background) =>
          background.series.includes(series) || background.series.includes(franchiseFor(series)),
      ),
      character.name,
    ).toBe(true);
  }
  expect(validDesign(DEFAULT_PET)).toBe(true);
  const pet = {
    design: { ...DEFAULT_PET, backgroundId: 'leaf-village', libraryCharacterId: 'naruto' },
    reactions: DEFAULT_REACTIONS,
  };
  expect(importPetFile(exportPetFile(pet))).toEqual(pet);
  for (const backgroundId of [
    'javascript:alert(1)',
    '../../private',
    'https://example.com/bg.png',
    null,
    {},
    'unknown-scene',
  ]) {
    expect(validDesign({ ...DEFAULT_PET, backgroundId })).toBe(false);
    expect(() =>
      importPetFile(
        JSON.stringify({
          format: 'keycritter-pet',
          version: 1,
          pet: { ...pet, design: { ...pet.design, backgroundId } },
        }),
      ),
    ).toThrow();
  }
});

test('suggests the character world after renaming and restores the chosen background with a saved pet', async ({
  page,
}) => {
  await page.goto('/');
  const scene = page.getByTestId('room-background');
  await expect(scene).toHaveAttribute('data-background-id', 'cozy-room');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page.getByRole('button', { name: 'Choose Naruto', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Leaf buddy');
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await expect(page.getByRole('button', { name: 'For Naruto', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Use Wisteria tea garden background', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Use Leaf village rooftop background', exact: true })
    .click();
  await expect(scene).toHaveAttribute('data-background-id', 'leaf-village');
  await expect(scene).toHaveAttribute('style', /leaf-village.*webp/);
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await expect(scene).toHaveAttribute('data-background-id', 'leaf-village');
  await page.getByRole('button', { name: 'Switch to evening', exact: true }).click();
  await expect(page.locator('.room')).toHaveClass(/night/);
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await page
    .getByRole('button', { name: 'Use Wisteria tea garden background', exact: true })
    .click();
  await expect(scene).toHaveAttribute('data-background-id', 'wisteria-garden');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page
    .locator('.saved-pet-card')
    .filter({ has: page.getByRole('heading', { name: 'Leaf buddy', exact: true }) })
    .getByRole('button', { name: 'Hang out', exact: true })
    .click();
  await expect(scene).toHaveAttribute('data-background-id', 'leaf-village');
});

test('browses anime and game backgrounds, decodes every scene, and resets without changing the pet', async ({
  page,
}) => {
  await page.goto('/');
  const picker = page.getByRole('region', { name: 'Room backgrounds', exact: true });
  await picker.getByRole('button', { name: 'Change background', exact: true }).click();
  await picker.getByRole('button', { name: 'All backgrounds', exact: true }).click();
  await expect(picker.locator('.background-option')).toHaveCount(catalog.length);
  const decoded = await picker.locator('.background-option img').evaluateAll((images) =>
    Promise.all(
      images.map(async (element) => {
        const image = new Image();
        image.src = (element as HTMLImageElement).src;
        await image.decode();
        return image.naturalWidth >= 900 && image.naturalHeight >= 500;
      }),
    ),
  );
  expect(decoded.every(Boolean)).toBe(true);
  await picker.getByRole('button', { name: 'Game', exact: true }).click();
  await picker
    .getByRole('combobox', { name: 'Background series', exact: true })
    .selectOption('Sonic the Hedgehog');
  await expect(picker.locator('.background-option')).toHaveCount(2);
  await picker
    .getByRole('button', { name: 'Use Emerald hill terrace background', exact: true })
    .click();
  await expect(page.getByTestId('room-background')).toHaveAttribute(
    'data-background-id',
    'emerald-hills',
  );
  await picker.getByRole('button', { name: 'Anime', exact: true }).click();
  await expect(
    picker.getByRole('combobox', { name: 'Background series', exact: true }),
  ).toHaveValue('All');
  await picker
    .getByRole('combobox', { name: 'Background series', exact: true })
    .selectOption('Naruto');
  await expect(picker.locator('.background-option')).toHaveCount(2);
  await picker.getByRole('button', { name: 'Reset to cozy room', exact: true }).click();
  await expect(page.getByTestId('room-background')).toHaveAttribute(
    'data-background-id',
    'cozy-room',
  );
  await expect(page.getByTestId('room-background')).not.toHaveAttribute(
    'style',
    /background-image/,
  );
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Mochi');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
