import { test, expect, type Page } from '@playwright/test';

async function fixture(page: Page, color = '#bc9cdb') {
  const image = await page.evaluate((color) => {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(8, 8, 32, 32);
    return canvas.toDataURL('image/png');
  }, color);
  return {
    name: 'my-pet.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image.split(',')[1], 'base64'),
  };
}

test('uploads a pet, restores it after reload, and keeps it in the collection', async ({
  page,
}) => {
  await page.goto('/');
  const image = await fixture(page);
  await page
    .getByRole('group', { name: 'Pet source' })
    .getByRole('button', { name: 'Upload', exact: true })
    .click();
  await page.getByLabel('Pet image file').setInputFiles(image);
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'custom');
  await expect(page.getByTestId('active-pet').locator('img')).toBeVisible();
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute(
    'src',
    /^data:image\/webp;base64,/,
  );
  await page.getByLabel('Name', { exact: true }).fill('My own buddy');
  await page.getByRole('button', { name: 'Save pet', exact: true }).click();
  await page.reload();
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'custom');
  await page.getByRole('button', { name: /My Pets/ }).click();
  await expect(page.getByRole('heading', { name: 'My own buddy', exact: true })).toBeVisible();
  await expect(page.locator('.saved-pet-scene img')).toBeVisible();
});

test('switches to a reaction image and falls back to the main image for missing poses', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('group', { name: 'Pet source' })
    .getByRole('button', { name: 'Upload', exact: true })
    .click();
  await page.getByLabel('Pet image file').setInputFiles(await fixture(page));
  const main = await page.getByTestId('active-pet').locator('img').getAttribute('src');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload Cheer image', exact: true }).click();
  await (await chooser).setFiles(await fixture(page, '#e6a9b7'));
  await expect(page.getByRole('button', { name: 'Remove Cheer image' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute('data-pose', 'cheer');
  await expect(page.getByTestId('active-pet').locator('img')).not.toHaveAttribute('src', main!);
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Space');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-action', 'jump');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute('src', main!);
  await page.getByRole('button', { name: 'Remove Cheer image' }).click();
  await page.getByRole('textbox', { name: 'Typing playground' }).press('Enter');
  await expect(page.getByTestId('active-pet').locator('img')).toHaveAttribute('data-pose', 'idle');
});

test('rejects unsupported image uploads and keeps the current pet', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('group', { name: 'Pet source' })
    .getByRole('button', { name: 'Upload', exact: true })
    .click();
  await page.getByLabel('Pet image file').setInputFiles({
    name: 'not-an-image.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.getByRole('alert')).toContainText('PNG, JPG, or WebP');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'cat');
  await page
    .getByLabel('Pet image file')
    .setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a png') });
  await expect(page.getByRole('alert')).toContainText('could not be opened');
});

test('browser-only AI controls explain the desktop connection and make no AI request', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('openai.com')) requests.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create with AI', exact: true }).click();
  await page.getByLabel('Describe your buddy').fill('A tiny dragon');
  await expect(
    page.getByText('AI generation is available in the Windows desktop app', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate image', exact: true })).toBeDisabled();
  expect(requests).toEqual([]);
});

async function mockAI(page: Page, fail = false) {
  await page.addInitScript(
    ({ fail }) => {
      const state = {
        pet: {
          design: { name: 'Mochi', species: 'cat', color: '#b5dbb3', size: 100, accessory: 'bow' },
          reactions: [{ id: 'enter', key: 'Enter', action: 'cheer', phrase: 'You got this!' }],
        },
        listening: false,
        starting: false,
        visible: true,
        error: '',
        platform: 'win32',
      };
      let status = { configured: false, remembered: false, canRemember: true };
      const w = window as unknown as { aiRequests: unknown[]; keycritter: unknown };
      w.aiRequests = [];
      w.keycritter = {
        getState: async () => state,
        updatePet: async () => state,
        onState: () => () => {},
        onReaction: () => () => {},
        preview: async () => {},
        cancelGeneration: async () => {},
        getAIStatus: async () => status,
        setAIKey: async (_key: string, remembered: boolean) => {
          status = { configured: true, remembered, canRemember: true };
          return { ok: true, status };
        },
        disconnectAI: async () => {
          status = { configured: false, remembered: false, canRemember: true };
          return { ok: true, status };
        },
        generateImage: async (request: unknown) => {
          w.aiRequests.push(request);
          if (fail)
            return {
              ok: false,
              error:
                'OpenAI has limited this request. Check your API credits, billing, or rate limit, then try again.',
            };
          const canvas = document.createElement('canvas');
          canvas.width = 48;
          canvas.height = 48;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#b2a5de';
          ctx.fillRect(10, 10, 30, 30);
          return { ok: true, image: canvas.toDataURL('image/png') };
        },
      };
    },
    { fail },
  );
}

test('AI preview requires applying the result and keeps the key out of local storage (mock provider)', async ({
  page,
}) => {
  await mockAI(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Create with AI', exact: true }).click();
  await page
    .getByLabel('OpenAI API key', { exact: true })
    .fill('sk-test-only-not-a-real-credential');
  await page.getByRole('button', { name: 'Save API key', exact: true }).click();
  await expect(page.locator('#openai-key')).toHaveCount(0);
  await page.getByLabel('Describe your buddy').fill('A tiny lavender dragon');
  await page.getByRole('button', { name: 'Generate image', exact: true }).click();
  await expect(page.getByAltText('Generated pet preview')).toBeVisible();
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'cat');
  await page.getByRole('button', { name: 'Use this image', exact: true }).click();
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'custom');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('sk-test-only');
  expect(
    await page.evaluate(() => (window as unknown as { aiRequests: unknown[] }).aiRequests),
  ).toEqual([{ prompt: 'A tiny lavender dragon', model: 'gpt-image-1.5', pose: 'idle' }]);
});

test('AI errors preserve the current pet and allow retrying (mock provider)', async ({ page }) => {
  await mockAI(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Create with AI', exact: true }).click();
  await page
    .getByLabel('OpenAI API key', { exact: true })
    .fill('sk-test-only-not-a-real-credential');
  await page.getByRole('button', { name: 'Save API key', exact: true }).click();
  await page.getByLabel('Describe your buddy').fill('A tiny dragon');
  await page.getByRole('button', { name: 'Generate image', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('credits, billing, or rate limit');
  await expect(page.getByTestId('active-pet')).toHaveAttribute('data-species', 'cat');
  await expect(page.getByRole('button', { name: 'Generate image', exact: true })).toBeEnabled();
});
