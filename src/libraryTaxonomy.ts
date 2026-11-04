// Display classification stays separate from saved pet files and pose artwork.
const GHIBLI = new Set([
  'Studio Ghibli',
  'Howl’s Moving Castle',
  'Kiki’s Delivery Service',
  'My Neighbor Totoro',
  'Spirited Away',
  'Ponyo',
  'Princess Mononoke',
]);
const SERIES_OVERRIDES: Record<string, string> = {
  boruto: 'Boruto',
  sarada: 'Boruto',
  mitsuki: 'Boruto',
  sophie: 'Howl’s Moving Castle',
  howl: 'Howl’s Moving Castle',
  calcifer: 'Howl’s Moving Castle',
  haku: 'Spirited Away',
  'no-face': 'Spirited Away',
  chihiro: 'Spirited Away',
  kiki: 'Kiki’s Delivery Service',
  jiji: 'Kiki’s Delivery Service',
  ponyo: 'Ponyo',
  san: 'Princess Mononoke',
  totoro: 'My Neighbor Totoro',
  rex: 'Xenoblade Chronicles 2',
  pyra: 'Xenoblade Chronicles 2',
  mythra: 'Xenoblade Chronicles 2',
  nia: 'Xenoblade Chronicles 2',
};
export function classifiedSeries(id: string, series: string): string {
  return SERIES_OVERRIDES[id] || series;
}
export function franchiseFor(series: string): string {
  if (GHIBLI.has(series)) return 'Studio Ghibli';
  if (series === 'Naruto' || series === 'Boruto') return 'Naruto';
  if (series.startsWith('Final Fantasy')) return 'Final Fantasy';
  if (series.startsWith('Ori and')) return 'Ori';
  if (series.startsWith('Hades')) return 'Hades';
  if (series.startsWith('Persona')) return 'Persona';
  if (series.startsWith('NieR')) return 'NieR';
  if (series.startsWith('Honkai')) return 'Honkai';
  if (series.startsWith('Ace Attorney')) return 'Ace Attorney';
  if (series.startsWith('Fire Emblem')) return 'Fire Emblem';
  if (series.startsWith('Xenoblade Chronicles')) return 'Xenoblade Chronicles';
  if (series === 'KeyCritter original') return 'KeyCritter';
  return series;
}
