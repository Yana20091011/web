import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  exportPetFile,
  importPetFile,
  MAX_PET_FILE_BYTES,
  petFileName,
  type PortablePet,
} from './petTransfer';
import './pet-transfer.css';

export default function PetTransfer({
  pet,
  onImport,
}: {
  pet: PortablePet;
  onImport: (pet: PortablePet) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const importHandler = useRef(onImport);
  importHandler.current = onImport;
  const busy = useRef(false);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function exportCurrent() {
    setMessage('');
    setError('');
    try {
      const url = URL.createObjectURL(new Blob([exportPetFile(pet)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = petFileName(pet.design.name);
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Pet file ready. Open KeyCritter on your other device and choose Import pet.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not export this pet.');
    }
  }
  async function importFile(file?: File) {
    if (!file || busy.current) return;
    busy.current = true;
    setReading(true);
    setMessage('');
    setError('');
    try {
      if (file.size > MAX_PET_FILE_BYTES) throw new Error('Choose a pet file under 3 MB.');
      const incoming = importPetFile(await file.text());
      const images = new Set(
        [
          ...Object.values(incoming.design.images || {}),
          incoming.design.typingImage,
          ...Object.values(incoming.design.animations || {}).flatMap(
            (clip) => clip?.frames.map((f) => f.image) || [],
          ),
        ].filter((v): v is string => Boolean(v)),
      );
      await Promise.all(
        [...images].map(async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode().catch(() => {
            throw new Error('This pet contains an image that cannot be opened.');
          });
          if (
            !image.naturalWidth ||
            !image.naturalHeight ||
            Math.max(image.naturalWidth, image.naturalHeight) > 8192
          )
            throw new Error('This pet contains an image larger than 8192 pixels.');
        }),
      );
      importHandler.current(incoming);
      setMessage(`${incoming.design.name || 'Your pet'} was imported and saved as a new pet.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import this pet.');
    } finally {
      busy.current = false;
      setReading(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <section className="pet-transfer" aria-label="Transfer your pet">
      <div className="pet-transfer-copy">
        <h2>Take this pet with you.</h2>
        <p>
          Export your current design, images, animation frames, and key reactions. Import the file
          in the desktop app or another browser.
        </p>
      </div>
      <div className="pet-transfer-actions">
        <button
          type="button"
          className="button preview-button"
          disabled={reading}
          onClick={exportCurrent}
        >
          <Download size={15} aria-hidden="true" />
          Export pet
        </button>
        <button
          type="button"
          className="button preview-button"
          disabled={reading}
          onClick={() => input.current?.click()}
        >
          <Upload size={15} aria-hidden="true" />
          {reading ? 'Importing…' : 'Import pet'}
        </button>
        <input
          ref={input}
          hidden
          type="file"
          aria-label="Import pet file"
          accept=".json,application/json"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p className="pet-transfer-message pet-transfer-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="pet-transfer-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
