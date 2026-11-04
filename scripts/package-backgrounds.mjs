// Convert the checked-in background paintings into portable WebP assets.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const root = 'src/assets/backgrounds/';
const manifest = JSON.parse(await readFile(root + 'sources/manifest.json', 'utf8'));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  for (const { id, file } of [
    { id: 'cozy-room', file: 'public/cozy-room.png' },
    ...manifest.map(({ id }) => ({ id, file: root + 'sources/' + id + '.png' })),
  ]) {
    const src = 'data:image/png;base64,' + (await readFile(file)).toString('base64');
    const result = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(1440, image.naturalWidth);
      canvas.height = Math.round((canvas.width * image.naturalHeight) / image.naturalWidth);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', 0.9);
    }, src);
    await writeFile(root + id + '.webp', Buffer.from(result.split(',')[1], 'base64'));
  }
  console.log(
    `Packaged ${manifest.length + 1} illustrated backgrounds, including the original cozy room.`,
  );
} finally {
  await browser.close();
}
