import { useState } from 'react';
import { Image, ChevronDown, Check } from 'lucide-react';
import type { PetDesign } from './Pet';
import {
  backgrounds,
  backgroundFor,
  backgroundImageFor,
  characterSource,
  suitsCharacter,
} from './backgrounds';
import { libraryEntries } from './characterLibraryData';
import './backgrounds.css';

export default function BackgroundPicker({
  design,
  onChange,
}: {
  design: PetDesign;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [collection, setCollection] = useState('Suggested');
  const [series, setSeries] = useState('All');
  const source = characterSource(design);
  const selected = backgroundFor(design.backgroundId);
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
          <small>{selected.name}</small>
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
            {selected.name} selected · {visible.length} backgrounds to explore
          </p>
          <div className="background-grid">
            {visible.map((background) => (
              <button
                type="button"
                key={background.id}
                className="background-option"
                aria-label={`Use ${background.name} background`}
                aria-pressed={selected.id === background.id}
                onClick={() => onChange(background.id)}
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
                  {selected.id === background.id && <Check size={15} aria-hidden="true" />}
                </span>
              </button>
            ))}
          </div>
          {selected.id !== 'cozy-room' && (
            <button
              type="button"
              className="button background-reset"
              onClick={() => onChange('cozy-room')}
            >
              Reset to cozy room
            </button>
          )}
          <p className="background-note">
            Series-inspired artwork. The evening light control works with every scene.
          </p>
        </div>
      )}
    </section>
  );
}
