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
  await mkdir('release', { recursive: true });
  await page.screenshot({ path: 'release/verified-ui.png', fullPage: true });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Upload main pet image' })).toBeVisible();
  await page.getByRole('button', { name: 'Create with AI', exact: true }).click();
  await expect(page.getByLabel('Describe your buddy')).toBeVisible();
  await expect(page.getByLabel('OpenAI API key', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'release/verified-ai-ui.png', fullPage: true });
  let windowLayer = { tested: false };
  if (process.platform === 'win32') {
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
    const layer = (demote = false) =>
      JSON.parse(
        execFileSync(
          'pwsh',
          [
            '-NoLogo',
            '-NoProfile',
            '-File',
            resolve('tests/windows-layer-check.ps1'),
            '-PetTitle',
            `KeyCritter v${version} — Desktop companion`,
            '-BrowserTitle',
            'KeyCritter overlay browser test',
            ...(demote ? ['-Demote'] : []),
          ],
          { encoding: 'utf8' },
        ).trim(),
      );
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
        uploadVisible: true,
        aiVisible: true,
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
    `PASS: ${prefix.length ? 'local runtime' : 'actual portable executable'} v${version} launched; native/renderer versions match; Upload and AI tabs work; screenshots and verification report saved.`,
  );
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
