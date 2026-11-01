import { useEffect, useRef, useState } from 'react';
import { GripHorizontal, Palette, Pause, Play } from 'lucide-react';
import Pet from './Pet';
import type { DesktopReaction, DesktopState } from './desktop';

export default function DesktopPet({ initial }: { initial: DesktopState }) {
  const [state, setState] = useState(initial);
  const [reaction, setReaction] = useState<DesktopReaction & { n: number }>({
    action: 'cheer',
    phrase: 'Hello, friend!',
    n: 0,
  });
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('Hello, friend!');
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moveable = {
    onMouseEnter: () => window.keycritter!.setInteractive(true),
    onMouseLeave: () => window.keycritter!.setInteractive(false),
  };
  useEffect(() => {
    const offState = window.keycritter!.onState(setState);
    const offReaction = window.keycritter!.onReaction((next) => {
      setReaction((previous) => ({ ...next, n: previous.n + 1 }));
      setActive(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(false), next.action === 'tap' ? 220 : 1800);
      // Ordinary typing doesn't reset an expressive reaction's speech bubble.
      if (next.phrase) {
        setMessage(next.phrase);
        clearTimeout(speechTimer.current);
        speechTimer.current = setTimeout(() => setMessage(''), 2600);
      }
    });
    speechTimer.current = setTimeout(() => setMessage(''), 3000);
    return () => {
      offState();
      offReaction();
      clearTimeout(timer.current);
      clearTimeout(speechTimer.current);
    };
  }, []);
  async function toggle() {
    try {
      setState(await window.keycritter!.setEnabled(!state.listening));
      setError('');
    } catch {
      setError('Open the designer to reconnect.');
    }
  }
  const name = state.pet.design.name.trim() || 'Your buddy';
  const action = active ? reaction.action : undefined;
  return (
    <main className="desktop-companion" aria-label={`${name}, your desktop companion`}>
      <div
        className="companion-content"
        style={{ '--companion-scale': state.pet.design.size / 100 } as React.CSSProperties}
      >
        {message && (
          <div className="companion-bubble" key={message}>
            {message}
          </div>
        )}
        <div className="companion-sprite" {...moveable}>
          <div
            key={reaction.n}
            className={`pet-animated ${action || 'idle'}`}
            data-testid="desktop-pet"
            data-action={action || 'idle'}
          >
            <Pet design={state.pet.design} action={action === 'tap' ? undefined : action} />
          </div>
        </div>
        <div className="companion-shadow" />
      </div>
      <div className="companion-dock" {...moveable}>
        <div className="companion-drag" title="Drag to move your pet">
          <GripHorizontal size={12} />
          <span>{name}</span>
          <span className={`companion-dot ${state.listening ? 'on' : ''}`} />
          <span>{state.starting ? 'starting' : state.listening ? 'listening' : 'paused'}</span>
        </div>
        <div className="companion-buttons">
          <button
            aria-label={state.listening ? 'Pause desktop reactions' : 'Enable desktop reactions'}
            disabled={state.starting}
            onClick={toggle}
          >
            {state.listening ? <Pause size={12} /> : <Play size={12} />}
            {state.listening ? 'Pause' : 'Enable'}
          </button>
          <button
            aria-label="Open pet designer"
            onClick={() => {
              window
                .keycritter!.openDesigner()
                .catch(() => setError('Could not open designer. Use the tray menu.'));
            }}
          >
            <Palette size={12} />
            Designer
          </button>
        </div>
        {error && (
          <p className="companion-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
