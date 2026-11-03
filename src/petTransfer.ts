import type { PetDesign } from './Pet';
import { validDesign, validReactions, normalizeKey, type Reaction } from './model';

export const MAX_PET_FILE_BYTES = 3 * 1024 * 1024;
export interface PortablePet {
  design: PetDesign;
  reactions: Reaction[];
}

// Copy only pet data. Account credentials, desktop position, and unrelated settings
// never enter the transferable file, even if an input contains extra properties.
function cleanPet(value: unknown): PortablePet {
  if (!value || typeof value !== 'object') throw new Error('This file does not contain a pet.');
  const { design, reactions } = value as PortablePet;
  if (
    !validDesign(design) ||
    !validReactions(reactions) ||
    reactions.some((r) => !r.id.length || r.id.length > 100) ||
    new Set(reactions.map((r) => r.id)).size !== reactions.length ||
    new Set(reactions.map((r) => normalizeKey(r.key))).size !== reactions.length
  ) {
    throw new Error('This pet has invalid images, animation frames, settings, or key reactions.');
  }
  return {
    design: {
      name: design.name,
      species: design.species,
      color: design.color,
      size: design.size,
      accessory: design.accessory,
      ...(design.motionStrength === undefined ? {} : { motionStrength: design.motionStrength }),
      ...(design.images ? { images: Object.fromEntries(Object.entries(design.images)) } : {}),
      ...(design.typingImage ? { typingImage: design.typingImage } : {}),
      ...(design.animations
        ? {
            animations: Object.fromEntries(
              Object.entries(design.animations).map(([pose, clip]) => [
                pose,
                {
                  enabled: clip!.enabled,
                  loop: clip!.loop,
                  pauseMs: clip!.pauseMs,
                  frames: clip!.frames.map(({ id, image, duration }) => ({ id, image, duration })),
                },
              ]),
            ),
          }
        : {}),
    },
    reactions: reactions.map(({ id, key, action, phrase }) => ({ id, key, action, phrase })),
  };
}
export function exportPetFile(pet: PortablePet): string {
  const text = JSON.stringify(
    { format: 'keycritter-pet', version: 1, pet: cleanPet(pet) },
    null,
    2,
  );
  if (new TextEncoder().encode(text).length > MAX_PET_FILE_BYTES)
    throw new Error('This pet is too large to export. Reduce its images or animation frames.');
  return text;
}
export function importPetFile(text: string): PortablePet {
  if (new TextEncoder().encode(text).length > MAX_PET_FILE_BYTES)
    throw new Error('Choose a pet file under 3 MB.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This is not a readable KeyCritter pet file.');
  }
  if (data?.format !== 'keycritter-pet')
    throw new Error('Choose a .keycritter.json file exported from KeyCritter.');
  if (data.version !== 1)
    throw new Error('This pet file uses an unsupported version. Update KeyCritter and try again.');
  return cleanPet(data.pet);
}
export function petFileName(name: string): string {
  const safe = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${safe || 'my-pet'}.keycritter.json`;
}
