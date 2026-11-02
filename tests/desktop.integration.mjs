import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const profile = await mkdtemp(join(tmpdir(), 'keycritter-desktop-'));
const appPath = process.env.KEYCRITTER_APP_PATH || '.';
const errors = [];
let desktop;
try {
  desktop = await electron.launch({
    args: [appPath, '--no-sandbox', '--disable-gpu', `--profile=${profile}`],
    cwd: resolve('.'),
    timeout: 30000,
  });
  desktop.process().stderr.on('data', (data) => {
    if (String(data).includes('KeyCritter could not start')) console.error(String(data));
  });
  await expect.poll(() => desktop.windows().length).toBe(2);
  const designer = desktop.windows().find((w) => !w.url().includes('#companion'));
  const companion = desktop.windows().find((w) => w.url().includes('#companion'));
  if (!designer || !companion) throw new Error('Both desktop windows must load.');
  for (const page of [designer, companion])
    page.on('pageerror', (error) => errors.push(error.message));
  await expect(designer.getByRole('heading', { name: 'Meet Mochi' })).toBeVisible();
  const { version } = JSON.parse(await readFile('package.json', 'utf8'));
  await expect(designer.getByTestId('app-version')).toHaveText(`v${version}`);
  expect((await designer.evaluate(() => window.keycritter.getState())).version).toBe(version);
  await expect(companion.getByTestId('desktop-pet')).toBeVisible();
  const flags = await desktop.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().includes('#companion'),
    );
    return {
      alwaysOnTop: w.isAlwaysOnTop(),
      focusable: w.isFocusable(),
      resizable: w.isResizable(),
      background: w.getBackgroundColor(),
    };
  });
  expect(flags).toEqual({
    alwaysOnTop: true,
    focusable: false,
    resizable: false,
    background: '#000000',
  });
  await expect(
    designer.getByRole('button', { name: 'Pin pet above apps', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await designer.getByRole('button', { name: 'Pin pet above apps', exact: true }).click();
  await expect
    .poll(() =>
      desktop.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes('#companion'))
          .isAlwaysOnTop(),
      ),
    )
    .toBe(false);
  await companion.waitForTimeout(1800);
  expect((await companion.evaluate(() => window.keycritter.getState())).pinned).toBe(false);
  await companion.getByRole('button', { name: 'Pin pet above apps', exact: true }).click();
  await expect
    .poll(() =>
      desktop.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes('#companion'))
          .isAlwaysOnTop(),
      ),
    )
    .toBe(true);
  await expect(companion.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(designer.getByText('Reactions paused', { exact: true })).toBeVisible();
  await designer.getByLabel('Name', { exact: true }).fill('Desktop Mochi');
  await designer.getByRole('button', { name: 'Lavender color' }).click();
  await expect(companion.locator('.pixel-pet')).toHaveCSS('--pet-color', '#c7b5ee');
  await designer.getByRole('button', { name: 'Preview Space reaction', exact: true }).click();
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'jump');
  await designer.getByRole('button', { name: 'Enable keyboard reactions', exact: true }).click();
  await expect(designer.getByText('Reactions on', { exact: true })).toBeVisible({ timeout: 15000 });

  // A separate native window stands in for another app. XTest sends actual OS input.
  await desktop.evaluate(async ({ BrowserWindow }) => {
    const input = new BrowserWindow({
      width: 500,
      height: 220,
      title: 'KeyCritter input test',
      webPreferences: { contextIsolation: true, sandbox: true },
    });
    await input.loadURL(
      'data:text/html,<title>KeyCritter input test</title><textarea autofocus aria-label="External app"></textarea>',
    );
    input.show();
    input.focus();
  });
  await expect.poll(() => desktop.windows().some((w) => w.url().startsWith('data:'))).toBe(true);
  const input = desktop.windows().find((w) => w.url().startsWith('data:'));
  await expect(input.getByRole('textbox')).toBeVisible();
  const xdotool = process.env.XDOTOOL_PATH || 'xdotool';
  const xenv = { ...process.env };
  const nativeWindow = execFileSync(xdotool, ['search', '--name', '^KeyCritter input test$'], {
    env: xenv,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')[0];
  execFileSync(xdotool, ['windowfocus', '--sync', nativeWindow], { env: xenv });
  execFileSync(xdotool, ['key', 'space'], { env: xenv });
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'jump');
  await expect(input.getByRole('textbox')).toHaveValue(' ');
  await companion.waitForTimeout(150);
  execFileSync(xdotool, ['key', 'a'], { env: xenv });
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'tap');
  await expect(input.getByRole('textbox')).toHaveValue(' a');
  await designer.getByRole('button', { name: 'Add a reaction', exact: true }).click();
  await designer.getByRole('textbox', { name: 'Reaction key', exact: true }).press('k');
  await designer.getByLabel('Reaction animation').selectOption('dance');
  await designer.getByLabel('Reaction message').fill('Desktop dance!');
  await designer.getByRole('button', { name: 'Add', exact: true }).click();
  await expect
    .poll(async () =>
      (await companion.evaluate(() => window.keycritter.getState())).pet.reactions.some(
        (r) => r.key === 'k',
      ),
    )
    .toBe(true);
  execFileSync(xdotool, ['windowfocus', '--sync', nativeWindow], { env: xenv });
  execFileSync(xdotool, ['key', 'k'], { env: xenv });
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'dance');
  await expect(companion.locator('.companion-bubble')).toHaveText('Desktop dance!');
  // Closing the designer hides it without quitting the pet or keyboard hook.
  await desktop.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find(
        (w) =>
          w.webContents.getURL().startsWith('keycritter://app/index.html') &&
          !w.webContents.getURL().includes('#companion'),
      )
      .close(),
  );
  await companion.waitForTimeout(150);
  execFileSync(xdotool, ['key', 'Return'], { env: xenv });
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'cheer');
  await companion.getByRole('button', { name: 'Pause desktop reactions' }).click();
  await expect(companion.getByText('paused', { exact: true })).toBeVisible();
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'idle', {
    timeout: 4000,
  });
  execFileSync(xdotool, ['windowfocus', '--sync', nativeWindow], { env: xenv });
  execFileSync(xdotool, ['key', 'space'], { env: xenv });
  await companion.waitForTimeout(350);
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'idle');
  await companion.getByRole('button', { name: 'Open pet designer' }).click();
  await expect(designer.getByRole('heading', { name: 'Meet Desktop Mochi' })).toBeVisible();
  await designer.getByRole('button', { name: 'Upload', exact: true }).click();
  const customImage = await designer.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#bba2dd';
    ctx.fillRect(8, 8, 32, 32);
    return canvas.toDataURL('image/png');
  });
  await designer.getByLabel('Pet image file').setInputFiles({
    name: 'desktop-pet.png',
    mimeType: 'image/png',
    buffer: Buffer.from(customImage.split(',')[1], 'base64'),
  });
  await expect(companion.getByTestId('desktop-pet').locator('img')).toBeVisible();
  const poseChooser = designer.waitForEvent('filechooser');
  await designer.getByRole('button', { name: 'Upload Cheer image', exact: true }).click();
  await (
    await poseChooser
  ).setFiles({
    name: 'cheer.png',
    mimeType: 'image/png',
    buffer: Buffer.from(customImage.split(',')[1], 'base64'),
  });
  await designer.getByRole('button', { name: 'Preview Enter reaction', exact: true }).click();
  await expect(companion.getByTestId('desktop-pet').locator('img')).toHaveAttribute(
    'data-pose',
    'cheer',
  );
  await expect
    .poll(() =>
      companion.evaluate(() =>
        window.keycritter
          .getState()
          .then((s) => s.pet.design.images?.cheer?.startsWith('data:image/webp')),
      ),
    )
    .toBe(true);
  await designer.getByRole('button', { name: 'Animate', exact: true }).click();
  await designer.getByLabel('Animation frame files').setInputFiles(
    [0, 1].map((n) => ({
      name: `idle-${n}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from(customImage.split(',')[1], 'base64'),
    })),
  );
  await expect(designer.locator('.animation-frame')).toHaveCount(2);
  for (const n of [1, 2]) {
    await designer.getByLabel(`Frame ${n} duration in milliseconds`).fill('1000');
    await designer.getByLabel(`Frame ${n} duration in milliseconds`).press('Enter');
  }
  await designer.getByRole('button', { name: 'Enable keyboard reactions', exact: true }).click();
  await expect(designer.getByText('Reactions on', { exact: true })).toBeVisible();
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'idle');
  const animatedImage = companion.getByTestId('desktop-pet').locator('img');
  await expect(animatedImage).toHaveAttribute('data-animated', 'true');
  await expect
    .poll(() => animatedImage.getAttribute('data-frame-index'), { intervals: [20], timeout: 8000 })
    .toBe('1');
  const sameImage = await animatedImage.elementHandle();
  execFileSync(xdotool, ['windowfocus', '--sync', nativeWindow], { env: xenv });
  execFileSync(xdotool, ['key', 'q'], { env: xenv });
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-action', 'tap');
  await expect(animatedImage).toHaveAttribute('data-frame-index', '1');
  expect(
    await sameImage.evaluate(
      (node) => node === document.querySelector('[data-testid="desktop-pet"] img'),
    ),
  ).toBe(true);
  await designer.getByRole('button', { name: 'Pause reactions', exact: true }).click();
  const secretAccess = await companion.evaluate(() =>
    window.keycritter.getAIStatus().then(
      () => 'allowed',
      () => 'denied',
    ),
  );
  expect(secretAccess).toBe('denied');
  await designer.getByRole('button', { name: 'Create with AI', exact: true }).click();
  await designer
    .getByLabel('OpenAI API key', { exact: true })
    .fill('sk-test-only-not-a-real-credential');
  await designer.getByRole('button', { name: 'Save API key', exact: true }).click();
  const aiStatus = await designer.evaluate(() => window.keycritter.getAIStatus());
  expect(aiStatus.configured).toBe(true);
  expect(aiStatus.remembered).toBe(false);
  expect(JSON.stringify(aiStatus)).not.toContain('sk-test-only');
  expect(await designer.evaluate(() => JSON.stringify(localStorage))).not.toContain('sk-test-only');
  // Exercise the full IPC/generation/preview path without a paid provider request.
  await desktop.evaluate(({ net }, png) => {
    net.fetch = async (url, options) => {
      if (url !== 'https://api.openai.com/v1/images/edits' || !(options.body instanceof FormData))
        throw new Error('Unexpected AI request');
      return Response.json({ data: [{ b64_json: png }] });
    };
  }, customImage.split(',')[1]);
  await designer
    .getByLabel('Describe your buddy')
    .fill('The same little companion looking surprised');
  await designer.getByLabel('Generate image for pose').selectOption('surprise');
  await designer.getByRole('button', { name: 'Generate image', exact: true }).click();
  await expect(designer.getByAltText('Generated pet preview')).toBeVisible();
  await designer.getByRole('button', { name: 'Use this image', exact: true }).click();
  await expect
    .poll(() =>
      companion.evaluate(() =>
        window.keycritter.getState().then((s) => !!s.pet.design.images?.surprise),
      ),
    )
    .toBe(true);
  await designer.getByRole('button', { name: 'Preview Backspace reaction', exact: true }).click();
  await expect(companion.getByTestId('desktop-pet').locator('img')).toHaveAttribute(
    'data-pose',
    'surprise',
  );
  await designer.getByLabel('Generate image for pose').selectOption('idle');
  await designer
    .getByLabel('Describe your buddy')
    .fill('Same character with closed eyes; keep the body and placement unchanged.');
  await designer.getByRole('button', { name: 'Generate image', exact: true }).click();
  await designer.getByRole('button', { name: 'Add as animation frame' }).click();
  await expect
    .poll(() =>
      companion.evaluate(() =>
        window.keycritter.getState().then((s) => s.pet.design.animations.idle.frames.length),
      ),
    )
    .toBe(3);
  const movement = designer.getByRole('slider', { name: 'Movement strength' });
  await movement.focus();
  await movement.press('Home');
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-motion-strength', '0');
  await expect(companion.getByTestId('desktop-pet')).toHaveCSS('animation-name', 'none');
  for (let n = 0; n < 5; n++) await movement.press('ArrowRight');
  await expect(companion.getByTestId('desktop-pet')).toHaveAttribute('data-motion-strength', '25');
  await designer.locator('.ai-connection > summary').click();
  await designer.getByRole('button', { name: 'Disconnect and remove key' }).click();
  await expect
    .poll(() => designer.evaluate(() => window.keycritter.getAIStatus().then((s) => s.configured)))
    .toBe(false);
  await designer.getByRole('button', { name: 'Upload', exact: true }).click();
  await designer.getByRole('button', { name: 'Save pet', exact: true }).click();
  await designer.screenshot({ path: '/tmp/keycritter-desktop-designer.png', fullPage: true });
  await companion.screenshot({ path: '/tmp/keycritter-floating-pet.png', omitBackground: true });
  const settings = JSON.parse(await readFile(join(profile, 'pet-settings.json'), 'utf8'));
  expect(settings.pet.design.name).toBe('Desktop Mochi');
  expect(settings.pet.design.species).toBe('custom');
  expect(settings.pet.design.images.cheer).toMatch(/^data:image\/webp;base64,/);
  expect(settings.pet.design.animations.idle.frames).toHaveLength(3);
  expect(settings.pet.design.motionStrength).toBe(25);
  expect(settings.pet.design.animations.idle.frames[0].duration).toBe(1000);
  expect(Object.keys(settings).sort()).toEqual(['pet', 'pinned', 'version']);
  expect(JSON.stringify(settings)).not.toContain('typedText');
  expect(errors).toEqual([]);
  await designer.getByRole('button', { name: 'Enable keyboard reactions', exact: true }).click();
  await expect(designer.getByText('Reactions on', { exact: true })).toBeVisible();
  await designer.getByRole('button', { name: 'Pin pet above apps', exact: true }).click();
  await expect(
    designer.getByRole('button', { name: 'Pin pet above apps', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await desktop.close();
  desktop = undefined;
  const restart = await electron.launch({
    args: [appPath, '--no-sandbox', '--disable-gpu', `--profile=${profile}`],
    cwd: resolve('.'),
    timeout: 30000,
  });
  desktop = restart;
  await expect.poll(() => desktop.windows().length).toBe(2);
  const restored = desktop.windows().find((w) => !w.url().includes('#companion'));
  await expect(restored.getByRole('heading', { name: 'Meet Desktop Mochi' })).toBeVisible();
  await expect(restored.getByText('Reactions paused', { exact: true })).toBeVisible();
  await expect(
    restored.getByRole('button', { name: 'Pin pet above apps', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await restored.getByRole('button', { name: 'Pin pet above apps', exact: true }).click();
  await expect(restored.getByTestId('active-pet')).toHaveAttribute('data-species', 'custom');
  const restoredCompanion = desktop.windows().find((w) => w.url().includes('#companion'));
  await expect(restored.getByRole('slider', { name: 'Movement strength' })).toHaveValue('25');
  await expect(restoredCompanion.getByTestId('desktop-pet')).toHaveAttribute(
    'data-motion-strength',
    '25',
  );
  await expect(restoredCompanion.getByTestId('desktop-pet').locator('img')).toHaveAttribute(
    'data-animated',
    'true',
  );
  await restored.getByLabel('Name', { exact: true }).fill('Restored buddy');
  await restored.getByRole('button', { name: 'Save pet', exact: true }).click();
  await restored.getByRole('button', { name: /My Pets/ }).click();
  await expect(restored.getByRole('article')).toHaveCount(1);
  await expect(
    restored.getByRole('heading', { name: 'Restored buddy', exact: true }),
  ).toBeVisible();
  console.log(
    'PASS: always-on-top pet; real global keyboard input; custom images and poses; frame animations continue through typing and restart; mock AI generation and preview via native IPC; session-key handling; companion secret access denied; saved settings; restart; no renderer errors.',
  );
} finally {
  await desktop?.close();
  await rm(profile, { recursive: true, force: true });
}
