import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { DEFAULT_PET, DEFAULT_REACTIONS, validDesign } from '../src/model';
import { MAX_BACKGROUND_IMAGE_LENGTH } from '../src/backgroundUpload';
import { exportPetFile, importPetFile } from '../src/petTransferFormat';

test('uploaded backgrounds round-trip and reject unsafe or oversized image values', () => {
  const backgroundImage = 'data:image/png;base64,iVBORw0KGgo=';
  const pet = { design: { ...DEFAULT_PET, backgroundImage }, reactions: DEFAULT_REACTIONS };
  expect(importPetFile(exportPetFile(pet))).toEqual(pet);
  for (const invalid of [
    'https://example.com/bg.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,AA==")',
    null,
    {},
    'data:image/webp;base64,' + 'A'.repeat(MAX_BACKGROUND_IMAGE_LENGTH),
  ]) {
    expect(validDesign({ ...DEFAULT_PET, backgroundImage: invalid })).toBe(false);
    expect(() =>
      importPetFile(
        JSON.stringify({
          format: 'keycritter-pet',
          version: 1,
          pet: { ...pet, design: { ...pet.design, backgroundImage: invalid } },
        }),
      ),
    ).toThrow();
  }
});

test('uploads, saves, exports and imports a background while preserving the chosen pet', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page.getByRole('button', { name: 'Choose Naruto', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('My room');
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await page
    .getByRole('button', { name: 'Use Leaf village rooftop background', exact: true })
    .click();
  await page.getByLabel('Upload background image').setInputFiles('public/cozy-room.png');
  const room = page.getByTestId('room-background');
  await expect(room).toHaveAttribute('data-background-id', 'custom');
  await expect(room).toHaveAttribute('aria-label', 'Uploaded background');
  const uploaded = await page.evaluate(
    () => JSON.parse(localStorage.getItem('keycritter-draft')!).design,
  );
  expect(uploaded.libraryCharacterId).toBe('naruto');
  expect(uploaded.backgroundImage.length).toBeLessThanOrEqual(MAX_BACKGROUND_IMAGE_LENGTH);
  await expect(
    page.getByRole('button', { name: 'Use Leaf village rooftop background', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  const image = await page.getByAltText('Your uploaded background').evaluate(async (el) => {
    const image = el as HTMLImageElement;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  expect(Math.max(...image)).toBeLessThanOrEqual(1600);
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await expect(room).toHaveAttribute('data-background-id', 'custom');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export pet', exact: true }).click();
  const download = await pending;
  const contents = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(contents).pet.design.backgroundImage).toBe(uploaded.backgroundImage);
  const context = await browser.newContext();
  try {
    const destination = await context.newPage();
    await destination.goto(page.url());
    await destination
      .getByLabel('Import pet file')
      .setInputFiles({
        name: 'room.keycritter.json',
        mimeType: 'application/json',
        buffer: Buffer.from(contents),
      });
    await expect(destination.getByTestId('room-background')).toHaveAttribute(
      'data-background-id',
      'custom',
    );
    expect(
      await destination.evaluate(
        () => JSON.parse(localStorage.getItem('keycritter-draft')!).design.backgroundImage,
      ),
    ).toBe(uploaded.backgroundImage);
    await destination.reload();
    await expect(destination.getByTestId('room-background')).toHaveAttribute(
      'data-background-id',
      'custom',
    );
  } finally {
    await context.close();
  }
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await page.getByRole('button', { name: 'Remove uploaded background', exact: true }).click();
  await expect(room).toHaveAttribute('data-background-id', 'leaf-village');
  await page.getByLabel('Upload background image').setInputFiles('public/cozy-room.png');
  await expect(room).toHaveAttribute('data-background-id', 'custom');
  await page.getByRole('button', { name: 'Reset to cozy room', exact: true }).click();
  await expect(room).toHaveAttribute('data-background-id', 'cozy-room');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('keycritter-draft')!).design.backgroundImage,
    ),
  ).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('invalid uploads leave the existing background intact and can be retried', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await page
    .getByLabel('Upload background image')
    .setInputFiles({
      name: 'not-an-image.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('bad'),
    });
  await expect(page.getByRole('alert')).toContainText('PNG, JPG, or WebP');
  await expect(page.getByTestId('room-background')).toHaveAttribute(
    'data-background-id',
    'cozy-room',
  );
  await page
    .getByLabel('Upload background image')
    .setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('bad') });
  await expect(page.getByRole('alert')).toContainText('could not be opened');
  await page.getByLabel('Upload background image').setInputFiles('public/cozy-room.png');
  await expect(page.getByTestId('room-background')).toHaveAttribute('data-background-id', 'custom');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
