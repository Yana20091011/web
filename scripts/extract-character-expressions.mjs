// Extract six body poses from the reference-guided atlases; never duplicate the
// large base catalog. The committed expression chunks can be repackaged alone.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = 'src/assets/character-library/expressions/';
const baseManifest = JSON.parse(await readFile(root + 'manifest.json', 'utf8'));
const confident = process.argv.includes('--confident');
const manifest = confident
  ? JSON.parse(await readFile(root + 'confident-manifest.json', 'utf8'))
  : baseManifest;
const owners = new Map(
  baseManifest.sheets.flatMap((sheet) => sheet.ids.map((id) => [id, sheet.key])),
);
const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Pass the directory containing the source pose atlases.');
const partial = process.argv.includes('--partial');
const only = new Set(
  process.argv.slice(3).filter((value) => !['--partial', '--confident'].includes(value)),
);
await mkdir(root + 'data', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const failures = [];
try {
  const page = await browser.newPage();
  for (const sheet of manifest.sheets) {
    if (only.size && !only.has(sheet.key)) continue;
    try {
      const src =
        'data:image/png;base64,' +
        (await readFile(resolve(sourceDirectory, sheet.file))).toString('base64');
      const rows = await page.evaluate(
        async ({ src, count }) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const source = document.createElement('canvas');
          source.width = image.naturalWidth;
          source.height = image.naturalHeight;
          const ctx = source.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(image, 0, 0);
          const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
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
            throw Error(`Expected ${count} separated rows, found ${bands.length}`);
          const width = source.width / 6;
          return bands.map(([top, bottom], row) => {
            const safeTop = Math.max(row ? Math.floor((bands[row - 1][1] + top) / 2) : 0, top - 3);
            const safeBottom = Math.min(
              row < count - 1 ? Math.floor((bottom + bands[row + 1][0]) / 2) : source.height,
              bottom + 3,
            );
            const height = safeBottom - safeTop;
            const scale = Math.min(184 / width, 184 / height);
            return Array.from({ length: 6 }, (_, column) => {
              const canvas = document.createElement('canvas');
              canvas.width = canvas.height = 192;
              const out = canvas.getContext('2d');
              out.imageSmoothingEnabled = false;
              out.drawImage(
                source,
                Math.round(column * width),
                safeTop,
                Math.round((column + 1) * width) - Math.round(column * width),
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
        { src, count: sheet.ids.length },
      );
      const extracted = sheet.ids.map((id, index) => ({
        id,
        ...(confident ? { poseStyle: 'confident' } : {}),
        poses: Object.fromEntries(
          manifest.columns.map((pose, column) => [pose, rows[index][column]]),
        ),
      }));
      const data = sheet.onlyIds
        ? extracted.filter((character) => sheet.onlyIds.includes(character.id))
        : extracted;
      if (confident) {
        for (const owner of new Set(data.map((character) => owners.get(character.id)))) {
          if (!owner) throw new Error('Unknown character in confident pose roster.');
          const path = root + 'data/' + owner + '.json';
          const previous = JSON.parse(await readFile(path, 'utf8'));
          const replacement = new Map(data.map((character) => [character.id, character]));
          await writeFile(
            path,
            JSON.stringify(previous.map((character) => replacement.get(character.id) || character)),
          );
        }
      } else await writeFile(root + 'data/' + sheet.key + '.json', JSON.stringify(data));
      console.log('Extracted', sheet.key, data.length);
    } catch (error) {
      failures.push({ key: sheet.key, error: error.message });
      console.error(sheet.key, error.message);
    }
  }
} finally {
  await browser.close();
}
await writeFile('/tmp/keycritter-expression-failures.json', JSON.stringify(failures, null, 2));
if (failures.length)
  throw Error(`${failures.length} atlases need repair; no package was published.`);
if (partial) process.exit(0);
const base = JSON.parse(await readFile('src/assets/character-library/characters.json', 'utf8'));
const groups = await Promise.all(
  baseManifest.sheets.map(async (sheet) => {
    return JSON.parse(await readFile(root + 'data/' + sheet.key + '.json', 'utf8'));
  }),
);
const all = groups.flat();
if (
  all.length !== base.length ||
  new Set(all.map((c) => c.id)).size !== base.length ||
  base.some((c) => !all.some((extra) => extra.id === c.id))
)
  throw Error('Every library character must have exactly one expression set.');
for (const character of all)
  if (
    manifest.columns.some((pose) => !character.poses[pose]) ||
    new Set(Object.values(character.poses)).size !== 6
  )
    throw Error(`Invalid or duplicated expression set: ${character.id}`);
console.log(`Validated six new expressions for all ${all.length} characters.`);
if (confident) {
  const expected = new Set(manifest.sheets.flatMap((sheet) => sheet.ids));
  if (all.some((character) => expected.has(character.id) !== (character.poseStyle === 'confident')))
    throw new Error('The confident profile does not match the requested character roster.');
  console.log(`Validated confident pose variants for ${expected.size} characters.`);
}
await import('./package-character-library.mjs');
