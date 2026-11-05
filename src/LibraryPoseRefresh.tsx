import { useState, type Dispatch, type SetStateAction } from 'react';
import type { PetDesign } from './Pet';
import { characterSource } from './backgrounds';
import { loadLibraryCharacter } from './characterLibraryData';
import { characterDesign } from './characterLibraryModel';

export default function LibraryPoseRefresh({
  design,
  onChange,
}: {
  design: PetDesign;
  onChange: Dispatch<SetStateAction<PetDesign>>;
}) {
  const source = characterSource(design);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!source || (design.images?.drink && design.images?.tired)) return null;
  async function refresh() {
    if (!source) return;
    setBusy(true);
    setError('');
    try {
      const latest = characterDesign(await loadLibraryCharacter(source));
      onChange((current) =>
        characterSource(current)?.id !== source.id
          ? current
          : {
              ...current,
              libraryCharacterId: source.id,
              images: latest.images,
              typingImage: latest.typingImage,
              animations: latest.animations,
            },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the new poses. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="library-pose-refresh">
      <p>
        {source.poseStyle === 'confident'
          ? `New confident expressions for ${source.name}: thumbs up, casual V signs, head scratches, desk naps, stretches, and drink breaks.`
          : `New expressions for ${source.name}: desk naps, peace signs, shy faces, and little drink breaks.`}
      </p>
      <button
        type="button"
        className="button preview-button"
        disabled={busy}
        onClick={() => void refresh()}
      >
        {busy ? 'Loading poses…' : 'Replace with latest library poses'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
