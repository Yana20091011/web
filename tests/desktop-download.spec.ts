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
