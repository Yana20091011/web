import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const executable =
  process.env.KEYCRITTER_SMOKE_EXECUTABLE || resolve(`release/KeyCritter-Windows-${version}.exe`);
const prefix = process.env.KEYCRITTER_SMOKE_APP ? [process.env.KEYCRITTER_SMOKE_APP] : [];
const profile = await mkdtemp(join(tmpdir(), 'keycritter-portable-check-'));
const server = createServer();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const child = spawn(
  executable,
  [
    ...prefix,
    '--no-sandbox',
    '--disable-gpu',
    `--profile=${profile}`,
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
  ],
  { stdio: 'ignore', windowsHide: false },
);
let browser;
let foregroundBrowser;
let lastWindowLayer;
let launchError;
child.on('error', (error) => {
  launchError = error;
});
try {
  const deadline = Date.now() + 90000;
  while (!browser && Date.now() < deadline) {
    if (launchError) throw launchError;
    if (child.exitCode !== null)
      throw new Error(`Portable launcher exited before the app opened: ${child.exitCode}`);
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1500 });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  if (!browser)
    throw new Error('The packaged app did not expose its test browser within 90 seconds.');
  await expect
    .poll(
      () =>
        browser
          .contexts()
          .flatMap((c) => c.pages())
          .filter((p) => p.url().startsWith('keycritter://app/') && !p.url().includes('#companion'))
          .length,
      { timeout: 20000 },
    )
    .toBe(1);
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().startsWith('keycritter://app/') && !p.url().includes('#companion'));
  await expect(page.getByTestId('app-version')).toHaveText(`v${version}`);
  const state = await page.evaluate(() => window.keycritter.getState());
  expect(state.version).toBe(version);
  expect(state.listening).toBe(false);
  expect(state.pinned).toBe(true);
  await expect(page.getByRole('button', { name: 'Upload', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create with AI', exact: true })).toBeVisible();
  // Import a self-contained website pet and verify native synchronization and export.
  const originalPet = state.pet;
  const characters = JSON.parse(
    await readFile('src/assets/character-library/characters.json', 'utf8'),
  );
  const sprite = characters.find((character) => character.id === 'naruto');
  const libraryPreview = page.getByTestId('character-library-preview');
  await libraryPreview.scrollIntoViewIfNeeded();
  await expect(libraryPreview.locator('.character-card')).toHaveCount(8);
  await expect(
    libraryPreview.getByRole('button', {
      name: `Browse all ${characters.length} pets`,
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      libraryPreview
        .locator('img')
        .evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
    )
    .toBe(true);

  await libraryPreview
    .getByRole('button', { name: `Browse all ${characters.length} pets`, exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Filter by franchise' }).selectOption('Naruto');
  await page.getByRole('combobox', { name: 'Filter by series' }).selectOption('Boruto');
  await expect(page.locator('.character-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Choose Boruto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Boruto' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(async () => (await window.keycritter.getState()).pet.design.name))
    .toBe('Boruto');
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await page
    .getByRole('button', { name: 'Use Leaf village rooftop background', exact: true })
    .click();
  await expect(page.getByTestId('room-background')).toHaveAttribute(
    'data-background-id',
    'leaf-village',
  );
  const backgroundDecoded = await page.getByTestId('room-background').evaluate(async (element) => {
    const source = getComputedStyle(element)
      .backgroundImage.slice(4, -1)
      .replace(/^["']|["']$/g, '');
    const image = new Image();
    image.src = source;
    await image.decode();
    return image.naturalWidth >= 900;
  });
  expect(backgroundDecoded).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => (await window.keycritter.getState()).pet.design.backgroundId),
    )
    .toBe('leaf-village');
  await libraryPreview
    .getByRole('button', { name: `Browse all ${characters.length} pets`, exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Filter by franchise' }).selectOption('Spiritfarer');
  await expect(page.locator('.character-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Choose Stella', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Stella' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(async () => (await window.keycritter.getState()).pet.design.name))
    .toBe('Stella');
  await libraryPreview.getByRole('button', { name: 'Choose Ichigo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meet Ichigo' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(async () => (await window.keycritter.getState()).pet.design.name))
    .toBe('Ichigo');
  const transferPet = {
    design: {
      ...originalPet.design,
      name: 'Portable transfer',
      backgroundId: 'leaf-village',
      libraryCharacterId: sprite.id,
      species: 'custom',
      accessory: 'none',
      motionStrength: 25,
      images: { idle: sprite.poses.idle, cheer: sprite.poses.happy },
      typingImage: sprite.poses.typing,
      animations: {
        idle: {
          enabled: true,
          loop: true,
          pauseMs: 3000,
          frames: [
            { id: 'open', image: sprite.poses.idle, duration: 180 },
            { id: 'closed', image: sprite.poses.blinking, duration: 120 },
          ],
        },
      },
    },
    reactions: originalPet.reactions,
  };
  const transferFile = JSON.stringify({ format: 'keycritter-pet', version: 1, pet: transferPet });
  await page.getByLabel('Import pet file').setInputFiles({
    name: 'portable-transfer.keycritter.json',
    mimeType: 'application/json',
    buffer: Buffer.from(transferFile),
  });
  await expect(page.getByRole('heading', { name: 'Meet Portable transfer' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(async () => (await window.keycritter.getState()).pet))
    .toEqual(transferPet);
  await expect
    .poll(
      async () => {
        try {
          return JSON.parse(await readFile(join(profile, 'pet-settings.json'), 'utf8')).pet;
        } catch (error) {
          // The first save is debounced; wait for an actual complete settings file.
          if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
          throw error;
        }
      },
      { timeout: 10000 },
    )
    .toEqual(transferPet);
  const transferredCompanion = browser
    .contexts()
    .flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes('#companion'));
  await expect(transferredCompanion.getByTestId('desktop-pet').locator('img')).toHaveAttribute(
    'data-animated',
    'true',
  );
  const exportDirectory = join(profile, 'export-check');
  await mkdir(exportDirectory, { recursive: true });
  const downloadControl = await browser.newBrowserCDPSession();
  await downloadControl.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: exportDirectory,
  });
  await page.getByRole('button', { name: 'Export pet', exact: true }).click();
  const exportedFile = join(exportDirectory, 'Portable-transfer.keycritter.json');
  await expect
    .poll(async () => {
      try {
        return JSON.parse(await readFile(exportedFile, 'utf8')).pet;
      } catch {
        return null;
      }
    })
    .toEqual(transferPet);
  await downloadControl.send('Browser.setDownloadBehavior', { behavior: 'default' });
  await downloadControl.detach();
  // Restore the default pet before the existing native window checks.
  await page.getByLabel('Import pet file').setInputFiles({
    name: 'original.keycritter.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'keycritter-pet', version: 1, pet: originalPet })),
  });
  await expect
    .poll(() => page.evaluate(async () => (await window.keycritter.getState()).pet))
    .toEqual(originalPet);
  await mkdir('release', { recursive: true });
  await page.screenshot({ path: 'release/verified-ui.png', fullPage: true });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Upload main pet image' })).toBeVisible();
  await page.getByRole('button', { name: 'Create with AI', exact: true }).click();
  await expect(page.getByLabel('Describe your buddy')).toBeVisible();
  await expect(page.getByLabel('OpenAI API key', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'release/verified-ai-ui.png', fullPage: true });
  await page.getByRole('button', { name: 'Animate', exact: true }).click();
  const blinkFrames = await page.evaluate(() =>
    [0, 1, 2].map((blink) => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#b5dbb3';
      ctx.fillRect(16, 20, 64, 64);
      ctx.fillStyle = '#40374d';
      ctx.fillRect(30, 46, 7, blink === 0 ? 9 : blink === 1 ? 5 : 2);
      ctx.fillRect(59, 46, 7, blink === 0 ? 9 : blink === 1 ? 5 : 2);
      ctx.fillRect(43, 64, 10, 3);
      return canvas.toDataURL('image/png');
    }),
  );
  await page.getByLabel('Animation frame files').setInputFiles(
    blinkFrames.map((image, n) => ({
      name: `blink-${n}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from(image.split(',')[1], 'base64'),
    })),
  );
  await expect(page.locator('.animation-frame')).toHaveCount(3);
  const companion = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().includes('#companion'));
  const petImage = companion.getByTestId('desktop-pet').locator('img');
  await expect(petImage).toHaveAttribute('data-animated', 'true');
  await expect
    .poll(() => petImage.getAttribute('data-frame-index'), { intervals: [20], timeout: 12000 })
    .toBe('2');
  const animationState = await page.evaluate(() => window.keycritter.getState());
  expect(animationState.pet.design.animations.idle.frames).toHaveLength(3);
  await page.getByRole('button', { name: 'Use laptop buddy', exact: true }).click();
  await expect(page.locator('.animation-frame')).toHaveCount(4);
  await expect(page.getByLabel('Frame 3 duration in milliseconds')).toHaveValue('400');
  await expect
    .poll(async () => {
      const next = await page.evaluate(() => window.keycritter.getState());
      return next.pet.design.animations.idle.frames.length;
    })
    .toBe(4);
  await expect
    .poll(() => petImage.getAttribute('data-frame-index'), { intervals: [20], timeout: 12000 })
    .toBe('2');
  const movement = page.getByRole('slider', { name: 'Movement strength' });
  await movement.focus();
  await movement.press('Home');
  const pet = companion.getByTestId('desktop-pet');
  await expect(pet).toHaveAttribute('data-motion-strength', '0');
  await page.evaluate(() =>
    window.keycritter.preview({ action: 'cheer', phrase: 'Still, but blinking!' }),
  );
  await expect(pet).toHaveAttribute('data-action', 'cheer');
  await expect(pet).toHaveCSS('animation-name', 'none');
  await expect(pet).toHaveCSS('transform', 'none');
  await expect(petImage).toHaveAttribute('data-animated', 'true');
  const presetState = await page.evaluate(() => window.keycritter.getState());
  await expect(petImage).toHaveAttribute(
    'src',
    presetState.pet.design.animations.idle.frames[2].image,
    { timeout: 12000 },
  );
  await movement.focus();
  for (let n = 0; n < 5; n++) await movement.press('ArrowRight');
  await expect(pet).toHaveAttribute('data-motion-strength', '25');
  await page.evaluate(() =>
    window.keycritter.preview({ action: 'cheer', phrase: 'Gentle movement!' }),
  );
  await expect(pet).toHaveAttribute('data-action', 'cheer');
  const gentleOffset = await pet.evaluate((node) => {
    const animation = node.getAnimations()[0];
    animation.pause();
    animation.currentTime = 250;
    return new DOMMatrix(getComputedStyle(node).transform).m42;
  });
  expect(gentleOffset).toBeCloseTo(-3.25, 1);
  await expect
    .poll(
      async () =>
        JSON.parse(await readFile(join(profile, 'pet-settings.json'), 'utf8')).pet.design
          .motionStrength,
    )
    .toBe(25);
  await page.screenshot({ path: 'release/verified-animation-ui.png', fullPage: true });
  let windowLayer = { tested: false };
  let position = { tested: false };
  if (process.platform === 'win32') {
    const pinInfo = await page.evaluate(() => window.keycritter.getPinInfo());
    expect(pinInfo.visible).toBe(true);
    const drag = await companion.locator('.companion-drag').boundingBox();
    const nativePosition = (cursor, button) =>
      JSON.parse(
        execFileSync(
          'pwsh',
          [
            '-NoLogo',
            '-NoProfile',
            '-File',
            resolve('tests/windows-position-check.ps1'),
            '-PetHandle',
            pinInfo.nativeHandle,
            ...(cursor ? ['-CursorX', String(cursor.x), '-CursorY', String(cursor.y)] : []),
            ...(button ? ['-Button', button] : []),
          ],
          { encoding: 'utf8' },
        ).trim(),
      );
    const beforeDrag = nativePosition();
    const viewport = await companion.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    const scale = { x: beforeDrag.width / viewport.width, y: beforeDrag.height / viewport.height };
    const grab = {
      x: Math.round(beforeDrag.x + (drag.x + drag.width / 2) * scale.x),
      y: Math.round(beforeDrag.y + (drag.y + drag.height / 2) * scale.y),
    };
    const setCursor = (point) => {
      const result = nativePosition(point);
      expect(result.hasCursor, `Cursor result: ${JSON.stringify(result)}`).toBe(true);
      expect({ x: result.cursorX, y: result.cursorY }).toEqual(point);
    };
    setCursor(grab);
    await companion.mouse.move(drag.x + drag.width / 2, drag.y + drag.height / 2);
    await companion.mouse.down();
    await companion.waitForTimeout(100);
    let heldPosition;
    try {
      const pressed = nativePosition(undefined, 'Down');
      expect(pressed.leftPressed, `Mouse-button result: ${JSON.stringify(pressed)}`).toBe(true);
      for (const [dx, dy] of [
        [40, 0],
        [80, 20],
        [-80, -40],
      ]) {
        setCursor({ x: Math.round(grab.x + dx * scale.x), y: Math.round(grab.y + dy * scale.y) });
        await expect
          .poll(
            () => {
              const current = nativePosition();
              return (
                Math.abs(current.x - beforeDrag.x - dx * scale.x) <= 2 &&
                Math.abs(current.y - beforeDrag.y - dy * scale.y) <= 2
              );
            },
            {
              message: 'The native window must follow OS cursor movement one to one',
              timeout: 10000,
            },
          )
          .toBe(true);
      }
      const stationary = nativePosition();
      await companion.locator('.companion-drag').dispatchEvent('pointermove', {
        screenX: -5000,
        screenY: 5000,
        pointerId: 1,
        isPrimary: true,
        buttons: 1,
      });
      await companion.waitForTimeout(120);
      expect({ x: nativePosition().x, y: nativePosition().y }).toEqual({
        x: stationary.x,
        y: stationary.y,
      });
      const sprite = await companion.locator('.companion-sprite').boundingBox();
      const targetY = (12 - sprite.y) * scale.y;
      setCursor({
        x: Math.round(grab.x - 80 * scale.x),
        y: Math.round(grab.y + targetY - beforeDrag.y),
      });
      await expect
        .poll(() => Math.abs(nativePosition().y - targetY) <= 2, {
          message: 'Transparent top padding must not block placement near the screen top',
        })
        .toBe(true);
      heldPosition = nativePosition();
    } finally {
      nativePosition(undefined, 'Up');
      await companion.mouse.up();
    }
    const placed = () => {
      const current = nativePosition();
      return { x: current.x, y: current.y };
    };
    await expect.poll(placed).toEqual({ x: heldPosition.x, y: heldPosition.y });
    setCursor({ x: heldPosition.cursorX - 20, y: heldPosition.cursorY + 20 });
    await companion.waitForTimeout(120);
    expect(placed()).toEqual({ x: heldPosition.x, y: heldPosition.y });
    await expect
      .poll(async () => {
        const settings = JSON.parse(await readFile(join(profile, 'pet-settings.json'), 'utf8'));
        return Number.isFinite(settings.position?.x) && Number.isFinite(settings.position?.y);
      })
      .toBe(true);
    position = {
      tested: true,
      nativeNameBarDrag: true,
      osCursorTracking: true,
      noStationaryDrift: true,
      edgePlacement: true,
      positionSaved: true,
    };
    foregroundBrowser = await chromium.launch({
      channel: 'msedge',
      headless: false,
      args: ['--start-maximized', '--no-first-run'],
    });
    const context = await foregroundBrowser.newContext({ viewport: null });
    const tabA = await context.newPage();
    await tabA.setContent('<title>KeyCritter overlay browser test A</title><h1>Browser tab A</h1>');
    const cdp = await context.newCDPSession(tabA);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
    const tabB = await context.newPage();
    await tabB.setContent('<title>KeyCritter overlay browser test B</title><h1>Browser tab B</h1>');
    const layer = (demote = false) => {
      const value = JSON.parse(
        execFileSync(
          'pwsh',
          [
            '-NoLogo',
            '-NoProfile',
            '-File',
            resolve('tests/windows-layer-check.ps1'),
            '-PetHandle',
            pinInfo.nativeHandle,
            '-BrowserTitle',
            'KeyCritter overlay browser test',
            ...(demote ? ['-Demote'] : []),
          ],
          { encoding: 'utf8' },
        ).trim(),
      );
      lastWindowLayer = value;
      return value;
    };
    const isPinnedAboveBrowser = () => {
      const value = layer();
      return (
        value.petFound &&
        value.browserFound &&
        value.petVisible &&
        value.petTopmost &&
        value.petAboveBrowser &&
        value.browserHasFocus &&
        value.overlapsBrowser
      );
    };
    for (const tab of [tabA, tabB, tabA, tabB]) {
      await tab.bringToFront();
      await expect.poll(isPinnedAboveBrowser, { timeout: 12000 }).toBe(true);
    }
    expect(layer(true).demoted).toBe(true);
    await expect.poll(isPinnedAboveBrowser, { timeout: 12000 }).toBe(true);
    await page.getByRole('button', { name: 'Pin pet above apps', exact: true }).click();
    await tabA.bringToFront();
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(layer().petTopmost).toBe(false);
    await page.getByRole('button', { name: 'Pin pet above apps', exact: true }).click();
    await tabB.bringToFront();
    await expect.poll(isPinnedAboveBrowser, { timeout: 12000 }).toBe(true);
    windowLayer = {
      tested: true,
      aboveBrowserTabs: true,
      recoveredAfterNativeDemotion: true,
      browserKeptFocus: true,
      unpinRespected: true,
    };
    await foregroundBrowser.close();
    foregroundBrowser = undefined;
  }
  await writeFile(
    'release/package-verification.json',
    JSON.stringify(
      {
        version,
        runtimeVersion: state.version,
        rendererVersion: `v${version}`,
        portableExecutable: prefix.length === 0,
        windowLayer,
        position,
        movement: { stillModeKeepsFrames: true, gentleAmplitudeVerified: true, savedStrength: 25 },
        uploadVisible: true,
        aiVisible: true,
        animations: { uploadedFrames: 3, readyMadeFrames: 4, nativePlaybackVerified: true },
        verifiedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await page.evaluate(() => window.keycritter.quit()).catch(() => {});
  const exited = await Promise.race([
    new Promise((resolve) => {
      if (child.exitCode !== null) resolve(true);
      else child.once('exit', () => resolve(true));
    }),
    new Promise((resolve) => setTimeout(() => resolve(false), 15000)),
  ]);
  if (!exited) throw new Error('The packaged app did not quit normally.');
  expect(child.exitCode).toBe(0);
  console.log(
    `PASS: ${prefix.length ? 'local runtime' : 'actual portable executable'} v${version} launched; native/renderer versions match; pet import/export, Upload, AI, and frame animation work; screenshots and verification report saved.`,
  );
} catch (error) {
  const detail =
    `${error.stack || error.message}\nWindow layer: ${JSON.stringify(lastWindowLayer || null)}`
      .replace(/\u001b\[[0-9;]*m/g, '')
      .slice(0, 10000)
      .replace(/%/g, '%25')
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A');
  console.error(`::error title=Packaged pet verification::${detail}`);
  throw error;
} finally {
  await foregroundBrowser?.close().catch(() => {});
  await browser?.close().catch(() => {});
  if (child.exitCode === null && child.pid) {
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {}
    } else child.kill('SIGTERM');
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
