import { useRef, useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, Film, LoaderCircle, Pause, Play, Plus, Trash2 } from 'lucide-react';
import Pet, { type PetAnimation, type PetDesign, type PetFrame, type PetPose } from './Pet';
import { IMAGE_SLOTS, preparePetImage } from './petImages';
import { MAX_FRAMES, MAX_FRAME_LENGTH, validAnimations } from './framePlayback';
import { LAPTOP_BUDDY } from './petPresets';

const poseTitle = (pose: PetPose) =>
  pose === 'idle' ? 'Idle / blink' : pose[0].toUpperCase() + pose.slice(1);

function TimingInput({
  value,
  onChange,
  label,
  min,
  max,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const parsed = Number(draft);
    const next =
      draft.trim() && Number.isFinite(parsed)
        ? Math.round(Math.max(min, Math.min(max, parsed)))
        : value;
    setDraft(String(next));
    onChange(next);
  }
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step={10}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

export default function AnimationEditor({
  design,
  onChange,
}: {
  design: PetDesign;
  onChange: Dispatch<SetStateAction<PetDesign>>;
}) {
  const [pose, setPose] = useState<PetPose>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [playing, setPlaying] = useState(true);
  const [restart, setRestart] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(design);
  latest.current = design;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const clip = design.animations?.[pose];

  function edit(change: (clip: PetAnimation) => PetAnimation | undefined) {
    onChange((current) => {
      const previous = current.animations?.[pose];
      if (!previous) return current;
      const animations = { ...current.animations };
      const next = change(previous);
      if (next) animations[pose] = next;
      else delete animations[pose];
      return { ...current, animations };
    });
  }
  function applyAnimation(next: PetAnimation) {
    if (!validAnimations({ ...latest.current.animations, [pose]: next }))
      throw new Error(
        'This pet has too much frame data. Remove some frames or use simpler images.',
      );
    onChange((current) => ({
      ...current,
      species: 'custom',
      accessory: 'none',
      images: {
        ...current.images,
        idle: current.images?.idle || next.frames[0].image,
        [pose]: next.frames[0].image,
      },
      animations: { ...current.animations, [pose]: next },
    }));
    setPlaying(true);
    setRestart((n) => n + 1);
  }
  async function useLaptopBuddy() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const images: string[] = [];
      for (const expression of LAPTOP_BUDDY.expressions) {
        images.push(
          await preparePetImage(expression.image, { maxSide: 256, maxLength: MAX_FRAME_LENGTH }),
        );
      }
      if (!alive.current) return;
      applyAnimation({
        enabled: true,
        loop: true,
        pauseMs: LAPTOP_BUDDY.pauseMs,
        frames: LAPTOP_BUDDY.sequence.map(({ expression, duration }) => ({
          id: crypto.randomUUID(),
          image: images[expression],
          duration,
        })),
      });
      setNotice(
        `Laptop buddy frames are ready for ${poseTitle(pose)}. Save your pet to keep them.`,
      );
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : 'Could not apply the ready-made frames.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function upload(files: File[]) {
    if (!files.length || busy) return;
    if (files.length + (clip?.frames.length || 0) > MAX_FRAMES) {
      setError(
        `Each animation can have up to ${MAX_FRAMES} frames. Remove a frame before adding more.`,
      );
      if (input.current) input.current.value = '';
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const frames: PetFrame[] = [];
      for (const file of files) {
        const image = await preparePetImage(file, { maxSide: 256, maxLength: MAX_FRAME_LENGTH });
        frames.push({ id: crypto.randomUUID(), image, duration: 120 });
      }
      if (!alive.current) return;
      const previous = latest.current.animations?.[pose];
      const next: PetAnimation = {
        enabled: true,
        loop: true,
        pauseMs: pose === 'idle' ? 3000 : 0,
        ...previous,
        frames: [...(previous?.frames || []), ...frames],
      };
      next.enabled = true;
      applyAnimation(next);
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : 'Could not add these frames.');
    } finally {
      if (alive.current) setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  const previewDesign: PetDesign | undefined = clip
    ? {
        ...design,
        species: 'custom',
        images: { ...design.images, idle: design.images?.idle || clip.frames[0].image },
        animations: { [pose]: { ...clip, enabled: true } },
      }
    : undefined;

  return (
    <div className="animation-panel">
      <div className="studio-section-title">
        <Film size={15} />
        <h3>A little blink. A lot of life.</h3>
      </div>
      <p className="studio-description">
        Turn your images into a moving buddy. For a blink, add open eyes → half-closed → closed →
        open eyes.
      </p>
      <label className="animation-pose">
        Animate
        <select
          aria-label="Animation pose"
          value={pose}
          disabled={busy}
          onChange={(event) => {
            setPose(event.target.value as PetPose);
            setError('');
            setNotice('');
            setPlaying(true);
          }}
        >
          {IMAGE_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {poseTitle(slot)}
            </option>
          ))}
        </select>
      </label>
      <section className="ready-made-pet" aria-label="Ready-made blink frames">
        <div className="preset-expressions">
          {LAPTOP_BUDDY.expressions.map(({ label, image }) => (
            <div key={label}>
              <img src={image} alt={`Laptop buddy with ${label.toLowerCase()} eyes`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="preset-description">
          <div>
            <h4>Laptop buddy</h4>
            <p>Your ready-made blink frames. No AI connection needed.</p>
          </div>
          <button disabled={busy} onClick={() => void useLaptopBuddy()}>
            {busy ? <LoaderCircle size={13} className="spin" /> : <Plus size={13} />}
            Use laptop buddy
          </button>
        </div>
        <small>Replaces the selected animation with a slow blink. Adjust its timing below.</small>
      </section>
      {notice && (
        <p className="studio-notice" role="status">
          {notice}
        </p>
      )}
      <button
        className="animation-add"
        disabled={busy || (clip?.frames.length || 0) >= MAX_FRAMES}
        onClick={() => input.current?.click()}
      >
        {busy ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}
        {busy ? 'Preparing frames…' : 'Add frames'}
        <small>
          {clip?.frames.length || 0}/{MAX_FRAMES}
        </small>
      </button>
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        aria-label="Animation frame files"
        onChange={(event) => void upload(Array.from(event.target.files || []))}
      />
      <p className="image-transparency-note">
        PNG, JPG, or WebP · up to 8 MB each. Use matching canvas sizes and transparent backgrounds
        to keep your pet steady. Frames play from left to right.
      </p>
      {clip && (
        <>
          <div className="animation-preview">
            <div className="animation-preview-pet" data-testid="animation-preview">
              <Pet
                design={previewDesign!}
                action={pose === 'idle' ? undefined : pose}
                playbackId={restart}
                animationPlaying={playing}
              />
            </div>
            <div>
              <strong>{poseTitle(pose)} preview</strong>
              <span>
                {clip.frames.length} {clip.frames.length === 1 ? 'frame' : 'frames'}
              </span>
              <button
                onClick={() => {
                  setPlaying(!playing);
                  setRestart((n) => n + 1);
                }}
              >
                {playing ? <Pause size={12} /> : <Play size={12} />}
                {playing ? 'Stop preview' : 'Play preview'}
              </button>
            </div>
          </div>
          <div className="animation-frames" aria-label="Animation frames">
            {clip.frames.map((frame, index) => (
              <div className="animation-frame" key={frame.id}>
                <div className="animation-frame-image">
                  <span>{index + 1}</span>
                  <img src={frame.image} alt={`Frame ${index + 1}`} draggable={false} />
                </div>
                <label>
                  <TimingInput
                    label={`Frame ${index + 1} duration in milliseconds`}
                    value={frame.duration}
                    min={40}
                    max={5000}
                    disabled={busy}
                    onChange={(duration) =>
                      edit((previous) => ({
                        ...previous,
                        frames: previous.frames.map((f) =>
                          f.id === frame.id ? { ...f, duration } : f,
                        ),
                      }))
                    }
                  />
                  <span>ms</span>
                </label>
                <div className="animation-frame-tools">
                  <button
                    aria-label={`Move frame ${index + 1} earlier`}
                    disabled={busy || index === 0}
                    onClick={() =>
                      edit((previous) => {
                        const frames = [...previous.frames];
                        [frames[index - 1], frames[index]] = [frames[index], frames[index - 1]];
                        return { ...previous, frames };
                      })
                    }
                  >
                    <ArrowLeft size={12} />
                  </button>
                  <button
                    aria-label={`Move frame ${index + 1} later`}
                    disabled={busy || index === clip.frames.length - 1}
                    onClick={() =>
                      edit((previous) => {
                        const frames = [...previous.frames];
                        [frames[index + 1], frames[index]] = [frames[index], frames[index + 1]];
                        return { ...previous, frames };
                      })
                    }
                  >
                    <ArrowRight size={12} />
                  </button>
                  <button
                    aria-label={`Remove frame ${index + 1}`}
                    disabled={busy}
                    onClick={() =>
                      edit((previous) => {
                        const frames = previous.frames.filter((f) => f.id !== frame.id);
                        return frames.length ? { ...previous, frames } : undefined;
                      })
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="animation-settings">
            <label>
              <input
                type="checkbox"
                checked={clip.enabled}
                disabled={busy}
                onChange={(event) => edit((c) => ({ ...c, enabled: event.target.checked }))}
              />
              Use this animation on my pet
            </label>
            <label>
              <input
                type="checkbox"
                checked={clip.loop}
                disabled={busy}
                onChange={(event) => edit((c) => ({ ...c, loop: event.target.checked }))}
              />
              Repeat animation
            </label>
            <label className="animation-pause">
              Pause between repeats
              <span>
                <TimingInput
                  label="Pause between repeats in milliseconds"
                  value={clip.pauseMs}
                  min={0}
                  max={15000}
                  disabled={busy || !clip.loop}
                  onChange={(pauseMs) => edit((c) => ({ ...c, pauseMs }))}
                />
                ms
              </span>
            </label>
            <small>
              During the pause, your pet holds frame 1. Without repeat, it holds the last frame
              until the reaction ends. Reduced motion uses a still frame.
            </small>
            <button
              className="blink-preset"
              disabled={busy}
              onClick={() =>
                edit((c) => ({
                  ...c,
                  enabled: true,
                  loop: true,
                  pauseMs: 3000,
                  frames: c.frames.map((f) => ({ ...f, duration: 100 })),
                }))
              }
            >
              Use blink timing · 100 ms + 3 s pause
            </button>
          </div>
          <p className="animation-hint">
            {pose === 'idle'
              ? 'Idle plays automatically on your desktop pet. Pick another pose above to animate a key reaction.'
              : `Choose ${poseTitle(pose)} in Key reactions to play this sequence when you type its key.`}{' '}
            Save your pet to keep it in My Pets.
          </p>
        </>
      )}
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
