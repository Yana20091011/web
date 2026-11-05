import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
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
  const needsPoses = Boolean(source && !design.images?.drink && !design.images?.tired);
  useEffect(() => {
    if (!source || !needsPoses) return;
    let cancelled = false;
    void loadLibraryCharacter(source)
      .then((character) => {
        if (cancelled) return;
        const latest = characterDesign(character);
        const originals = new Set([
          character.poses.idle,
          character.poses.blinking,
          character.poses.typing,
          character.poses.happy,
        ]);
        onChange((current) => {
          // Only migrate recognizable library artwork. Keep uploaded/custom poses.
          if (
            characterSource(current)?.id !== source.id ||
            current.images?.idle !== character.poses.idle ||
            current.images?.drink ||
            current.images?.tired
          )
            return current;
          const images = { ...current.images };
          for (const [slot, image] of Object.entries(latest.images || {})) {
            const key = slot as keyof typeof images;
            if (!images[key] || originals.has(images[key]!)) images[key] = image;
          }
          return { ...current, libraryCharacterId: source.id, images };
        });
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'Could not load new poses.');
      });
    return () => {
      cancelled = true;
    };
  }, [source?.id, needsPoses, onChange]);
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
