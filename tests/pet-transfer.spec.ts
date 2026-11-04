import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { exportPetFile, importPetFile, MAX_PET_FILE_BYTES } from '../src/petTransferFormat';
import { DEFAULT_PET, DEFAULT_REACTIONS } from '../src/model';
import { characterDesign } from '../src/characterLibraryModel';
import characters from '../src/assets/character-library/characters.json' with { type: 'json' };

test('transfer format round-trips complete pet data while excluding unrelated fields', () => {
  const pet = {
    design: { ...characterDesign(characters[1]), motionStrength: 25, backgroundId: 'leaf-village' },
    reactions: DEFAULT_REACTIONS,
  };
  expect(importPetFile(exportPetFile(pet))).toEqual(pet);
  const extra = {
    ...pet,
    token: 'not-a-real-key',
    design: { ...pet.design, apiKey: 'not-a-real-key' },
    reactions: pet.reactions.map((r) => ({ ...r, unrelated: 'omit' })),
  };
  const text = exportPetFile(extra);
  expect(text).not.toContain('not-a-real-key');
  expect(text).not.toContain('unrelated');
  expect(importPetFile(text)).toEqual(pet);
  expect(() =>
    exportPetFile({
      ...pet,
      reactions: [
        { ...DEFAULT_REACTIONS[1], id: 'one', key: 'Enter' },
        { ...DEFAULT_REACTIONS[1], id: 'two', key: 'enter' },
      ],
    }),
  ).toThrow('key reactions');
  for (const c of characters)
    expect(
      importPetFile(exportPetFile({ design: characterDesign(c), reactions: DEFAULT_REACTIONS }))
        .design.name,
    ).toBe(c.name);
});

test('exported pet imports into a fresh browser with its artwork, frames, reactions, and saved copy', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page.getByRole('button', { name: 'Choose Naruto', exact: true }).click();
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await page
    .getByRole('button', { name: 'Use Leaf village rooftop background', exact: true })
    .click();
  await page.getByLabel('Name', { exact: true }).fill('Travel buddy');
  const expected = await page.evaluate(
    () => JSON.parse(localStorage.getItem('keycritter-draft')!).design,
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export pet', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('Travel-buddy.keycritter.json');
  const contents = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(contents).pet.design).toEqual(expected);
  const context = await browser.newContext();
  try {
    const destination = await context.newPage();
    await destination.goto(page.url());
    await destination.getByLabel('Name', { exact: true }).fill('My existing pet');
    await destination.getByRole('button', { name: 'Save pet', exact: true }).click();
    await destination.getByLabel('Import pet file').setInputFiles({
      name: download.suggestedFilename(),
      mimeType: 'application/json',
      buffer: Buffer.from(contents),
    });
    await expect(destination.getByRole('heading', { name: 'Meet Travel buddy' })).toBeVisible();
    await expect(destination.getByTestId('room-background')).toHaveAttribute(
      'data-background-id',
      'leaf-village',
    );
    await expect(
      destination.getByRole('status').filter({ hasText: 'imported and saved' }),
    ).toBeVisible();
    const saved = await destination.evaluate(() =>
      JSON.parse(localStorage.getItem('keycritter-pets')!),
    );
    expect(saved).toHaveLength(2);
    expect(saved[0].design.name).toBe('My existing pet');
    expect(saved[1].design).toEqual(expected);
    expect(saved[1].reactions).toEqual(DEFAULT_REACTIONS);
    await destination.reload();
    await expect(destination.getByRole('heading', { name: 'Meet Travel buddy' })).toBeVisible();
    await expect(destination.getByTestId('active-pet').locator('img')).toHaveAttribute(
      'data-animated',
      'true',
    );
    await destination.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
    await expect(destination.getByTestId('active-pet')).toHaveAttribute('data-action', 'cheer');
    await destination.getByLabel('Import pet file').setInputFiles({
      name: 'again.keycritter.json',
      mimeType: 'application/json',
      buffer: Buffer.from(contents),
    });
    await expect
      .poll(() =>
        destination.evaluate(() => JSON.parse(localStorage.getItem('keycritter-pets')!).length),
      )
      .toBe(3);
    const ids = await destination.evaluate(() =>
      JSON.parse(localStorage.getItem('keycritter-pets')!).map((p: { id: string }) => p.id),
    );
    expect(new Set(ids).size).toBe(3);
  } finally {
    await context.close();
  }
});

test('invalid, future, unsafe, oversized, and unreadable pets leave the current pet and collection untouched', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Name', { exact: true }).fill('Keep me');
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  const good = {
    format: 'keycritter-pet',
    version: 1,
    pet: { design: DEFAULT_PET, reactions: DEFAULT_REACTIONS },
  };
  const files = [
    '{broken',
    JSON.stringify({ ...good, version: 99 }),
    JSON.stringify({
      ...good,
      pet: {
        ...good.pet,
        design: {
          ...DEFAULT_PET,
          species: 'custom',
          images: { idle: 'https://example.com/remote.png' },
        },
      },
    }),
    JSON.stringify({
      ...good,
      pet: { ...good.pet, reactions: [DEFAULT_REACTIONS[0], DEFAULT_REACTIONS[0]] },
    }),
    JSON.stringify({
      ...good,
      pet: {
        ...good.pet,
        design: {
          ...DEFAULT_PET,
          species: 'custom',
          images: { idle: 'data:image/png;base64,AAAA' },
        },
      },
    }),
    ' '.repeat(MAX_PET_FILE_BYTES + 1),
  ];
  for (const text of files) {
    await page.getByLabel('Import pet file').setInputFiles({
      name: 'bad.keycritter.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text),
    });
    await expect(
      page.getByRole('region', { name: 'Transfer your pet' }).getByRole('alert'),
    ).toBeVisible();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Keep me');
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('keycritter-pets')!).length),
    ).toBe(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('storage failure preserves the active pet and does not report import success', async ({
  page,
}) => {
  await page.goto('/');
  const contents = exportPetFile({
    design: { ...DEFAULT_PET, name: 'Cannot save' },
    reactions: DEFAULT_REACTIONS,
  });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'keycritter-pets') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByLabel('Import pet file').setInputFiles({
    name: 'pet.keycritter.json',
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  });
  await expect(page.getByRole('alert')).toContainText('current pet is unchanged');
  await expect(page.getByRole('heading', { name: 'Meet Mochi' })).toBeVisible();
});
