import { useEffect, useState } from 'react';
import { Monitor, Pause, Play, X, Pin } from 'lucide-react';
import type { PetDesign } from './Pet';
import type { Reaction } from './model';
import type { DesktopState } from './desktop';

export default function DesktopPanel({
  initial,
  design,
  reactions,
}: {
  initial: DesktopState;
  design: PetDesign;
  reactions: Reaction[];
}) {
  const [state, setState] = useState(initial);
  const [syncError, setSyncError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => window.keycritter!.onState(setState), []);
  useEffect(() => {
    const timer = setTimeout(() => {
      window
        .keycritter!.updatePet({ design, reactions })
        .then(() => setSyncError(''))
        .catch(() =>
          setSyncError('Could not sync your changes to the desktop pet. Try reopening KeyCritter.'),
        );
    }, 120);
    return () => clearTimeout(timer);
  }, [design, reactions]);
  async function toggle() {
    setBusy(true);
    try {
      setState(await window.keycritter!.setEnabled(!state.listening));
    } catch {
      setSyncError('Could not change keyboard reactions. Try reopening KeyCritter.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card desktop-panel" aria-label="Desktop companion controls">
      <div className="desktop-panel-icon">
        <Monitor size={23} />
      </div>
      <div className="desktop-panel-copy">
        <div className="desktop-panel-title">
          <h2>Your desktop, a little friendlier.</h2>
          <span className={`desktop-status ${state.listening ? 'on' : ''}`}>
            <span className="green-dot" />
            {state.starting ? 'Starting…' : state.listening ? 'Reactions on' : 'Reactions paused'}
          </span>
        </div>
        <p>
          {state.listening
            ? 'Your buddy reacts while you type in other apps. Typed text is never saved or sent anywhere.'
            : 'Enable reactions to let your pet respond while you type in other apps. Reactions start paused each time you launch KeyCritter.'}
        </p>
        <small>
          Click and hold the name bar beneath your floating pet, then drag it to move around your
          screen. Its position is saved. Closing this designer keeps the pet in your system tray.
        </small>
      </div>
      <div className="desktop-panel-actions">
        <button
          className={`button ${state.pinned ? 'preview-button' : 'primary'}`}
          aria-label="Pin pet above apps"
          aria-pressed={state.pinned}
          onClick={() => {
            window
              .keycritter!.setPinned(!state.pinned)
              .then(setState)
              .catch(() => setSyncError('Could not change the pet pin. Try Show pet again.'));
          }}
        >
          <Pin size={14} />
          {state.pinned ? 'Pinned above apps' : 'Pin above apps'}
        </button>
        <button
          className={`button ${state.listening ? 'preview-button' : 'primary'}`}
          disabled={state.starting || busy}
          onClick={toggle}
        >
          {state.listening ? <Pause size={14} /> : <Play size={14} />}
          {state.starting
            ? 'Starting…'
            : state.listening
              ? 'Pause reactions'
              : 'Enable keyboard reactions'}
        </button>
        <button
          className="button preview-button"
          onClick={() => {
            window
              .keycritter!.showPet()
              .catch(() =>
                setSyncError('Could not show the desktop pet. Try reopening KeyCritter.'),
              );
          }}
        >
          <Monitor size={14} />
          Show pet
        </button>
        <button
          className="icon-button"
          aria-label="Quit KeyCritter"
          title="Quit KeyCritter"
          onClick={() => {
            void window.keycritter!.quit();
          }}
        >
          <X size={17} />
        </button>
      </div>
      {(state.error || syncError) && (
        <p className="desktop-error" role="alert">
          {syncError || state.error}
        </p>
      )}
      <div className="desktop-key-note">
        Custom desktop letter and symbol triggers use US keyboard positions. Ordinary typing gives
        your pet a little bounce.
      </div>
    </section>
  );
}
