import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';

// Original pixel artwork, drawn directly into PNG pixels without an image dependency.
const art = [
  '................',
  '...oo......oo...',
  '...ogo....ogo...',
  '..ogpgoggogpgo..',
  '..oggpgggggpgo..',
  '.oggggggggggggo.',
  '.oggggggggggggo.',
  '.oggoooggoooggo.',
  '.ogogoggogogggo.',
  '.ogrrgggggrrggo.',
  '..ogccoooo ccgo..'.replace(' ', ''),
  '..ogcccmmcccggo..',
  '...oggccccggo...',
  '...ooggggggoo...',
  '....oooooooo....',
  '................',
];
const palette = {
  '.': [0, 0, 0, 0],
  o: [65, 54, 79, 255],
  g: [181, 219, 179, 255],
  p: [245, 189, 205, 255],
  r: [238, 158, 181, 255],
  c: [255, 247, 223, 255],
  m: [234, 143, 177, 255],
};
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([size, type, data, crc]);
}
function png(scale) {
  const width = 16 * scale;
  const pixels = Buffer.alloc((width * 4 + 1) * width);
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      const color =
        palette[art[Math.floor(y / scale)]?.[Math.floor(x / scale)] || '.'] || palette['.'];
      color.forEach((v, i) => (pixels[y * (width * 4 + 1) + 1 + x * 4 + i] = v));
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(width, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
await writeFile('desktop/tray.png', png(2));
const image = png(16);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(image.length, 14);
ico.writeUInt32LE(22, 18);
await writeFile('desktop/icon.ico', Buffer.concat([ico, image]));
