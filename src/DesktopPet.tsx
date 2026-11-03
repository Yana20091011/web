import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { GripHorizontal, Palette, Pause, Play, Pin, PinOff } from 'lucide-react';
import Pet from './Pet';
import { reactionDuration } from './framePlayback';
import { usePetMotion } from './usePetMotion';
import type { DesktopReaction, DesktopState } from './desktop';

export default function DesktopPet({ initial }: { initial: DesktopState }) {
  const [state, setState] = useState(initial);
  const [reaction, setReaction] = useState<DesktopReaction & { n: number }>({
    action: 'cheer',
    phrase: 'Hello, friend!',
    n: 0,
  });
  const [active, setActive] = useState(false);
  const petMotion = usePetMotion(reaction.n);
  const latestState = useRef(state);
  latestState.current = state;
  const [message, setMessage] = useState('Hello, friend!');
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragging = useRef(false);
  function stopDrag(event: PointerEvent<HTMLDivElement>, keepInteractive: boolean) {
    if (!dragging.current) return;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    void window
      .keycritter!.endDrag(keepInteractive)
      .catch(() => setError('Could not finish moving the pet. Try again.'));
  }
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
      timer.current = setTimeout(
        () => setActive(false),
        next.action === 'tap'
          ? 220
          : reactionDuration(latestState.current.pet.design, next.action, 1800),
      );
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
            ref={petMotion}
            className={`pet-animated ${action || 'idle'}`}
            data-testid="desktop-pet"
            data-action={action || 'idle'}
            data-motion-strength={state.pet.design.motionStrength ?? 100}
            style={
              {
                '--motion-strength': (state.pet.design.motionStrength ?? 100) / 100,
              } as React.CSSProperties
            }
          >
            <Pet
              design={state.pet.design}
              action={action === 'tap' ? undefined : action}
              typing={action === 'tap'}
              playbackId={reaction.n}
            />
          </div>
        </div>
        <div className="companion-shadow" />
      </div>
      <div className="companion-dock" {...moveable}>
        <div
          className="companion-drag"
          title="Drag to move your pet"
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary || dragging.current) return;
            event.preventDefault();
            const element = event.currentTarget;
            const pointer = event.pointerId;
            element.setPointerCapture(pointer);
            dragging.current = true;
            const bounds = element.getBoundingClientRect();
            void window
              .keycritter!.startDrag({
                x: (bounds.left + bounds.width / 2) / innerWidth,
                y: (bounds.top + bounds.height / 2) / innerHeight,
              })
              .catch(() => {
                dragging.current = false;
                if (element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
                setError('Could not start moving the pet. Try again.');
              });
          }}
          onPointerMove={(event) => {
            if (dragging.current && event.pointerType === 'mouse' && event.buttons === 0) {
              stopDrag(event, false);
              return;
            }
            if (dragging.current) window.keycritter!.moveDrag();
          }}
          onPointerUp={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            stopDrag(
              event,
              event.clientX >= bounds.left &&
                event.clientX <= bounds.right &&
                event.clientY >= bounds.top &&
                event.clientY <= bounds.bottom,
            );
          }}
          onPointerCancel={(event) => stopDrag(event, false)}
          onLostPointerCapture={(event) => stopDrag(event, false)}
        >
          <GripHorizontal size={12} />
          <span>{name}</span>
          <span className={`companion-dot ${state.listening ? 'on' : ''}`} />
          <span>{state.starting ? 'starting' : state.listening ? 'listening' : 'paused'}</span>
          <span className="companion-drag-hint">Drag to move</span>
        </div>
        <div className="companion-buttons">
          <button
            aria-label="Pin pet above apps"
            aria-pressed={state.pinned}
            title={state.pinned ? 'Pinned above app windows' : 'Keep pet above app windows'}
            onClick={() => {
              window
                .keycritter!.setPinned(!state.pinned)
                .then(setState)
                .catch(() => setError('Could not pin the pet. Try Show pet in the designer.'));
            }}
          >
            {state.pinned ? <Pin size={12} /> : <PinOff size={12} />}
            {state.pinned ? 'Pinned' : 'Pin'}
          </button>
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
