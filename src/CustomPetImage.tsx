import { useEffect, useMemo, useState } from 'react';
import type { Action, PetDesign } from './Pet';
import { frameAt } from './framePlayback';

export default function CustomPetImage({
  design,
  action,
  mini,
  playbackId,
  playing,
}: {
  design: PetDesign;
  action?: Action;
  mini: boolean;
  playbackId: number;
  playing: boolean;
}) {
  const pose =
    action && (design.images?.[action] || design.animations?.[action]?.enabled) ? action : 'idle';
  const clip = design.animations?.[pose];
  // Settings broadcasts can contain fresh objects with the same frames. Keep the clock running.
  const signature = useMemo(() => JSON.stringify(clip), [clip]);
  const restart = pose === 'idle' ? 0 : playbackId;
  const [position, setPosition] = useState({ signature, restart, index: 0 });
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!clip?.enabled || mini || !playing || reduced) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // Decode before starting the clock to avoid empty flashes on the first cycle.
    void Promise.all(
      clip.frames.map(async (frame) => {
        const image = new Image();
        image.src = frame.image;
        await image.decode().catch(() => {});
      }),
    ).then(() => {
      if (cancelled) return;
      const start = performance.now();
      const tick = () => {
        const next = frameAt(clip, performance.now() - start);
        setPosition({ signature, restart, index: next.index });
        if (next.nextIn !== null) timer = setTimeout(tick, Math.max(1, Math.ceil(next.nextIn)));
      };
      tick();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, restart, pose, mini, playing, reduced]);
  const index =
    clip?.enabled &&
    !mini &&
    playing &&
    !reduced &&
    position.signature === signature &&
    position.restart === restart
      ? position.index
      : 0;
  return (
    <img
      className={`pixel-pet custom-pet ${mini ? 'mini-pet' : ''}`}
      src={
        (clip?.enabled && clip.frames[index]?.image) || design.images?.[pose] || design.images?.idle
      }
      alt=""
      draggable={false}
      data-pose={pose}
      data-frame-index={index}
      data-animated={Boolean(clip?.enabled && !mini && playing && !reduced)}
    />
  );
}
