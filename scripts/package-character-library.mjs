// Keep catalog metadata small; load thumbnails and full pose batches separately.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = 'src/assets/character-library/';
const characters = JSON.parse(await readFile(root + 'characters.json', 'utf8'));
// Expression chunks keep the complete source below GitHub's per-file size limit.
// Old four-pose catalogs remain usable without an expression manifest.
let expressionManifest;
try {
  expressionManifest = JSON.parse(await readFile(root + 'expressions/manifest.json', 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (expressionManifest) {
  const expressions = new Map();
  for (const sheet of expressionManifest.sheets) {
    const group = JSON.parse(
      await readFile(root + 'expressions/data/' + sheet.key + '.json', 'utf8'),
    );
    for (const character of group) {
      if (expressions.has(character.id))
        throw new Error(`Duplicate expression set: ${character.id}`);
      expressions.set(character.id, character);
    }
  }
  if (expressions.size !== characters.length)
    throw new Error('Every character needs an expression set.');
  let confidentRoster;
  try {
    confidentRoster = JSON.parse(
      await readFile(root + 'expressions/confident-manifest.json', 'utf8'),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (confidentRoster) {
    const expected = new Set(confidentRoster.sheets.flatMap((sheet) => sheet.ids));
    for (const [id, entry] of expressions)
      if (expected.has(id) !== (entry.poseStyle === 'confident'))
        throw new Error(
          `Missing or unexpected confident pose profile: ${id}. Re-extract the confident atlases first.`,
        );
  }
  for (const character of characters) {
    const expression = expressions.get(character.id);
    const additional = expression?.poses;
    if (
      !additional ||
      expressionManifest.columns.some((pose) => typeof additional[pose] !== 'string')
    )
      throw new Error(`Missing reference poses: ${character.id}`);
    Object.assign(character.poses, additional);
    character.poseStyle = expression.poseStyle || 'reference';
    if (character.id === 'laptop-buddy') character.poses.happy = additional.wave;
  }
}
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
    entries.push({
      id,
      name,
      series,
      category,
      batch: key,
      poseStyle: character.poseStyle || 'reference',
    });
    const image = character.poses.idle.match(/^data:image\/webp;base64,(.+)$/);
    if (!image) throw new Error(`Missing WebP portrait: ${id}`);
    await writeFile(`${root}portraits/${id}.webp`, Buffer.from(image[1], 'base64'));
  }
}
const candidates = [
  'laptop-buddy',
  'ichigo',
  'shoyo-hinata',
  'madoka-kaname',
  'gingerbrave',
  'kirby',
  'pikachu',
  'stella',
];
const featured = [
  ...new Set([
    ...candidates.filter((id) => entries.some((entry) => entry.id === id)),
    ...entries.slice(-7).map((entry) => entry.id),
  ]),
].slice(0, 8);
await writeFile(root + 'catalog.json', JSON.stringify({ featured, entries }));
console.log(`Packaged ${entries.length} pets in ${counts.length} independently loaded batches.`);
