import { preparePetImage } from './petImages';

export const MAX_BACKGROUND_IMAGE_LENGTH = 700_000;
export function validBackgroundImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_BACKGROUND_IMAGE_LENGTH &&
    /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}
export function prepareBackgroundImage(file: File): Promise<string> {
  return preparePetImage(file, { maxSide: 1600, maxLength: MAX_BACKGROUND_IMAGE_LENGTH });
}
