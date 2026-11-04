import { useEffect, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { DEFAULT_REACTIONS, type SavedPet } from './model';
import './character-library.css';

import { characterDesign, type LibraryCharacter } from './characterLibraryModel';
const poses = ['idle', 'blinking', 'typing', 'happy'] as const;
export default function CharacterLibrary({
  onChoose,
  compact = false,
  onBrowseAll,
}: {
  onChoose: (pet: SavedPet) => void;
  compact?: boolean;
  onBrowseAll?: () => void;
}) {
  const [characters, setCharacters] = useState<LibraryCharacter[]>([]);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [preview, setPreview] = useState<Record<string, (typeof poses)[number]>>({});
  useEffect(() => {
    let active = true;
    void import('./assets/character-library/characters.json')
      .then(({ default: data }) => {
        if (active) setCharacters(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const visible = characters.filter(
    (c) =>
      (category === 'All' || c.category === category) &&
      `${c.name} ${c.series}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const displayed = compact ? [characters[0], ...characters.slice(-7)].filter(Boolean) : visible;
  const titleId = compact ? 'character-preview-title' : 'character-library-title';
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
            Character library{' '}
            <span className="character-count">
              {characters.length ? `${characters.length} pets` : 'Loading…'}
            </span>
          </h2>
          <p>
            {compact
              ? 'New arrivals and a familiar friend. Choose a buddy for your next typing session.'
              : 'Anime favorites, game friends, and our original laptop buddy. Every pet has idle, blinking, typing, and happy poses.'}
          </p>
        </div>
        {compact && (
          <button
            type="button"
            className="button preview-button browse-library"
            onClick={onBrowseAll}
          >
            Browse all {characters.length || ''} pets <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      {!compact && (
        <div className="character-library-tools">
          <label className="character-search">
            <Search size={17} />
            <span className="sr-only">Search characters</span>
            <input
              type="search"
              aria-label="Search characters"
              placeholder="Search characters or series…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="character-filters" aria-label="Character categories">
            {['All', 'Original', 'Anime', 'Game'].map((value) => (
              <button
                key={value}
                type="button"
                className="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
      {(!compact || error) && (
        <p className="character-results" role="status">
          {error
            ? 'The library could not load. Reload the page to try again.'
            : characters.length
              ? `${visible.length} companions to meet`
              : 'Loading companions…'}
        </p>
      )}
      {!compact && characters.length > 0 && !visible.length && (
        <p>No companions match. Try another name or category.</p>
      )}
      <div className="pet-library">
        {displayed.map((character) => {
          const pose = preview[character.id] || 'idle';
          return (
            <div
              className="card character-card"
              key={character.id}
              data-character-id={character.id}
            >
              <div className="character-scene">
                <span className="saved-sparkle" aria-hidden="true">
                  ✦
                </span>
                <img
                  src={character.poses[pose]}
                  alt={`${character.name} ${pose} pose`}
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
                <span className="eyebrow">{character.category}</span>
                <h3>{character.name}</h3>
                <p className="character-series">{character.series}</p>
                {!compact && (
                  <div
                    className="character-poses"
                    role="group"
                    aria-label={`${character.name} poses`}
                  >
                    {poses.map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={pose === value}
                        onClick={() =>
                          setPreview((previous) => ({ ...previous, [character.id]: value }))
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  aria-label={`Choose ${character.name}`}
                  className="button preview-button"
                  type="button"
                  onClick={() =>
                    onChoose({
                      id: crypto.randomUUID(),
                      design: characterDesign(character),
                      reactions: DEFAULT_REACTIONS.map((r) => ({ ...r })),
                    })
                  }
                >
                  {compact ? 'Choose pet' : `Choose ${character.name}`}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!compact && (
        <p className="character-credit">
          Original stylized fan art. Character names belong to their respective creators. Laptop
          buddy uses the artwork bundled with KeyCritter.
        </p>
      )}
    </section>
  );
}
