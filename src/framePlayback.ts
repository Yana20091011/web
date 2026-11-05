import type { PetAnimation, PetAnimations, PetDesign, Action } from './Pet';

export const MAX_FRAMES = 12;
export const MAX_FRAME_LENGTH = 60_000;
export const MAX_ANIMATION_LENGTH = 900_000;

export function validAnimations(value: unknown): value is PetAnimations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  let length = 0;
  const entries = Object.entries(value);
  return (
    entries.length <= 8 &&
    entries.every(([pose, clip]) => {
      if (
        !['idle', 'jump', 'cheer', 'surprise', 'dance', 'sleep', 'tired', 'drink'].includes(pose) ||
        !clip ||
        typeof clip !== 'object' ||
        typeof clip.enabled !== 'boolean' ||
        typeof clip.loop !== 'boolean' ||
        !Number.isInteger(clip.pauseMs) ||
        clip.pauseMs < 0 ||
        clip.pauseMs > 15000 ||
        !Array.isArray(clip.frames) ||
        !clip.frames.length ||
        clip.frames.length > MAX_FRAMES
      )
        return false;
      const ids = new Set<string>();
      return clip.frames.every((frame: Record<string, unknown>) => {
        if (
          !frame ||
          typeof frame.id !== 'string' ||
          !frame.id.length ||
          frame.id.length > 100 ||
          ids.has(frame.id) ||
          typeof frame.image !== 'string' ||
          frame.image.length > MAX_FRAME_LENGTH ||
          !/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(frame.image) ||
          !Number.isInteger(frame.duration) ||
          (frame.duration as number) < 40 ||
          (frame.duration as number) > 5000
        )
          return false;
        ids.add(frame.id);
        length += frame.image.length;
        return length <= MAX_ANIMATION_LENGTH;
      });
    })
  );
}

export const clipDuration = (clip: PetAnimation) =>
  clip.frames.reduce((total, frame) => total + frame.duration, 0);

// A repeat's pause holds the first (resting) frame, so a blink rests with eyes open.
export function frameAt(
  clip: PetAnimation,
  elapsed: number,
): { index: number; nextIn: number | null } {
  const total = clipDuration(clip);
  if (!clip.loop && elapsed >= total) return { index: clip.frames.length - 1, nextIn: null };
  const position = clip.loop ? Math.max(0, elapsed) % (total + clip.pauseMs) : Math.max(0, elapsed);
  if (position >= total) return { index: 0, nextIn: total + clip.pauseMs - position };
  let end = 0;
  for (let index = 0; index < clip.frames.length; index++) {
    end += clip.frames[index].duration;
    if (position < end) return { index, nextIn: end - position };
  }
  return { index: 0, nextIn: null };
}

export function reactionDuration(design: PetDesign, action: Action, minimum: number) {
  const clip = design.species === 'custom' ? design.animations?.[action] : undefined;
  return clip?.enabled ? Math.max(minimum, clipDuration(clip)) : minimum;
}
