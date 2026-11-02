import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, Film, ImagePlus, KeyRound, LoaderCircle, Sparkles, Upload, X } from 'lucide-react';
import AnimationEditor from './AnimationEditor';
import type { PetDesign, PetPose } from './Pet';
import type { AIStatus } from './desktop';
import { IMAGE_SLOTS, preparePetImage } from './petImages';

const title = (slot: PetPose) =>
  slot === 'idle' ? 'Main image' : slot.charAt(0).toUpperCase() + slot.slice(1);
const MODELS = ['gpt-image-1.5', 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'];

export default function CustomPetStudio({
  design,
  onChange,
}: {
  design: PetDesign;
  onChange: Dispatch<SetStateAction<PetDesign>>;
}) {
  const [mode, setMode] = useState<'pixel' | 'upload' | 'animate' | 'ai'>(
    design.species === 'custom'
      ? Object.keys(design.animations || {}).length
        ? 'animate'
        : 'upload'
      : 'pixel',
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [slot, setSlot] = useState<PetPose>('idle');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(MODELS[0]);
  const [reference, setReference] = useState(true);
  const [key, setKey] = useState('');
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState<{ image: string; slot: PetPose } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uploadSlot = useRef<PetPose>('idle');
  const alive = useRef(true);
  const sequence = useRef(0);

  useEffect(() => {
    alive.current = true;
    window.keycritter
      ?.getAIStatus()
      .then((s) => {
        if (alive.current) setStatus(s);
      })
      .catch(() => {
        if (alive.current)
          setError('Could not read the AI connection. Reopen KeyCritter to reconnect.');
      });
    return () => {
      alive.current = false;
      sequence.current++;
      void window.keycritter?.cancelGeneration().catch(() => {});
    };
  }, []);

  function useImage(pose: PetPose, image: string) {
    onChange((current) => ({
      ...current,
      species: 'custom',
      accessory: 'none',
      images: { ...current.images, idle: current.images?.idle || image, [pose]: image },
      ...(current.animations?.[pose]
        ? {
            animations: {
              ...current.animations,
              [pose]: { ...current.animations[pose], enabled: false },
            },
          }
        : {}),
    }));
    setNotice(`${title(pose)} is ready. Try a key reaction!`);
    setError('');
  }
  async function upload(file: File, pose: PetPose) {
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const image = await preparePetImage(file);
      if (alive.current) useImage(pose, image);
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : 'The image could not be uploaded.');
    } finally {
      if (alive.current) setUploading(false);
      if (input.current) input.current.value = '';
    }
  }
  async function connect() {
    if (!window.keycritter) return;
    setConnecting(true);
    setError('');
    try {
      const result = await window.keycritter.setAIKey(key.trim(), remember);
      if (!result.ok) throw new Error(result.error);
      setStatus(result.status);
      setKey('');
      setNotice('API key saved. Its access will be checked when you generate an image.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the API connection.');
    } finally {
      setConnecting(false);
    }
  }
  async function disconnect() {
    try {
      const result = await window.keycritter!.disconnectAI();
      if (!result.ok) throw new Error(result.error);
      setStatus(result.status);
      setNotice('AI connection removed. Your pet images are still here.');
      setError('');
    } catch {
      setError('Could not disconnect. Try reopening KeyCritter.');
    }
  }
  async function generate() {
    if (!window.keycritter || working) return;
    setWorking(true);
    setError('');
    setNotice('');
    setPending(null);
    const id = ++sequence.current;
    try {
      const result = await window.keycritter.generateImage({
        prompt: prompt.trim(),
        pose: slot,
        model,
        ...(reference && design.images?.idle ? { reference: design.images.idle } : {}),
      });
      if (!result.ok) throw new Error(result.error);
      const image = await preparePetImage(result.image);
      if (alive.current && sequence.current === id) setPending({ image, slot });
    } catch (cause) {
      if (alive.current && sequence.current === id)
        setError(
          cause instanceof Error ? cause.message : 'Generation could not finish. Please try again.',
        );
    } finally {
      if (alive.current && sequence.current === id) setWorking(false);
    }
  }
  function cancel() {
    sequence.current++;
    setWorking(false);
    setNotice('Generation cancelled.');
    void window.keycritter
      ?.cancelGeneration()
      .catch(() => setError('Could not cancel the request. It will time out automatically.'));
  }

  return (
    <section className="custom-studio" data-mode={mode} aria-label="Pet image studio">
      <div className="pet-source-tabs" role="group" aria-label="Pet source">
        <button
          aria-pressed={mode === 'pixel'}
          disabled={working}
          onClick={() => {
            setMode('pixel');
            setError('');
            if (design.species === 'custom') onChange((d) => ({ ...d, species: 'cat' }));
          }}
        >
          <span>✦</span>Pixel pets
        </button>
        <button
          aria-pressed={mode === 'upload'}
          disabled={working}
          onClick={() => {
            setMode('upload');
            setError('');
            if (design.images?.idle) onChange((d) => ({ ...d, species: 'custom' }));
          }}
        >
          <Upload size={13} />
          Upload
        </button>
        <button
          aria-pressed={mode === 'animate'}
          disabled={working}
          onClick={() => {
            setMode('animate');
            setError('');
            if (design.images?.idle) onChange((d) => ({ ...d, species: 'custom' }));
          }}
        >
          <Film size={13} />
          Animate
        </button>
        <button
          aria-pressed={mode === 'ai'}
          disabled={working}
          onClick={() => {
            setMode('ai');
            setError('');
          }}
        >
          <Sparkles size={13} />
          Create with AI
        </button>
      </div>
      {mode === 'animate' && <AnimationEditor design={design} onChange={onChange} />}
      {mode === 'upload' && (
        <div className="upload-panel">
          <div className="studio-section-title">
            <ImagePlus size={15} />
            <h3>Make any little thing your buddy.</h3>
          </div>
          <p className="studio-description">
            Upload a main image, then optional expressions for each reaction. Missing poses use your
            main image with movement.
          </p>
          <button
            className="image-dropzone"
            disabled={uploading}
            onClick={() => {
              uploadSlot.current = 'idle';
              input.current?.click();
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && !uploading) void upload(file, 'idle');
            }}
            aria-label="Upload main pet image"
          >
            {design.images?.idle ? (
              <img src={design.images.idle} alt="Current main pet image" />
            ) : (
              <span className="upload-cloud">
                <Upload size={24} />
              </span>
            )}
            <span>
              <strong>
                {uploading
                  ? 'Preparing your image…'
                  : design.images?.idle
                    ? 'Change main image'
                    : 'Choose an image or drop it here'}
              </strong>
              <small>PNG, JPG, or WebP · up to 8 MB</small>
            </span>
          </button>
          <p className="image-transparency-note">
            Transparent images work best. Uploaded backgrounds stay in the image.
          </p>
          <div className="pose-grid">
            {IMAGE_SLOTS.filter((p) => p !== 'idle').map((pose) => (
              <div className="pose-tile" key={pose}>
                <button
                  disabled={uploading}
                  aria-label={`Upload ${title(pose)} image`}
                  onClick={() => {
                    uploadSlot.current = pose;
                    input.current?.click();
                  }}
                >
                  <span className="pose-thumbnail">
                    {design.images?.[pose] ? (
                      <img src={design.images[pose]} alt="" />
                    ) : (
                      <ImagePlus size={20} />
                    )}
                  </span>
                  <span>{title(pose)}</span>
                </button>
                {design.images?.[pose] && (
                  <button
                    className="pose-remove"
                    aria-label={`Remove ${title(pose)} image`}
                    onClick={() =>
                      onChange((current) => {
                        const images = { ...current.images };
                        delete images[pose];
                        return { ...current, images };
                      })
                    }
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Pet image file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file, uploadSlot.current);
            }}
          />
        </div>
      )}
      {mode === 'ai' && (
        <div className="ai-panel">
          <div className="studio-section-title">
            <Sparkles size={15} />
            <h3>Dream it. Meet it.</h3>
          </div>
          <p className="studio-description">
            Describe a new buddy, or create another pose for your current one.
          </p>
          {!window.keycritter ? (
            <div className="ai-desktop-note">
              <KeyRound size={17} />
              <span>
                AI generation is available in the Windows desktop app, where your API key stays
                outside the webpage. Image uploads work here too.
              </span>
            </div>
          ) : (
            <details className="ai-connection" open={!status?.configured}>
              <summary>
                <KeyRound size={13} />
                OpenAI connection
                <span className={status?.configured ? 'connection-good' : ''}>
                  {status?.configured ? (
                    <>
                      <Check size={11} />
                      Key saved
                    </>
                  ) : (
                    'Add API key'
                  )}
                </span>
              </summary>
              {status?.configured ? (
                <div className="ai-connected">
                  <p>
                    {status.remembered
                      ? 'Key encrypted with your operating system.'
                      : 'Session-only key. It is removed when you quit KeyCritter.'}
                  </p>
                  <button className="text-button" onClick={disconnect}>
                    Disconnect and remove key
                  </button>
                </div>
              ) : (
                <div className="ai-key-fields">
                  <label htmlFor="openai-key">OpenAI API key</label>
                  <input
                    id="openai-key"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Paste your API key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                  />
                  <label className="studio-checkbox">
                    <input
                      type="checkbox"
                      checked={remember}
                      disabled={!status?.canRemember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember securely on this computer
                  </label>
                  {status && !status.canRemember && (
                    <small>
                      Secure key storage is unavailable here. The key will be kept for this session
                      only.
                    </small>
                  )}
                  <button
                    className="button preview-button"
                    disabled={connecting || key.trim().length < 20}
                    onClick={connect}
                  >
                    {connecting ? 'Saving…' : 'Save API key'}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      void window
                        .keycritter!.openAIKeyPage()
                        .catch(() =>
                          setError(
                            'Open platform.openai.com/api-keys in your browser to create a key.',
                          ),
                        );
                    }}
                  >
                    Get an OpenAI API key ↗
                  </button>
                </div>
              )}
            </details>
          )}
          <label className="studio-label" htmlFor="pet-prompt">
            Describe your buddy
          </label>
          <textarea
            id="pet-prompt"
            maxLength={1500}
            rows={3}
            placeholder="A tiny lavender dragon with round glasses and a star-shaped tail, soft pixel art…"
            value={prompt}
            disabled={working}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="ai-selects">
            <label>
              Generate for
              <select
                aria-label="Generate image for pose"
                value={slot}
                disabled={working}
                onChange={(e) => setSlot(e.target.value as PetPose)}
              >
                {IMAGE_SLOTS.map((pose) => (
                  <option key={pose} value={pose}>
                    {title(pose)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Image model
              <select
                aria-label="AI image model"
                value={model}
                disabled={working}
                onChange={(e) => setModel(e.target.value)}
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {design.images?.idle && (
            <label className="studio-checkbox">
              <input
                type="checkbox"
                checked={reference}
                disabled={working}
                onChange={(e) => setReference(e.target.checked)}
              />
              Use main image as a character reference
            </label>
          )}
          <p className="ai-billing-note">
            Each click requests one image from OpenAI. API billing is separate from ChatGPT. Your
            prompt{reference && design.images?.idle ? ' and reference image are' : ' is'} sent only
            when you generate. Typing activity is never sent.
          </p>
          <div className="ai-generate-actions">
            <button
              className="button primary"
              disabled={
                !window.keycritter || !status?.configured || prompt.trim().length < 3 || working
              }
              onClick={generate}
            >
              {working ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}
              {working ? 'Creating your buddy…' : 'Generate image'}
            </button>
            {working && (
              <button className="button preview-button" onClick={cancel}>
                Cancel
              </button>
            )}
          </div>
          {working && (
            <p className="studio-description" role="status">
              This can take a minute or two. You can cancel while you wait.
            </p>
          )}
          {pending && (
            <div className="generated-preview">
              <div className="generated-preview-image">
                <img src={pending.image} alt="Generated pet preview" />
              </div>
              <p>
                Preview for <strong>{title(pending.slot)}</strong>
              </p>
              <div>
                <button
                  className="button primary"
                  onClick={() => {
                    useImage(pending.slot, pending.image);
                    setPending(null);
                  }}
                >
                  <Check size={13} />
                  Use this image
                </button>
                <button className="button preview-button" onClick={() => setPending(null)}>
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      {notice && mode !== 'pixel' && (
        <p className="studio-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
