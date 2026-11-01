import { _electron as electron, expect } from '@playwright/test';
import electronPath from 'electron';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'keycritter-second-instance-'));
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const xdotool = process.env.XDOTOOL_PATH || 'xdotool';
let primary, secondary;
try {
  primary = await electron.launch({
    args: ['.', '--no-sandbox', '--disable-gpu', `--profile=${profile}`],
    cwd: resolve('.'),
  });
  await expect.poll(() => primary.windows().length).toBe(2);
  const page = primary.windows().find((p) => !p.url().includes('#companion'));
  await page.getByLabel('Name', { exact: true }).fill('Keep my saved pet');
  await expect
    .poll(async () => {
      try {
        return JSON.parse(await readFile(join(profile, 'pet-settings.json'), 'utf8')).pet.design
          .name;
      } catch {
        return '';
      }
    })
    .toBe('Keep my saved pet');
  secondary = spawn(electronPath, ['.', '--no-sandbox', '--disable-gpu', `--profile=${profile}`], {
    cwd: resolve('.'),
    stdio: 'ignore',
  });
  let dialog;
  await expect
    .poll(
      () => {
        try {
          dialog = execFileSync(
            xdotool,
            ['search', '--name', `KeyCritter v${version} did not start`],
            { encoding: 'utf8' },
          )
            .trim()
            .split('\n')[0];
          return !!dialog;
        } catch {
          return false;
        }
      },
      { timeout: 15000 },
    )
    .toBe(true);
  execFileSync(xdotool, ['windowfocus', '--sync', dialog]);
  execFileSync(xdotool, ['key', 'Return']);
  await expect.poll(() => secondary.exitCode).toBe(0);
  expect(
    JSON.parse(await readFile(join(profile, 'pet-settings.json'), 'utf8')).pet.design.name,
  ).toBe('Keep my saved pet');
  expect((await page.evaluate(() => window.keycritter.getState())).pet.design.name).toBe(
    'Keep my saved pet',
  );
  console.log(
    'PASS: second launch shows an explicit versioned message, exits, and preserves the running app and saved pet.',
  );
} finally {
  if (secondary && secondary.exitCode === null) secondary.kill('SIGTERM');
  await primary?.close();
  await rm(profile, { recursive: true, force: true });
}
