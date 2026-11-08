import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Image, ChevronDown, Check, Upload } from 'lucide-react';
import type { PetDesign } from './Pet';
import {
  backgrounds,
  backgroundFor,
  backgroundImageFor,
  characterSource,
  suitsCharacter,
} from './backgrounds';
import { libraryEntries } from './characterLibraryData';
import { prepareBackgroundImage } from './backgroundUpload';
import './backgrounds.css';

export default function BackgroundPicker({
  design,
  onChange,
}: {
  design: PetDesign;
  onChange: Dispatch<SetStateAction<PetDesign>>;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  useEffect(() => {
    request.current++;
    setUploading(false);
    setError('');
  }, [design.libraryCharacterId, design.name, design.images?.idle]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  function selectBackground(id: string) {
    request.current++;
    setUploading(false);
    setError('');
    onChange((current) => ({ ...current, backgroundId: id, backgroundImage: undefined }));
  }
  async function upload(file: File) {
    const ticket = ++request.current;
    setUploading(true);
    setError('');
    try {
      const image = await prepareBackgroundImage(file);
      if (ticket !== request.current) return;
      onChange((current) =>
        current.libraryCharacterId !== design.libraryCharacterId ||
        current.name !== design.name ||
        current.images?.idle !== design.images?.idle
          ? current
          : { ...current, backgroundImage: image },
      );
    } catch (cause) {
      if (ticket === request.current)
        setError(cause instanceof Error ? cause.message : 'Could not upload this background.');
    } finally {
      if (ticket === request.current) setUploading(false);
    }
  }
  const [collection, setCollection] = useState('Suggested');
  const [series, setSeries] = useState('All');
  const source = characterSource(design);
  const selected = backgroundFor(design.backgroundId);
  const selectedName = design.backgroundImage ? 'Uploaded background' : selected.name;
  const suggested = backgrounds.filter((background) => suitsCharacter(background, design));
  const effectiveCollection = collection === 'Suggested' && !suggested.length ? 'All' : collection;
  const inCollection = backgrounds.filter(
    (background) =>
      effectiveCollection === 'All' ||
      (effectiveCollection === 'Suggested'
        ? background.id === 'cozy-room' || suitsCharacter(background, design)
        : background.categories.includes(effectiveCollection)),
  );
  const seriesOptions = [...new Set(inCollection.flatMap((background) => background.series))]
    .filter(
      (value) =>
        !['Anime', 'Game'].includes(effectiveCollection) ||
        libraryEntries.some(
          (entry) =>
            entry.category === effectiveCollection &&
            (entry.franchise === value || entry.series === value),
        ),
    )
    .sort((a, b) => a.localeCompare(b));
  const effectiveSeries = seriesOptions.includes(series) ? series : 'All';
  const visible = inCollection.filter(
    (background) => effectiveSeries === 'All' || background.series.includes(effectiveSeries),
  );
  return (
    <section className="card background-picker" aria-label="Room backgrounds">
      <button
        className="background-picker-toggle"
        type="button"
        aria-label="Change background"
        aria-expanded={open}
        aria-controls="background-choices"
        onClick={() => setOpen(!open)}
      >
        <span className="heading-icon lavender">
          <Image size={19} aria-hidden="true" />
        </span>
        <span>
          <strong>Change background</strong>
          <small>{selectedName}</small>
        </span>
        <ChevronDown
          size={18}
          className={open ? 'background-chevron open' : 'background-chevron'}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id="background-choices">
          <p className="background-intro">
            {source && suggested.length
              ? `Scenes inspired by ${source.series}, plus other worlds to explore.`
              : 'Find a little corner from your favourite anime or game.'}{' '}
            Your choice saves with this pet.
          </p>
          <div className="background-upload">
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload background image"
              hidden
              disabled={uploading}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void upload(file);
              }}
            />
            <button
              type="button"
              className="button"
              disabled={uploading}
              onClick={() => input.current?.click()}
            >
              <Upload size={15} aria-hidden="true" />
              {uploading ? 'Preparing background…' : 'Upload your own background'}
            </button>
            <small>PNG, JPG, or WebP · up to 8 MB. Saved with your pet.</small>
            {uploading && <p role="status">Preparing your background…</p>}
            {error && (
              <p role="alert" className="background-upload-error">
                {error}
              </p>
            )}
            {design.backgroundImage && (
              <div className="background-custom-preview">
                <img src={design.backgroundImage} alt="Your uploaded background" />
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    request.current++;
                    setUploading(false);
                    setError('');
                    onChange((current) => ({ ...current, backgroundImage: undefined }));
                  }}
                >
                  Remove uploaded background
                </button>
              </div>
            )}
          </div>
          <div className="background-filters" role="group" aria-label="Background collections">
            {['Suggested', 'All', 'Anime', 'Game', 'Cozy']
              .filter((value) => value !== 'Suggested' || suggested.length > 0)
              .map((value) => (
                <button
                  type="button"
                  className="button"
                  key={value}
                  aria-pressed={effectiveCollection === value}
                  onClick={() => {
                    setCollection(value);
                    setSeries('All');
                  }}
                >
                  {value === 'Suggested'
                    ? `For ${source?.name}`
                    : value === 'All'
                      ? 'All backgrounds'
                      : value}
                </button>
              ))}
          </div>
          {seriesOptions.length > 0 && (
            <label className="background-series-label">
              Anime / game series
              <select
                aria-label="Background series"
                value={effectiveSeries}
                onChange={(event) => setSeries(event.target.value)}
              >
                <option value="All">All series</option>
                {seriesOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="background-status" role="status">
            {selectedName} selected · {visible.length} backgrounds to explore
          </p>
          <div className="background-grid">
            {visible.map((background) => (
              <button
                type="button"
                key={background.id}
                className="background-option"
                aria-label={`Use ${background.name} background`}
                aria-pressed={!design.backgroundImage && selected.id === background.id}
                onClick={() => selectBackground(background.id)}
              >
                <img
                  src={backgroundImageFor(background.id)}
                  alt=""
                  width="240"
                  height="150"
                  loading="lazy"
                />
                <span>
                  {background.name}
                  {!design.backgroundImage && selected.id === background.id && (
                    <Check size={15} aria-hidden="true" />
                  )}
                </span>
              </button>
            ))}
          </div>
          {(design.backgroundImage || selected.id !== 'cozy-room') && (
            <button
              type="button"
              className="button background-reset"
              onClick={() => selectBackground('cozy-room')}
            >
              Reset to cozy room
            </button>
          )}
          <p className="background-note">
            Choose a series-inspired scene or upload your own. The evening light works with both.
          </p>
        </div>
      )}
    </section>
  );
}
