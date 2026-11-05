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
const extraPoses = [
  ['wave', 'Paw raise'],
  ['peace', 'Peace signs'],
  ['shy', 'Shy'],
  ['sleep', 'Desk nap'],
  ['tired', 'Tired'],
  ['drink', 'Drink'],
] as const;
const confidentPoses = [
  ['wave', 'Thumbs up'],
  ['peace', 'Casual V sign'],
  ['shy', 'Head scratch'],
  ['sleep', 'Folded-arm nap'],
  ['tired', 'Neck stretch'],
  ['drink', 'Drink'],
] as const;
type PreviewPose = (typeof poses)[number] | (typeof extraPoses)[number][0];
const PAGE_SIZE = 24;
const categories = ['All', 'Anime', 'Game', 'Original'] as const;
export type LibraryCategory = (typeof categories)[number];
export default function CharacterLibrary({
  onChoose,
  compact = false,
  onBrowseAll,
  initialCategory = 'All',
}: {
  onChoose: (pet: SavedPet) => void;
  compact?: boolean;
  onBrowseAll?: (category: LibraryCategory) => void;
  initialCategory?: LibraryCategory;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LibraryCategory>(initialCategory);
  const [franchise, setFranchise] = useState('All');
  const [series, setSeries] = useState('All');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Record<string, PreviewPose>>({});
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
  const byType = libraryEntries.filter((c) => category === 'All' || c.category === category);
  const franchiseOptions = [...new Set(byType.map((c) => c.franchise))].sort((a, b) =>
    a.localeCompare(b),
  );
  const byFranchise = byType.filter((c) => franchise === 'All' || c.franchise === franchise);
  const seriesOptions = [...new Set(byFranchise.map((c) => c.series))].sort((a, b) =>
    a.localeCompare(b),
  );
  const visible = byFranchise.filter(
    (c) =>
      (series === 'All' || c.series === series) &&
      `${c.name} ${c.series} ${c.franchise}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  if (sort === 'name')
    visible.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );
  if (sort === 'series')
    visible.sort(
      (a, b) =>
        a.franchise.localeCompare(b.franchise) ||
        a.series.localeCompare(b.series) ||
        a.name.localeCompare(b.name),
    );
  const filtering = Boolean(
    query || category !== 'All' || franchise !== 'All' || series !== 'All' || sort !== 'featured',
  );
  function clearFilters() {
    setQuery('');
    setCategory('All');
    setFranchise('All');
    setSeries('All');
    setSort('featured');
    setPage(1);
  }
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const displayed = compact
    ? category === 'All'
      ? featuredEntries
      : [
          ...featuredEntries.filter((entry) => entry.category === category),
          ...byType.filter(
            (entry) => !featuredEntries.some((featured) => featured.id === entry.id),
          ),
        ].slice(0, 8)
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
  async function previewPose(entry: LibraryEntry, pose: PreviewPose) {
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
              ? 'Choose Anime or Game, then pick a character to be your typing buddy.'
              : 'Anime favorites, game friends, and our original laptop buddy. Ten poses each, from a little desk nap to a happy peace sign.'}
          </p>
        </div>
        {compact && (
          <button
            type="button"
            className="button preview-button browse-library"
            disabled={Boolean(busy)}
            onClick={() => onBrowseAll?.(category)}
          >
            Browse all {libraryEntries.length} pets <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="character-category-picker">
        <span className="character-category-label">Choose your character</span>
        <div className="character-filters" role="group" aria-label="Character categories">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              className="button"
              aria-label={value}
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
                setFranchise('All');
                setSeries('All');
                setPage(1);
              }}
            >
              {value === 'All'
                ? 'All characters'
                : value === 'Original'
                  ? 'Original pet'
                  : `${value} characters`}
              <span className="category-count" aria-hidden="true">
                {value === 'All'
                  ? libraryEntries.length
                  : libraryEntries.filter((entry) => entry.category === value).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      {compact && (
        <p className="character-results" role="status">
          {category === 'All'
            ? 'Featured companions'
            : `${byType.length} ${category.toLowerCase()} ${category === 'Original' ? 'pet' : 'characters'} · Showing ${displayed.length}`}
        </p>
      )}
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
          </div>
          <div className="library-classification" aria-label="Classify characters">
            <label>
              Franchise / collection
              <select
                aria-label="Filter by franchise"
                value={franchise}
                onChange={(e) => {
                  setFranchise(e.target.value);
                  setSeries('All');
                  setPage(1);
                }}
              >
                <option value="All">All franchises ({byType.length})</option>
                {franchiseOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} ({byType.filter((c) => c.franchise === value).length})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Series
              <select
                aria-label="Filter by series"
                value={series}
                onChange={(e) => {
                  setSeries(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All series ({byFranchise.length})</option>
                {seriesOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} ({byFranchise.filter((c) => c.series === value).length})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select
                aria-label="Sort characters"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="featured">Library order</option>
                <option value="name">Name A–Z</option>
                <option value="series">Franchise and series A–Z</option>
              </select>
            </label>
            {filtering && (
              <button type="button" className="button preview-button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
          <p className="classification-summary">
            {franchise === 'All'
              ? `${franchiseOptions.length} franchises and collections · ${seriesOptions.length} series in this category`
              : `${seriesOptions.length} series in ${franchise}`}
          </p>
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
          const expressions = entry.poseStyle === 'confident' ? confidentPoses : extraPoses;
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
                <p className="character-series">
                  {entry.franchise !== entry.series
                    ? `${entry.franchise} · ${entry.series}`
                    : entry.series}
                </p>
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
                    <select
                      className="character-extra-poses"
                      aria-label={`More poses for ${entry.name}`}
                      value={expressions.some(([value]) => value === pose) ? pose : ''}
                      onChange={(event) => {
                        if (event.target.value)
                          void previewPose(entry, event.target.value as PreviewPose);
                      }}
                    >
                      <option value="">More poses…</option>
                      {expressions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
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
