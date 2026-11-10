import { test, expect, type Page } from '@playwright/test';

async function frames(page: Page) {
  const images = await page.evaluate(() =>
    [0, 1, 2].map((blink) => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#b5dbb3';
      ctx.fillRect(16, 20, 64, 64);
      ctx.fillStyle = '#40374d';
      ctx.fillRect(30, 46, 7, blink === 0 ? 9 : blink === 1 ? 5 : 2);
      ctx.fillRect(59, 46, 7, blink === 0 ? 9 : blink === 1 ? 5 : 2);
      ctx.fillRect(43, 64, 10, 3);
      return canvas.toDataURL('image/png');
    }),
  );
  return images.map((image, index) => ({
    name: `blink-${index + 1}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(image.split(',')[1], 'base64'),
  }));
}
async function openEditor(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Animate', exact: true }).click();
}

test('applies the built-in blink offline, preserves the pet name, and restores editable frames', async ({
  page,
}) => {
  const aiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('openai.com')) aiRequests.push(request.url());
  });
  await openEditor(page);
  await page.getByLabel('Name', { exact: true }).fill('My laptop friend');
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Use laptop buddy', exact: true }).click();
  await expect(page.locator('.animation-frame')).toHaveCount(4);
  await expect(page.getByLabel('Frame 3 duration in milliseconds')).toHaveValue('400');
  await expect(page.getByLabel('Pause between repeats in milliseconds')).toHaveValue('3000');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('My laptop friend');
  const image = page.getByTestId('active-pet').locator('img');
  await expect(image).toHaveAttribute('data-animated', 'true');
  await expect.poll(() => image.getAttribute('data-frame-index'), { intervals: [20] }).toBe('2');
  await expect(page.getByRole('checkbox', { name: 'Repeat animation', exact: true })).toBeChecked();
  const preset = await page.evaluate(
    () => JSON.parse(localStorage.getItem('keycritter-draft')!).design,
  );
  expect(
    preset.animations.idle.frames.map((frame: { duration: number }) => frame.duration),
  ).toEqual([100, 120, 400, 120]);
  expect(preset.animations.idle.frames[1].image).toBe(preset.animations.idle.frames[3].image);
  expect(preset.images.idle).toBe(preset.animations.idle.frames[0].image);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.locator('.animation-frame')).toHaveCount(4);
  await expect(page.getByLabel('Frame 3 duration in milliseconds')).toHaveValue('400');
  await page.getByLabel('Frame 3 duration in milliseconds').fill('600');
  await page.getByLabel('Frame 3 duration in milliseconds').press('Enter');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('keycritter-draft')!).design.animations.idle.frames[2]
          .duration,
    ),
  ).toBe(600);
  expect(aiRequests).toEqual([]);
});

test('a ready-made sequence replaces only the selected animation and keeps existing reactions', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel('Animation frame files').setInputFiles(await frames(page));
  await expect(page.locator('.animation-frame')).toHaveCount(3);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('keycritter-draft')!));
  await page.getByLabel('Animation pose').selectOption('cheer');
  await page.getByRole('button', { name: 'Use laptop buddy', exact: true }).click();
  await expect(page.locator('.animation-frame')).toHaveCount(4);
  await page.getByRole('button', { name: 'Use laptop buddy', exact: true }).click();
  await expect(page.locator('.animation-frame')).toHaveCount(4);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('keycritter-draft')!));
  expect(after.design.animations.idle).toEqual(before.design.animations.idle);
  expect(after.design.images.idle).toBe(before.design.images.idle);
  expect(after.reactions).toEqual(before.reactions);
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute('data-pose', 'cheer');
});

test('uploads, reorders, times, and saves a blinking pet; frames survive reload', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel('Animation frame files').setInputFiles(await frames(page));
  const image = page.getByTestId('active-pet').locator('img');
  await expect(image).toHaveAttribute('data-animated', 'true');
  await expect.poll(() => image.getAttribute('data-frame-index'), { intervals: [20] }).toBe('2');
  const first = await page.getByAltText('Frame 1', { exact: true }).getAttribute('src');
  const second = await page.getByAltText('Frame 2', { exact: true }).getAttribute('src');
  await page.getByRole('button', { name: 'Move frame 1 later', exact: true }).click();
  await expect(page.getByAltText('Frame 1', { exact: true })).toHaveAttribute('src', second!);
  await expect(page.getByAltText('Frame 2', { exact: true })).toHaveAttribute('src', first!);
  await page.getByRole('button', { name: /Use blink timing/ }).click();
  await expect(page.getByLabel('Frame 1 duration in milliseconds')).toHaveValue('100');
  await expect(page.getByLabel('Pause between repeats in milliseconds')).toHaveValue('3000');
  await page.getByRole('checkbox', { name: 'Repeat animation', exact: true }).uncheck();
  await expect(image).toHaveAttribute('data-frame-index', '2');
  const held = await image.getAttribute('src');
  await page.waitForTimeout(400);
  await expect(image).toHaveAttribute('src', held!);
  await page.getByRole('checkbox', { name: 'Use this animation on my pet' }).uncheck();
  await expect(image).toHaveAttribute('data-animated', 'false');
  await page.getByRole('checkbox', { name: 'Use this animation on my pet' }).check();
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Animate', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByAltText('Frame 1', { exact: true })).toHaveAttribute('src', second!);
  await page.getByRole('button', { name: 'Remove frame 2', exact: true }).click();
  await expect(page.locator('.animation-frame')).toHaveCount(2);
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(page.locator('.saved-pet-scene img')).toHaveAttribute('data-animated', 'false');
});

test('a key plays its own frames; changing a static image disables only that pose animation', async ({
  page,
}) => {
  await openEditor(page);
  const files = await frames(page);
  await page.getByLabel('Animation frame files').setInputFiles(files);
  await page.getByLabel('Animation pose').selectOption('cheer');
  await page.getByLabel('Animation frame files').setInputFiles(files.slice(1));
  await expect(page.locator('.animation-frame')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  const image = page.getByTestId('active-pet').locator('img');
  await expect(image).toHaveAttribute('data-pose', 'cheer');
  await expect.poll(() => image.getAttribute('data-frame-index'), { intervals: [20] }).toBe('1');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload Cheer image', exact: true }).click();
  await (await chooser).setFiles(files[0]);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('keycritter-draft')!).design.animations.cheer.enabled,
      ),
    )
    .toBe(false);
  // Safari's file picker can outlast the reaction. Preview it again rather than
  // assuming it is still active while checking that the uploaded pose is static.
  await page.getByRole('button', { name: 'Preview Enter reaction', exact: true }).click();
  await expect(image).toHaveAttribute('data-pose', 'cheer');
  await expect(image).toHaveAttribute('data-animated', 'false');
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Space');
  await expect(image).toHaveAttribute('data-pose', 'idle');
  await expect(image).toHaveAttribute('data-animated', 'true');
});

test('rejects invalid batches without losing frames and keeps a still frame for reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  const files = await frames(page);
  await page.getByLabel('Animation frame files').setInputFiles(files);
  const image = page.getByTestId('active-pet').locator('img');
  await expect(image).toHaveAttribute('data-frame-index', '0');
  await expect(image).toHaveAttribute('data-animated', 'false');
  await page
    .getByLabel('Animation frame files')
    .setInputFiles([
      files[0],
      { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('bad data') },
    ]);
  await expect(page.getByRole('alert')).toContainText('could not be opened');
  await expect(page.locator('.animation-frame')).toHaveCount(3);
  await page.getByLabel('Animation frame files').setInputFiles(Array(10).fill(files[0]));
  await expect(page.getByRole('alert')).toContainText('up to 12 frames');
  await expect(page.locator('.animation-frame')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
