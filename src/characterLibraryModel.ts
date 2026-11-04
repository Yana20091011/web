import type { PetAnimation, PetDesign } from './Pet';
import { DEFAULT_PET } from './model';

export interface LibraryCharacter {
  id: string;
  name: string;
  series: string;
  category: string;
  poses: { idle: string; blinking: string; typing: string; happy: string };
  blinkFrames?: string[];
}
export function characterDesign(character: LibraryCharacter): PetDesign {
  const { idle, blinking, typing, happy } = character.poses;
  const frames = character.blinkFrames || [idle, blinking, idle];
  const blink: PetAnimation = {
    enabled: true,
    loop: true,
    pauseMs: 3000,
    frames: frames.map((image, i) => ({ id: `blink-${i}`, image, duration: i === 0 ? 180 : 120 })),
  };
  return {
    ...DEFAULT_PET,
    name: character.name,
    libraryCharacterId: character.id,
    species: 'custom',
    accessory: 'none',
    images: { idle, jump: typing, cheer: happy, surprise: blinking, dance: happy, sleep: blinking },
    typingImage: typing,
    animations: { idle: blink },
  };
}
