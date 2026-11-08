import { test, expect } from '@playwright/test';

const executable =
  'https://github.com/Yana20091011/web/releases/latest/download/KeyCritter-Windows.exe';

test('offers a direct public Windows download and usable instructions on both tabs', async ({
  page,
}) => {
  await page.goto('/');
  const section = page.getByRole('region', { name: 'A little company, on your desktop.' });
  const download = section.getByRole('link', { name: 'Download for Windows', exact: true });
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute('href', executable);
  await expect(section.getByText('Windows 10/11 · 64-bit · No account needed')).toBeVisible();
  await section.getByText('How to use the desktop pet').click();
  await expect(section.getByText('No installer is needed.', { exact: false })).toBeVisible();
  await expect(section.getByText('Enable keyboard reactions', { exact: true })).toBeVisible();
  await expect(section.getByText('The app is unsigned', { exact: false })).toBeVisible();
  const releases = section.getByRole('link', {
    name: 'Release notes, ZIP download, and checksums',
  });
  await expect(releases).toHaveAttribute(
    'href',
    'https://github.com/Yana20091011/web/releases/latest',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // Verify clicking the button initiates a file download, without a sign-in page.
  await page.route(executable, (route) =>
    route.fulfill({
      contentType: 'application/octet-stream',
      headers: { 'Content-Disposition': 'attachment; filename="KeyCritter-Windows.exe"' },
      body: 'download fixture',
    }),
  );
  const pending = page.waitForEvent('download');
  await download.click();
  expect((await pending).suggestedFilename()).toBe('KeyCritter-Windows.exe');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(download).toBeVisible();
});

test('takes the latest website pet and uploaded background to a fresh app through the visible download handoff', async ({
  page,
  browser,
}) => {
  const { readFile } = await import('node:fs/promises');
  await page.goto('/');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await page.getByRole('button', { name: 'Choose Naruto', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Desktop friend');
  await page.getByRole('button', { name: 'Change background', exact: true }).click();
  await page.getByLabel('Upload background image').setInputFiles('public/cozy-room.png');
  await expect(page.getByTestId('room-background')).toHaveAttribute('data-background-id', 'custom');
  const expected = await page.evaluate(() => JSON.parse(localStorage.getItem('keycritter-draft')!));
  // No Save pet action: the handoff must include current, unsaved edits too.
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save my pet for desktop', exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe('Desktop-friend.keycritter.json');
  const contents = await readFile((await file.path())!, 'utf8');
  expect(JSON.parse(contents).pet).toEqual({
    design: expected.design,
    reactions: expected.reactions,
  });
  await expect(page.getByRole('status').filter({ hasText: 'Pet file ready.' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Changed again');
  await expect(page.getByRole('status').filter({ hasText: 'Save a new pet file' })).toBeVisible();
  const context = await browser.newContext();
  try {
    const destination = await context.newPage();
    await destination.goto(page.url());
    await destination.getByLabel('Import pet file').setInputFiles({
      name: file.suggestedFilename(),
      mimeType: 'application/json',
      buffer: Buffer.from(contents),
    });
    await expect(
      destination.getByRole('heading', { name: 'Meet Desktop friend', exact: true }),
    ).toBeVisible();
    await expect(destination.getByTestId('room-background')).toHaveAttribute(
      'data-background-id',
      'custom',
    );
    expect(
      await destination.evaluate(
        () => JSON.parse(localStorage.getItem('keycritter-draft')!).design,
      ),
    ).toEqual(expected.design);
  } finally {
    await context.close();
  }
  await page
    .getByLabel('Import pet file')
    .setInputFiles({
      name: file.suggestedFilename(),
      mimeType: 'application/json',
      buffer: Buffer.from(contents),
    });
  await expect(page.getByRole('status').filter({ hasText: 'Pet file ready.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
