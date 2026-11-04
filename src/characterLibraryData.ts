import catalog from './assets/character-library/catalog.json';
import type { LibraryCharacter } from './characterLibraryModel';
import { classifiedSeries, franchiseFor } from './libraryTaxonomy';
export const libraryEntries = catalog.entries.map((entry) => {
  const series = classifiedSeries(entry.id, entry.series);
  return { ...entry, series, franchise: franchiseFor(series) };
});
export type LibraryEntry = (typeof libraryEntries)[number];
export const featuredEntries = catalog.featured
  .map((id) => libraryEntries.find((entry) => entry.id === id)!)
  .filter(Boolean);
const thumbnails = import.meta.glob('./assets/character-library/portraits/*.webp', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
}) as Record<string, string>;
const batches = import.meta.glob('./assets/character-library/batches/*.json');
const cache = new Map<string, Promise<LibraryCharacter[]>>();
export function portraitFor(entry: LibraryEntry): string {
  return thumbnails[`./assets/character-library/portraits/${entry.id}.webp`];
}
export async function loadLibraryCharacter(entry: LibraryEntry): Promise<LibraryCharacter> {
  let batch = cache.get(entry.batch);
  if (!batch) {
    const load = batches[`./assets/character-library/batches/${entry.batch}.json`];
    if (!load)
      throw new Error('This character artwork is unavailable. Reload the page to try again.');
    batch = load()
      .then((module) => (module as { default: LibraryCharacter[] }).default)
      .catch(() => {
        throw new Error(
          'Could not load this pet’s artwork. Check your connection and reload the page.',
        );
      });
    cache.set(entry.batch, batch);
    batch.catch(() => cache.delete(entry.batch));
  }
  const character = (await batch).find((character) => character.id === entry.id);
  if (!character)
    throw new Error('This character artwork is unavailable. Reload the page to try again.');
  return character;
}
