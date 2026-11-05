import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import catalog from '../src/assets/character-library/catalog.json' with { type: 'json' };
import manifest from '../src/assets/character-library/expressions/manifest.json' with { type: 'json' };
import confidentManifest from '../src/assets/character-library/expressions/confident-manifest.json' with { type: 'json' };
import base from '../src/assets/character-library/characters.json' with { type: 'json' };
import { characterDesign } from '../src/characterLibraryModel';
import { DEFAULT_REACTIONS, validDesign } from '../src/model';
import { exportPetFile, importPetFile } from '../src/petTransferFormat';
const root = 'src/assets/character-library/';
const columns = ['wave', 'peace', 'shy', 'sleep', 'tired', 'drink'];
const confidentIds = new Set(confidentManifest.sheets.flatMap((sheet) => sheet.ids));
const batchCache = new Map<string, Promise<any[]>>();
async function completeCharacter(id: string) {
  const entry = catalog.entries.find((entry) => entry.id === id)!;
  let batch = batchCache.get(entry.batch);
  if (!batch) {
    batch = readFile(root + 'batches/' + entry.batch + '.json', 'utf8').then((text) =>
      JSON.parse(text),
    );
    batchCache.set(entry.batch, batch);
  }
  return (await batch).find((character: any) => character.id === id);
}

test('all 500 characters have six distinct decodable reference poses in their published batches', async ({
  page,
}) => {
  test.setTimeout(90000);
  expect(manifest.columns).toEqual(columns);
  expect(confidentIds.size).toBe(264);
  await page.goto('/');
  const ids = new Set<string>();
  let decoded = 0;
  for (const sheet of manifest.sheets) {
    const extra = JSON.parse(
      await readFile(root + 'expressions/data/' + sheet.key + '.json', 'utf8'),
    );
    expect(extra.map((character: any) => character.id)).toEqual(sheet.ids);
    for (const character of extra) {
      expect(ids.has(character.id), character.id).toBe(false);
      ids.add(character.id);
      expect(new Set(Object.values(character.poses)).size, character.id).toBe(6);
      const full = await completeCharacter(character.id);
      const expectedStyle = confidentIds.has(character.id) ? 'confident' : 'reference';
      expect(full.poseStyle, character.id).toBe(expectedStyle);
      expect(character.poseStyle || 'reference', character.id).toBe(expectedStyle);
      for (const pose of columns)
        expect(full.poses[pose] === character.poses[pose], character.id + ' ' + pose).toBe(true);
      const design = characterDesign(full);
      expect(validDesign(design), character.id).toBe(true);
      expect(
        importPetFile(exportPetFile({ design, reactions: DEFAULT_REACTIONS })).design.images
          ?.drink === character.poses.drink,
      ).toBe(true);
    }
    const checks = await page.evaluate(async (characters) => {
      return Promise.all(
        characters.flatMap((character: any) =>
          Object.entries(character.poses).map(async ([pose, source]) => {
            const image = new Image();
            image.src = source as string;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 192;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, 192, 192).data;
            let ink = 0;
            for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 64) ink++;
            return {
              id: character.id,
              pose,
              ok: image.naturalWidth === 192 && image.naturalHeight === 192 && ink > 500,
            };
          }),
        ),
      );
    }, extra);
    expect(checks.filter((check) => !check.ok)).toEqual([]);
    decoded += checks.length;
  }
  expect(ids.size).toBe(500);
  expect(decoded).toBe(3000);
});

test('offers confident male gestures and reference-style female poses', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  const male = page.getByRole('combobox', { name: 'More poses for Naruto', exact: true });
  const female = page.getByRole('combobox', { name: 'More poses for Sakura', exact: true });
  await expect(male.locator('option')).toHaveText([
    'More poses…',
    'Thumbs up',
    'Casual V sign',
    'Head scratch',
    'Folded-arm nap',
    'Neck stretch',
    'Drink',
  ]);
  await expect(female.locator('option')).toHaveText([
    'More poses…',
    'Paw raise',
    'Peace signs',
    'Shy',
    'Desk nap',
    'Tired',
    'Drink',
  ]);
  await male.selectOption('shy');
  await expect(page.locator('.character-card[data-character-id="naruto"] img')).toHaveAttribute(
    'alt',
    'Naruto shy pose',
  );
  await female.selectOption('shy');
  await expect(page.locator('.character-card[data-character-id="sakura"] img')).toHaveAttribute(
    'alt',
    'Sakura shy pose',
  );
});

