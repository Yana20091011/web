// Original, locally drawn fan-art sprites. No remote artwork or runtime API is used.
import { chromium } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
const roster = [
  // name, series, hair/body, outfit, signature accessory
  ['Naruto', 'Naruto', '#f6ce50', '#ed883d', 'headband'],
  ['Sasuke', 'Naruto', '#273249', '#4f6398', 'headband'],
  ['Sakura', 'Naruto', '#ed9cb6', '#bf4263', 'headband'],
  ['Kakashi', 'Naruto', '#b9c4d1', '#667a65', 'mask'],
  ['Hinata', 'Naruto', '#333756', '#b3a6d5', 'headband'],
  ['Luffy', 'One Piece', '#302a33', '#dd5052', 'strawhat'],
  ['Zoro', 'One Piece', '#80b874', '#38785c', 'swords'],
  ['Nami', 'One Piece', '#e68f45', '#70b5c2', 'waves'],
  ['Chopper', 'One Piece', '#bb8a60', '#ef9ec0', 'antlers'],
  ['Goku', 'Dragon Ball', '#292d39', '#ed8b3f', 'spikes'],
  ['Vegeta', 'Dragon Ball', '#262939', '#4d6ca6', 'armor'],
  ['Sailor Moon', 'Sailor Moon', '#f4d266', '#5d78b5', 'moondouble'],
  ['Luna', 'Sailor Moon', '#42405c', '#63618c', 'mooncat'],
  ['Totoro', 'My Neighbor Totoro', '#929fa5', '#c6d1c7', 'totoro'],
  ['Kiki', 'Kiki’s Delivery Service', '#3f303d', '#544160', 'redbow'],
  ['Howl', 'Howl’s Moving Castle', '#e4cf8a', '#e7b9c7', 'coat'],
  ['Chihiro', 'Spirited Away', '#73514c', '#c2d8ba', 'stripe'],
  ['Tanjiro', 'Demon Slayer', '#5b3037', '#4f9e87', 'checkered'],
  ['Nezuko', 'Demon Slayer', '#352c38', '#dfa3b5', 'bamboo'],
  ['Zenitsu', 'Demon Slayer', '#f0c561', '#e8b457', 'triangles'],
  ['Gojo', 'Jujutsu Kaisen', '#e1e7f1', '#41405d', 'blindfold'],
  ['Yuji', 'Jujutsu Kaisen', '#e79891', '#344155', 'scarf'],
  ['Anya', 'Spy × Family', '#efa9bf', '#393344', 'horns'],
  ['Levi', 'Attack on Titan', '#38363d', '#698066', 'cape'],
  ['Edward', 'Fullmetal Alchemist', '#dfbd5a', '#b94c4e', 'braid'],
  ['Mario', 'Super Mario', '#714a38', '#4266ab', 'mariocap'],
  ['Luigi', 'Super Mario', '#714a38', '#4266ab', 'luigicap'],
  ['Peach', 'Super Mario', '#f3d16f', '#efa6cb', 'crown'],
  ['Yoshi', 'Super Mario', '#79b66a', '#ebdfb6', 'dinosaur'],
  ['Kirby', 'Kirby', '#f2acc7', '#dc668f', 'kirby'],
  ['Link', 'The Legend of Zelda', '#e5c36c', '#72a475', 'elfhat'],
  ['Zelda', 'The Legend of Zelda', '#e8cf83', '#b59ad4', 'elfcrown'],
  ['Pikachu', 'Pokémon', '#efcf62', '#a87551', 'pikachu'],
  ['Eevee', 'Pokémon', '#b48660', '#ebd7b4', 'eevee'],
  ['Jigglypuff', 'Pokémon', '#f0b4cb', '#a3d4d3', 'puff'],
  ['Bulbasaur', 'Pokémon', '#83bcad', '#69a36a', 'bulb'],
  ['Squirtle', 'Pokémon', '#8ac4d9', '#b89c70', 'turtle'],
  ['Charmander', 'Pokémon', '#e7a466', '#f4d786', 'flame'],
  ['Sonic', 'Sonic the Hedgehog', '#5385c6', '#d9585f', 'sonic'],
  ['Tails', 'Sonic the Hedgehog', '#e5b55c', '#e8e2ce', 'fox'],
  ['Shadow', 'Sonic the Hedgehog', '#373847', '#bc4c54', 'shadow'],
  ['Isabelle', 'Animal Crossing', '#e5ca79', '#8bbd91', 'dogbell'],
  ['Tom Nook', 'Animal Crossing', '#a27e61', '#8cbbac', 'raccoon'],
  ['Villager', 'Animal Crossing', '#876049', '#cf7279', 'stripe'],
  ['Steve', 'Minecraft', '#684c3e', '#70b9b4', 'block'],
  ['Alex', 'Minecraft', '#cc8e56', '#99b781', 'block'],
  ['Creeper', 'Minecraft', '#91b56d', '#6e9257', 'creeper'],
  ['Sans', 'Undertale', '#edeae2', '#79a9d0', 'skeleton'],
  ['Hollow Knight', 'Hollow Knight', '#e8e9dd', '#657789', 'knight'],
];
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
function sprite([name, , hair, shirt, trait], pose) {
  const happy = pose === 'happy',
    blink = pose === 'blinking',
    typing = pose === 'typing';
  const skin = '#f3d4bc',
    ink = '#373343';
  const animal = [
    'antlers',
    'mooncat',
    'totoro',
    'dinosaur',
    'kirby',
    'pikachu',
    'eevee',
    'puff',
    'bulb',
    'turtle',
    'flame',
    'sonic',
    'fox',
    'shadow',
    'dogbell',
    'raccoon',
    'creeper',
    'skeleton',
    'knight',
  ].includes(trait);
  const rect = (x, y, w, h, c, rx = 1) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}"/>`;
  const path = (d, c) =>
    `<path d="${d}" fill="${c}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>`;
  const face = animal ? hair : skin;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 96 96"><title>${esc(name)} ${pose}</title><ellipse cx="48" cy="88" rx="28" ry="4" fill="#373343" opacity=".1"/>`;
  // Silhouette, little boots, torso, and large chibi head.
  if (['cape', 'coat', 'braid'].includes(trait))
    s += path('M29 49 L18 82 Q48 90 77 82 L65 48Z', trait === 'cape' ? '#52674e' : shirt);
  s +=
    rect(29, 77, 15, 9, animal ? shirt : '#4b4659', 3) +
    rect(52, 77, 15, 9, animal ? shirt : '#4b4659', 3);
  s += path('M31 52 Q48 44 65 52 L69 77 Q48 85 27 77Z', shirt);
  // Side hair / ears behind head.
  if (['moondouble', 'redbow', 'elfcrown', 'bamboo', 'horns', 'braid'].includes(trait))
    s += path('M24 28 Q17 51 22 73 L34 67 L33 26 M63 26 L64 69 L77 73 Q80 43 71 28Z', hair);
  if (['mooncat', 'eevee', 'pikachu', 'fox', 'totoro', 'knight', 'sonic', 'shadow'].includes(trait))
    s += path('M25 32 L21 6 L40 24 M56 24 L75 6 L71 35Z', hair);
  if (trait === 'dogbell') s += path('M27 23 Q8 25 15 58 L28 51 M68 23 Q88 25 81 58 L68 51Z', hair);
  if (trait === 'antlers')
    s += `<path d="M27 26 L17 14 M20 17 L12 19 M21 18 L22 10 M69 26 L79 14 M76 17 L84 19 M75 18 L74 10" fill="none" stroke="#96755c" stroke-width="4" stroke-linecap="round"/>`;
  if (trait === 'bulb') s += path('M28 25 Q16 5 39 14 Q48 0 57 14 Q82 3 67 30Z', '#65a471');
  if (trait === 'flame') s += path('M69 75 Q94 63 82 47 Q83 61 76 57 Q63 67 69 75Z', '#edac57');
  s += `<rect x="24" y="20" width="48" height="41" rx="${trait === 'block' || trait === 'creeper' ? 2 : 18}" fill="${face}" stroke="${ink}" stroke-width="1.5"/>`;
  // Hair contours and recognizable costume details.
  if (!animal)
    s += path(
      trait === 'spikes' || trait === 'armor'
        ? 'M23 33 L17 23 L27 22 L22 12 L37 18 L40 7 L48 17 L61 9 L62 20 L76 18 L71 35 L62 28 L55 32 L47 24 L39 30 L32 26Z'
        : 'M24 37 L22 26 Q22 11 46 12 Q74 10 74 30 L69 42 L62 27 L56 34 L48 26 L39 33 L33 27 L28 41Z',
      hair,
    );
  if (trait === 'sonic' || trait === 'shadow')
    s += path('M25 29 L12 36 L25 40 L16 49 L29 49 M68 27 L84 37 L71 41 L81 50 L68 49Z', hair);
  if (trait === 'raccoon') s += `<ellipse cx="48" cy="40" rx="22" ry="12" fill="#6b5248"/>`;
  if (trait === 'totoro' || trait === 'eevee' || trait === 'fox')
    s += `<ellipse cx="48" cy="66" rx="15" ry="11" fill="${trait === 'totoro' ? '#dbe0ce' : '#eee0be'}"/>`;
  if (trait === 'pikachu')
    s += `<circle cx="30" cy="48" r="5" fill="#d87570"/><circle cx="66" cy="48" r="5" fill="#d87570"/>`;
  if (trait === 'checkered')
    for (let y = 55; y < 77; y += 8)
      for (let x = 30; x < 66; x += 8) if ((x + y) % 16 === 5) s += rect(x, y, 8, 8, '#344c45');
  if (trait === 'triangles')
    s += `<path d="M32 58 l3 6 h-6Z M48 67 l3 6 h-6Z M61 57 l3 6 h-6Z" fill="#f6e6c0"/>`;
  if (trait === 'stripe' || trait === 'waves')
    s += rect(30, 63, 36, 5, trait === 'stripe' ? '#eee8da' : '#e8dcc2');
  if (trait === 'armor') s += path('M32 53 L43 58 L53 58 L65 53 L61 72 L35 72Z', '#e6e0ca');
  if (trait === 'scarf')
    s += path('M28 52 Q48 60 68 52 L66 61 L58 62 L63 74 L55 77 L49 62 L30 61Z', '#ba5459');
  if (trait === 'swords')
    s += `<path d="M63 61 L79 80 M69 56 L85 75" stroke="#d5dedb" stroke-width="3"/>`;
  // Faces: each expression changes the drawn eyes, mouth, and hands.
  if (trait === 'creeper') {
    s +=
      rect(31, blink ? 39 : 32, 11, blink ? 2 : 11, ink) +
      rect(55, blink ? 39 : 32, 11, blink ? 2 : 11, ink) +
      path('M42 44 H55 V50 H61 V58 H53 V53 H43 V58 H36 V50 H42Z', ink);
  } else if (trait === 'knight') {
    s += `<ellipse cx="37" cy="40" rx="5" ry="${blink ? 1 : 8}" fill="${ink}"/><ellipse cx="59" cy="40" rx="5" ry="${blink ? 1 : 8}" fill="${ink}"/>`;
  } else {
    if (blink || happy)
      s += `<path d="M32 40 ${happy ? 'q5 -6 10 0' : 'h10'} M54 40 ${happy ? 'q5 -6 10 0' : 'h10'}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`;
    else
      s +=
        rect(34, 34, 6, 10, ink, 3) +
        rect(56, 34, 6, 10, ink, 3) +
        rect(35, 35, 2, 3, '#fff') +
        rect(57, 35, 2, 3, '#fff');
    s += `<ellipse cx="31" cy="47" rx="4" ry="2" fill="#de9397" opacity=".6"/><ellipse cx="65" cy="47" rx="4" ry="2" fill="#de9397" opacity=".6"/>`;
    s += happy
      ? `<path d="M43 48 Q48 60 54 48Z" fill="#bd6a7c" stroke="${ink}"/>`
      : `<path d="M44 49 Q48 53 52 49" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  if (trait === 'headband' || trait === 'mask')
    s +=
      rect(26, 25, 44, 7, '#626d85') +
      rect(40, 25, 16, 7, '#cad1d9') +
      `<path d="M45 28 q6 -4 6 1 q-4 4 -6 -1" fill="none" stroke="#596578"/>`;
  if (trait === 'mask') s += path('M27 45 Q48 38 69 45 L65 57 Q48 66 31 57Z', '#4a536d');
  if (trait === 'blindfold') {
    s += rect(25, 32, 46, 13, '#343447', 4);
    if (blink) s += `<path d="M74 27 h7 l-7 7 h7" fill="none" stroke="#8f87af" stroke-width="2"/>`;
  }
  if (trait === 'bamboo')
    s +=
      rect(34, 47, 28, 8, '#80ad78', 3) +
      rect(42, 47, 2, 8, '#567d5c') +
      rect(54, 47, 2, 8, '#567d5c');
  if (trait === 'strawhat')
    s +=
      path('M29 23 Q25 3 48 5 Q69 3 67 23Z', '#dfc488') +
      rect(28, 17, 40, 7, '#cb6960') +
      rect(16, 23, 64, 6, '#e3ca8e', 3);
  if (trait === 'mariocap' || trait === 'luigicap')
    s +=
      path('M23 28 Q21 7 48 7 Q73 7 73 29Z', trait === 'mariocap' ? '#d95b5d' : '#69a771') +
      rect(21, 25, 54, 6, trait === 'mariocap' ? '#bc494c' : '#548b5c') +
      `<circle cx="48" cy="18" r="8" fill="#f4ecdc"/><text x="48" y="22" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="11" fill="${shirt}">${trait === 'mariocap' ? 'M' : 'L'}</text>` +
      path('M34 47 Q41 41 48 46 Q55 41 62 47 Q54 56 48 50 Q41 56 34 47Z', '#5d4238');
  if (trait === 'elfhat') s += path('M24 24 Q29 1 61 3 L79 27 L65 25Z', '#6e9b67');
  if (trait === 'elfhat' || trait === 'elfcrown')
    s += path('M24 34 L14 28 L23 44 M72 34 L82 28 L73 44Z', skin);
  if (trait === 'crown' || trait === 'elfcrown')
    s +=
      path('M35 20 L32 8 L43 13 L48 4 L54 13 L65 8 L61 20Z', '#e2bf65') +
      `<circle cx="48" cy="15" r="3" fill="#ae82ba"/>`;
  if (trait === 'redbow') s += path('M37 16 L27 5 L26 23 L39 19 L49 24 L49 6Z', '#c75c69');
  if (trait === 'horns')
    s +=
      path('M27 23 L23 9 L36 17 M61 17 L73 9 L69 24Z', '#484052') +
      rect(24, 18, 10, 3, '#d7ba70') +
      rect(63, 18, 9, 3, '#d7ba70');
  if (trait === 'moondouble')
    s +=
      `<circle cx="25" cy="20" r="9" fill="${hair}" stroke="${ink}"/><circle cx="71" cy="20" r="9" fill="${hair}" stroke="${ink}"/>` +
      path('M35 55 L48 61 L61 55 L54 68 L48 64 L42 68Z', '#d77587');
  if (trait === 'mooncat')
    s += `<path d="M51 24 A6 6 0 1 1 43 17 A5 5 0 0 0 51 24" fill="#e5c976"/>`;
  if (trait === 'antlers')
    s +=
      rect(21, 17, 54, 13, '#e299b6', 4) +
      rect(31, 7, 34, 14, '#e299b6', 4) +
      `<path d="M44 11 l8 8 M52 11 l-8 8" stroke="#f5eee2" stroke-width="3"/>`;
  if (trait === 'dogbell') s += `<circle cx="48" cy="57" r="4" fill="#e5c769"/>`;
  if (trait === 'puff')
    s += `<path d="M43 23 q15 -15 12 1 q-10 8 -9 -2" fill="none" stroke="#cf8eab" stroke-width="3"/>`;
  if (trait === 'skeleton' && !blink && !happy)
    s +=
      rect(32, 34, 9, 10, ink, 4) +
      rect(55, 34, 9, 10, ink, 4) +
      `<path d="M36 49 Q48 61 61 49 M43 52 v5 M50 53 v5 M57 51 v5" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
  // Resting hands, a typing laptop, or raised happy arms.
  if (typing) {
    s +=
      path('M22 76 L18 58 H77 L73 76Z', '#a8b9cd') +
      rect(16, 76, 64, 5, '#d1dce5', 2) +
      `<circle cx="48" cy="67" r="3" fill="#e9eef2"/>` +
      rect(24, 56, 10, 6, face, 3) +
      rect(61, 54, 10, 6, face, 3);
  } else if (happy) {
    s +=
      path('M29 57 L19 45 Q13 40 11 46 Q10 50 24 65Z', face) +
      path('M67 57 L77 45 Q83 40 85 46 Q86 50 72 65Z', face) +
      `<path d="M13 23 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z M82 34 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2Z" fill="#e6bc6d"/>`;
  } else s += rect(23, 57, 10, 16, face, 5) + rect(63, 57, 10, 16, face, 5);
  return s + '</svg>';
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  const raster = async (source) =>
    page.evaluate(async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const c = document.createElement('canvas');
      c.width = 192;
      c.height = 192;
      c.getContext('2d').drawImage(image, 0, 0, 192, 192);
      return c.toDataURL('image/webp', 0.95);
    }, source);
  const library = [];
  const buddy = [];
  for (const file of ['eyes-open', 'eyes-half-closed', 'eyes-closed'])
    buddy.push(
      await raster(
        'data:image/png;base64,' +
          (await readFile(`src/assets/laptop-buddy/${file}.png`)).toString('base64'),
      ),
    );
  library.push({
    id: 'laptop-buddy',
    name: 'Laptop buddy',
    series: 'KeyCritter original',
    category: 'Original',
    poses: { idle: buddy[0], blinking: buddy[2], typing: buddy[1], happy: buddy[0] },
    blinkFrames: [buddy[0], buddy[1], buddy[2], buddy[1]],
  });
  for (let i = 0; i < roster.length; i++) {
    const poses = {};
    for (const pose of ['idle', 'blinking', 'typing', 'happy'])
      poses[pose] = await raster(
        'data:image/svg+xml;base64,' + Buffer.from(sprite(roster[i], pose)).toString('base64'),
      );
    library.push({
      id: roster[i][0].toLowerCase().replaceAll(' ', '-'),
      name: roster[i][0],
      series: roster[i][1],
      category: i < 25 ? 'Anime' : 'Game',
      poses,
    });
  }
  await writeFile('src/assets/character-library/characters.json', JSON.stringify(library));
  console.log(`Created ${library.length} characters with four embedded poses each.`);
} finally {
  await browser.close();
}
