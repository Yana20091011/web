// Extract the generated pixel-art atlases into small, self-contained app sprites.
// Keep the original laptop-buddy artwork as the first pet.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const root = 'src/assets/character-library/';
const manifest = JSON.parse(await readFile(`${root}sheets/manifest.json`, 'utf8'));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  const raster = async (src) =>
    page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 192;
      canvas.getContext('2d').drawImage(image, 0, 0, 192, 192);
      return canvas.toDataURL('image/webp', 0.95);
    }, src);
  const buddy = [];
  for (const file of ['eyes-open', 'eyes-half-closed', 'eyes-closed']) {
    buddy.push(
      await raster(
        'data:image/png;base64,' +
          (await readFile(`src/assets/laptop-buddy/${file}.png`)).toString('base64'),
      ),
    );
  }
  const characters = [
    {
      id: 'laptop-buddy',
      name: 'Laptop buddy',
      series: 'KeyCritter original',
      category: 'Original',
      poses: { idle: buddy[0], blinking: buddy[2], typing: buddy[1], happy: buddy[0] },
      blinkFrames: [buddy[0], buddy[1], buddy[2], buddy[1]],
    },
  ];
  for (const sheet of manifest) {
    const src =
      'data:image/png;base64,' + (await readFile(root + 'sheets/' + sheet.file)).toString('base64');
    const rows = await page.evaluate(
      async ({ src, count }) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const source = document.createElement('canvas');
        source.width = image.width;
        source.height = image.height;
        const ctx = source.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
        // Find real transparent gutters rather than assuming generated row spacing is exact.
        const bands = [];
        let start = -1;
        for (let y = 0; y < source.height; y++) {
          let visible = 0;
          for (let x = 0; x < source.width; x++)
            if (pixels[(y * source.width + x) * 4 + 3] > 64) visible++;
          if (visible > 5 && start === -1) start = y;
          if ((visible <= 5 || y === source.height - 1) && start !== -1) {
            if (y - start > 5) bands.push([start, y]);
            start = -1;
          }
        }
        if (bands.length !== count)
          throw new Error(`Expected ${count} sprite rows, found ${bands.length}`);
        const width = source.width / 4;
        return bands.map(([top, bottom], row) => {
          // Use one transform for the whole row to keep the laptop stable between poses.
          const safeTop = Math.max(row ? Math.floor((bands[row - 1][1] + top) / 2) : 0, top - 3);
          const safeBottom = Math.min(
            row < count - 1 ? Math.floor((bottom + bands[row + 1][0]) / 2) : source.height,
            bottom + 3,
          );
          const height = safeBottom - safeTop;
          const scale = Math.min(184 / width, 184 / height);
          return Array.from({ length: 4 }, (_, col) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 192;
            const target = canvas.getContext('2d');
            target.imageSmoothingQuality = 'high';
            target.drawImage(
              source,
              Math.round(col * width),
              safeTop,
              Math.round((col + 1) * width) - Math.round(col * width),
              height,
              (192 - width * scale) / 2,
              188 - height * scale,
              width * scale,
              height * scale,
            );
            return canvas.toDataURL('image/webp', 0.95);
          });
        });
      },
      { src, count: sheet.characters.length },
    );
    for (let i = 0; i < rows.length; i++) {
      const [name, series, category] = sheet.characters[i];
      const [idle, blinking, typing, happy] = rows[i];
      characters.push({
        id: name.toLowerCase().replaceAll(' ', '-'),
        name,
        series,
        category,
        poses: { idle, blinking, typing, happy },
      });
    }
  }
  const expected = 1 + manifest.reduce((total, sheet) => total + sheet.characters.length, 0);
  if (characters.length !== expected || new Set(characters.map((c) => c.id)).size !== expected)
    throw new Error(`Expected ${expected} unique characters, got ${characters.length}`);
  await writeFile(root + 'characters.json', JSON.stringify(characters));
  console.log(`Prepared ${characters.length} detailed laptop pets with four embedded poses each.`);
} finally {
  await browser.close();
}