test('previews every new body pose and uses the matching artwork for key reactions', async ({
  page,
}) => {
  test.setTimeout(60000);
  const character = await completeCharacter('naruto');
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page.getByRole('searchbox', { name: 'Search characters' }).fill('Naruto');
  const card = page
    .locator('.character-card')
    .filter({ has: page.getByRole('heading', { name: 'Naruto', exact: true }) });
  for (const pose of columns) {
    await card
      .getByRole('combobox', { name: 'More poses for Naruto', exact: true })
      .selectOption(pose);
    await expect(card.locator('img')).toHaveAttribute('alt', `Naruto ${pose} pose`);
    await expect
      .poll(async () => (await card.locator('img').getAttribute('src')) === character.poses[pose])
      .toBe(true);
  }
  await card.getByRole('button', { name: 'Choose Naruto', exact: true }).click();
  const image = page.getByTestId('active-pet').locator('img');
  for (const [action, pose] of [
    ['jump', 'wave'],
    ['dance', 'peace'],
    ['surprise', 'shy'],
    ['sleep', 'sleep'],
    ['tired', 'tired'],
    ['drink', 'drink'],
  ]) {
    await page.getByRole('button', { name: 'Edit Enter reaction', exact: true }).click();
    await page.getByLabel('Reaction animation').selectOption(action);
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
    await expect(image).toHaveAttribute('data-pose', action);
    await expect
      .poll(async () => (await image.getAttribute('src')) === character.poses[pose])
      .toBe(true);
  }
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute('data-pose', 'drink');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('updates a saved library pet without losing its name, background, sizing or reactions', async ({
  page,
}) => {
  const old = characterDesign(base.find((character) => character.id === 'naruto')!);
  const design = {
    ...old,
    name: 'Old friend',
    backgroundId: 'leaf-village',
    size: 125,
    motionStrength: 0,
    images: {
      ...old.images,
      dance: base.find((character) => character.id === 'sakura')!.poses.happy,
    },
  };
  const reactions = [{ id: 'rest', key: 'Enter', action: 'sleep', phrase: 'Nap time' }];
  await page.addInitScript(
    (draft) => localStorage.setItem('keycritter-draft', JSON.stringify(draft)),
    { design, reactions, id: 'existing-pet' },
  );
  await page.goto('/');
  await expect
    .poll(async () =>
      page.evaluate(() =>
        Boolean(JSON.parse(localStorage.getItem('keycritter-draft')!).design.images?.drink),
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole('button', { name: 'Replace with latest library poses', exact: true }),
  ).toHaveCount(0);
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('keycritter-draft')!));
  const { name, backgroundId, size, motionStrength, libraryCharacterId } = draft.design;
  expect({ name, backgroundId, size, motionStrength, libraryCharacterId }).toEqual({
    name: 'Old friend',
    backgroundId: 'leaf-village',
    size: 125,
    motionStrength: 0,
    libraryCharacterId: 'naruto',
  });
  expect(draft.reactions).toEqual(reactions);
  expect(draft.design.animations).toEqual(design.animations);
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  for (const pose of ['sleep', 'tired', 'drink'])
    await expect(
      page
        .getByRole('button', {
          name: `Upload ${pose[0].toUpperCase() + pose.slice(1)} image`,
          exact: true,
        })
        .locator('img'),
    ).toBeVisible();
  expect(draft.design.images.dance).toBe(design.images.dance);
  expect(Boolean(draft.design.images.drink && draft.design.images.tired)).toBe(true);
  expect(draft.design.images.sleep === old.images!.sleep).toBe(false);
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute('data-pose', 'sleep');
  await expect(page.getByTestId('room-background')).toHaveAttribute(
    'data-background-id',
    'leaf-village',
  );
});
