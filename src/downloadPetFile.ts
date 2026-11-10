import { exportPetFile, petFileName, type PortablePet } from './petTransferFormat';

export function downloadPetFile(pet: PortablePet): string {
  const contents = exportPetFile(pet);
  const filename = petFileName(pet.design.name);
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari can start consuming a blob download after the click handler has returned.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return filename;
}
