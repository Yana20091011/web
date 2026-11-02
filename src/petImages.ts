import type { PetImages } from './Pet';

export const IMAGE_SLOTS = ['idle', 'jump', 'cheer', 'surprise', 'dance', 'sleep'] as const;
export const MAX_IMAGE_LENGTH = 220_000;
export function validPetImages(value: unknown): value is PetImages {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length <= 6 &&
    entries.every(
      ([slot, data]) =>
        IMAGE_SLOTS.includes(slot as (typeof IMAGE_SLOTS)[number]) &&
        typeof data === 'string' &&
        data.length <= MAX_IMAGE_LENGTH &&
        /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(data),
    )
  );
}

export async function preparePetImage(
  source: File | string,
  options = { maxSide: 384, maxLength: MAX_IMAGE_LENGTH },
): Promise<string> {
  if (
    source instanceof File &&
    (!['image/png', 'image/jpeg', 'image/webp'].includes(source.type) ||
      source.size > 8 * 1024 * 1024)
  )
    throw new Error('Choose a PNG, JPG, or WebP image under 8 MB.');
  if (
    typeof source === 'string' &&
    (!/^data:image\/(png|webp|jpeg);base64,/.test(source) || source.length > 24 * 1024 * 1024)
  )
    throw new Error('The generated image could not be read.');
  const url = source instanceof File ? URL.createObjectURL(source) : source;
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {
      throw new Error('This file could not be opened as an image. Try another PNG, JPG, or WebP.');
    });
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      Math.max(image.naturalWidth, image.naturalHeight) > 8192
    )
      throw new Error('Choose an image no larger than 8192 pixels on either side.');
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, options.maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image editing is unavailable in this browser.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.55]) {
      const data = canvas.toDataURL('image/webp', quality);
      if (data.length <= options.maxLength) return data;
    }
    throw new Error('This image is too detailed to save. Try a smaller or simpler image.');
  } finally {
    if (source instanceof File) URL.revokeObjectURL(url);
  }
}
