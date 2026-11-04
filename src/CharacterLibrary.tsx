import { useEffect, useRef, useState } from 'react';
import { Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { DEFAULT_REACTIONS, type SavedPet } from './model';
import { characterDesign, type LibraryCharacter } from './characterLibraryModel';
import {
  libraryEntries,
  featuredEntries,
  portraitFor,
  loadLibraryCharacter,
  type LibraryEntry,
} from './characterLibraryData';
import './character-library.css';

const poses = ['idle', 'blinking', 'typing', 'happy'] as const;
const PAGE_SIZE = 24;
export default function CharacterLibrary({
  onChoose,
  compact = false,
  onBrowseAll,
}: {
  onChoose: (pet: SavedPet) => void;
  compact?: boolean;
  onBrowseAll?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Record<string, (typeof poses)[number]>>({});
  const [artwork, setArtwork] = useState<Record<string, LibraryCharacter>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const active = useRef(true);
  const chooseHandler = useRef(onChoose);
  chooseHandler.current = onChoose;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const visible = libraryEntries.filter(
    (c) =>
      (category === 'All' || c.category === category) &&
      `${c.name} ${c.series}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const displayed = compact
    ? featuredEntries
    : visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const titleId = compact ? 'character-preview-title' : 'character-library-title';
  function goToPage(next: number) {
    setPage(next);
    requestAnimationFrame(() =>
      document.getElementById(titleId)?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      }),
    );
  }
  async function choose(entry: LibraryEntry) {
    setBusy(entry.id);
    setError('');
    try {
      const character = await loadLibraryCharacter(entry);
      if (active.current)
        chooseHandler.current({
          id: crypto.randomUUID(),
          design: characterDesign(character),
          reactions: DEFAULT_REACTIONS.map((r) => ({ ...r })),
        });
    } catch (cause) {
      if (active.current)
        setError(cause instanceof Error ? cause.message : 'Could not load this pet. Try again.');
    } finally {
      if (active.current) setBusy('');
    }
  }
  async function previewPose(entry: LibraryEntry, pose: (typeof poses)[number]) {
    setPreview((previous) => ({ ...previous, [entry.id]: pose }));
    setError('');
    if (artwork[entry.id] || pose === 'idle') return;
    try {
      const character = await loadLibraryCharacter(entry);
      if (active.current) setArtwork((previous) => ({ ...previous, [entry.id]: character }));
    } catch (cause) {
      if (active.current)
        setError(cause instanceof Error ? cause.message : 'Could not load this pose. Try again.');
    }
  }
  return (
    <section
      className={`character-library ${compact ? 'character-library--compact card' : ''}`}
      aria-labelledby={titleId}
      data-testid={compact ? 'character-library-preview' : undefined}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">FIND YOUR NEXT COMPANION</span>
          <h2 id={titleId}>
            Character library <span className="character-count">{libraryEntries.length} pets</span>
          </h2>
          <p>
            {compact
              ? 'A few favorites from our growing collection. Choose a buddy for your next typing session.'
              : 'Anime favorites, game friends, and our original laptop buddy. Every pet has idle, blinking, typing, and happy poses.'}
          </p>
        </div>
        {compact && (
          <button
            type="button"
            className="button preview-button browse-library"
            disabled={Boolean(busy)}
            onClick={onBrowseAll}
          >
            Browse all {libraryEntries.length} pets <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      {!compact && (
        <>
          <div className="character-library-tools">
            <label className="character-search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search characters</span>
              <input
                type="search"
                aria-label="Search characters"
                placeholder="Search characters or series…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <div className="character-filters" aria-label="Character categories">
              {['All', 'Original', 'Anime', 'Game'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="button"
                  aria-pressed={category === value}
                  onClick={() => {
                    setCategory(value);
                    setPage(1);
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <p className="character-results" role="status">
            {visible.length} companions to meet · Page {currentPage} of {pages}
          </p>
          {!visible.length && <p>No companions match. Try another name or category.</p>}
        </>
      )}
      {error && (
        <p className="character-load-error" role="alert">
          {error}
        </p>
      )}
      <div className="pet-library">
        {displayed.map((entry) => {
          const pose = preview[entry.id] || 'idle';
          return (
            <div className="card character-card" key={entry.id} data-character-id={entry.id}>
              <div className="character-scene">
                <span className="saved-sparkle" aria-hidden="true">
                  ✦
                </span>
                <img
                  src={artwork[entry.id]?.poses[pose] || portraitFor(entry)}
                  alt={`${entry.name} ${pose} pose`}
                  width="192"
                  height="192"
                  loading="lazy"
                  draggable={false}
                />
                <span className="saved-heart" aria-hidden="true">
                  ♡
                </span>
              </div>
              <div className="saved-pet-info">
                <span className="eyebrow">{entry.category}</span>
                <h3>{entry.name}</h3>
                <p className="character-series">{entry.series}</p>
                {!compact && (
                  <div className="character-poses" role="group" aria-label={`${entry.name} poses`}>
                    {poses.map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={pose === value}
                        onClick={() => void previewPose(entry, value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="button preview-button"
                  aria-label={`Choose ${entry.name}`}
                  disabled={Boolean(busy)}
                  onClick={() => void choose(entry)}
                >
                  {busy === entry.id ? 'Loading…' : compact ? 'Choose pet' : `Choose ${entry.name}`}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!compact && (
        <>
          {pages > 1 && (
            <nav className="library-pagination" aria-label="Library pages">
              <button
                type="button"
                className="button preview-button"
                aria-label="Previous library page"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Previous
              </button>
              <span>
                Page {currentPage} of {pages}
              </span>
              <button
                type="button"
                className="button preview-button"
                aria-label="Next library page"
                disabled={currentPage === pages}
                onClick={() => goToPage(currentPage + 1)}
              >
                Next
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </nav>
          )}
          <p className="character-credit">
            Original stylized fan art. Character names belong to their respective creators. Laptop
            buddy uses the artwork bundled with KeyCritter.
          </p>
        </>
      )}
    </section>
  );
}
