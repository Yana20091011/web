import type { Action, PetDesign } from './Pet';

export interface Reaction {
  id: string;
  key: string;
  action: Action;
  phrase: string;
}
export interface SavedPet {
  id: string;
  design: PetDesign;
  reactions: Reaction[];
}
export const COLORS = [
  { name: 'Matcha', value: '#b5dbb3' },
  { name: 'Lavender', value: '#c7b5ee' },
  { name: 'Strawberry', value: '#f1b2cb' },
  { name: 'Butter', value: '#f5d793' },
  { name: 'Blueberry', value: '#a9cce9' },
];
export const DEFAULT_PET: PetDesign = {
  name: 'Mochi',
  species: 'cat',
  color: COLORS[0].value,
  size: 100,
  accessory: 'bow',
};
export const ACTIONS: { value: Action; label: string; phrase: string }[] = [
  { value: 'jump', label: 'Jump', phrase: 'Wheee!' },
  { value: 'cheer', label: 'Cheer', phrase: 'You got this!' },
  { value: 'surprise', label: 'Surprise', phrase: 'A little plot twist!' },
  { value: 'dance', label: 'Dance', phrase: 'Happy little keystrokes!' },
  { value: 'sleep', label: 'Sleep', phrase: 'Just resting my eyes…' },
];
export const DEFAULT_REACTIONS: Reaction[] = [
  { id: 'space', key: ' ', action: 'jump', phrase: 'Wheee!' },
  { id: 'enter', key: 'Enter', action: 'cheer', phrase: 'You got this!' },
  { id: 'backspace', key: 'Backspace', action: 'surprise', phrase: 'A little plot twist!' },
];
export const keyLabel = (key: string) =>
  key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;
export const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
export function validDesign(v: unknown): v is PetDesign {
  return (
    isObject(v) &&
    typeof v.name === 'string' &&
    v.name.length <= 24 &&
    ['cat', 'bunny', 'blob'].includes(v.species as string) &&
    COLORS.some((c) => c.value === v.color) &&
    typeof v.size === 'number' &&
    v.size >= 70 &&
    v.size <= 125 &&
    ['bow', 'glasses', 'star', 'none'].includes(v.accessory as string)
  );
}
export function validReactions(v: unknown): v is Reaction[] {
  return (
    Array.isArray(v) &&
    v.length <= 30 &&
    v.every(
      (r) =>
        isObject(r) &&
        typeof r.id === 'string' &&
        typeof r.key === 'string' &&
        r.key.length > 0 &&
        r.key.length <= 20 &&
        ACTIONS.some((a) => a.value === r.action) &&
        typeof r.phrase === 'string' &&
        r.phrase.length <= 80,
    )
  );
}
export function readDraft(): { design: PetDesign; reactions: Reaction[]; id?: string } {
  try {
    const d: unknown = JSON.parse(localStorage.getItem('keycritter-draft') || 'null');
    if (isObject(d) && validDesign(d.design) && validReactions(d.reactions))
      return {
        design: d.design,
        reactions: d.reactions,
        id: typeof d.id === 'string' ? d.id : undefined,
      };
  } catch {
    /* A blocked or corrupted store falls back to a new pet. */
  }
  return { design: { ...DEFAULT_PET }, reactions: DEFAULT_REACTIONS.map((r) => ({ ...r })) };
}
export function readPets(): SavedPet[] {
  try {
    const p: unknown = JSON.parse(localStorage.getItem('keycritter-pets') || '[]');
    if (Array.isArray(p))
      return p.filter(
        (v): v is SavedPet =>
          isObject(v) &&
          typeof v.id === 'string' &&
          validDesign(v.design) &&
          validReactions(v.reactions),
      );
  } catch {
    /* Keep the playground usable if browser storage is unavailable. */
  }
  return [];
}
