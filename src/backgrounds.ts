import catalog from '../desktop/background-catalog.json' with { type: 'json' };
import { libraryEntries } from './characterLibraryData';
import type { PetDesign } from './Pet';

export const backgrounds = catalog;
export type Background = (typeof backgrounds)[number];
const artwork = import.meta.glob('./assets/backgrounds/*.webp', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
}) as Record<string, string>;
export function backgroundFor(id?: string): Background {
  return backgrounds.find((background) => background.id === id) || backgrounds[0];
}
export function backgroundImageFor(id?: string): string {
  return artwork[`./assets/backgrounds/${backgroundFor(id).id}.webp`];
}
export function characterSource(design: PetDesign) {
  return (
    libraryEntries.find((entry) => entry.id === design.libraryCharacterId) ||
    (!design.libraryCharacterId && design.species === 'custom'
      ? libraryEntries.find((entry) => entry.name === design.name)
      : undefined)
  );
}
export function suitsCharacter(background: Background, design: PetDesign): boolean {
  const source = characterSource(design);
  return Boolean(
    source &&
    (background.series.includes(source.franchise) || background.series.includes(source.series)),
  );
}
