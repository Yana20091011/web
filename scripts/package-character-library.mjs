// Keep catalog metadata small; load thumbnails and full pose batches separately.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = 'src/assets/character-library/';
const characters = JSON.parse(await readFile(root + 'characters.json', 'utf8'));
const manifest = JSON.parse(await readFile(root + 'sheets/manifest.json', 'utf8'));
await mkdir(root + 'batches', { recursive: true });
await mkdir(root + 'portraits', { recursive: true });
const counts = [1, ...manifest.map((sheet) => sheet.characters.length)];
if (counts.reduce((a, b) => a + b, 0) !== characters.length)
  throw new Error('Catalog and atlas roster do not match.');
const entries = [];
let offset = 0;
for (let batch = 0; batch < counts.length; batch++) {
  const key = `pets-${String(batch).padStart(2, '0')}`;
  const group = characters.slice(offset, offset + counts[batch]);
  offset += counts[batch];
  await writeFile(`${root}batches/${key}.json`, JSON.stringify(group));
  for (const character of group) {
    const { id, name, series, category } = character;
    if (!/^[a-z0-9().-]+$/.test(id)) throw new Error(`Unsafe asset name: ${id}`);
    entries.push({ id, name, series, category, batch: key });
    const image = character.poses.idle.match(/^data:image\/webp;base64,(.+)$/);
    if (!image) throw new Error(`Missing WebP portrait: ${id}`);
    await writeFile(`${root}portraits/${id}.webp`, Buffer.from(image[1], 'base64'));
  }
}
const candidates = [
  'laptop-buddy',
  'ichigo',
  'sailor-mercury',
  'natsu',
  'geralt',
  '2b',
  'phoenix-wright',
  'ratchet',
];
const featured = [
  ...new Set([
    ...candidates.filter((id) => entries.some((entry) => entry.id === id)),
    ...entries.slice(-7).map((entry) => entry.id),
  ]),
].slice(0, 8);
await writeFile(root + 'catalog.json', JSON.stringify({ featured, entries }));
console.log(`Packaged ${entries.length} pets in ${counts.length} independently loaded batches.`);
