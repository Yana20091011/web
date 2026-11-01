import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Expand,
  Heart,
  Keyboard,
  Minimize,
  Moon,
  Palette,
  PawPrint,
  Pencil,
  Play,
  Plus,
  Save,
  Send,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import Pet, { type Accessory, type Action, type PetDesign, type Species } from './Pet';
import DesktopPanel from './DesktopPanel';
import CustomPetStudio from './CustomPetStudio';
import type { DesktopState } from './desktop';
import {
  ACTIONS,
  COLORS,
  DEFAULT_PET,
  DEFAULT_REACTIONS,
  keyLabel,
  normalizeKey,
  readDraft,
  readPets,
  type Reaction,
  type SavedPet,
} from './model';

const uid = () => crypto.randomUUID();

export default function App({ desktopState }: { desktopState?: DesktopState }) {
  const [initial] = useState(() =>
    desktopState ? { ...desktopState.pet, id: readDraft().id } : readDraft(),
  );
  const [design, setDesign] = useState<PetDesign>(initial.design);
  const [reactions, setReactions] = useState<Reaction[]>(initial.reactions);
  const [activeId, setActiveId] = useState<string | undefined>(initial.id);
  const [pets, setPets] = useState<SavedPet[]>(readPets);
  const [tab, setTab] = useState<'playground' | 'pets'>('playground');
  const [text, setText] = useState('');
  const [triggered, setTriggered] = useState(0);
  const [animation, setAnimation] = useState<{ action?: Action; n: number }>({ n: 0 });
  const [speech, setSpeech] = useState('You got this!');
  const [sound, setSound] = useState(false);
  const [night, setNight] = useState(false);
  const [focus, setFocus] = useState(false);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editorKey, setEditorKey] = useState('Enter');
  const [editorAction, setEditorAction] = useState<Action>('cheer');
  const [editorPhrase, setEditorPhrase] = useState('Nice work!');
  const [editorError, setEditorError] = useState('');
  const [deleteId, setDeleteId] = useState<string | undefined>();
  const [sessionStart, setSessionStart] = useState<number | undefined>();
  const [elapsed, setElapsed] = useState(0);
  const [typed, setTyped] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const keyInput = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const audio = useRef<AudioContext | null>(null);
  const modalCancel = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('keycritter-draft', JSON.stringify({ design, reactions, id: activeId }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [design, reactions, activeId]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3400);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (!sessionStart) return;
    const t = setInterval(() => setElapsed((Date.now() - sessionStart) / 1000), 1000);
    return () => clearInterval(t);
  }, [sessionStart]);
  useEffect(() => {
    if (!deleteId) return;
    previousFocus.current = document.activeElement as HTMLElement;
    modalCancel.current?.focus();
    return () => previousFocus.current?.focus();
  }, [deleteId]);

  const playSound = useCallback(
    (action: Action) => {
      if (!sound) return;
      try {
        const ctx = audio.current || new AudioContext();
        audio.current = ctx;
        void ctx.resume();
        const tones =
          action === 'surprise' ? [330, 260] : action === 'sleep' ? [330, 294] : [523, 659, 784];
        tones.forEach((frequency, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = frequency;
          const start = ctx.currentTime + i * 0.065;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.055, start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.18);
        });
      } catch {
        setSound(false);
        setToast('Sound is unavailable in this browser.');
      }
    },
    [sound],
  );

  const react = useCallback(
    (action: Action, phrase: string) => {
      clearTimeout(timer.current);
      setAnimation((a) => ({ action, n: a.n + 1 }));
      setSpeech(phrase || ACTIONS.find((a) => a.value === action)!.phrase);
      setTriggered((n) => n + 1);
      playSound(action);
      window.keycritter
        ?.preview({ action, phrase })
        .catch(() => setToast('Could not reach the desktop pet. Try Show pet.'));
      timer.current = setTimeout(() => {
        setAnimation((a) => ({ n: a.n }));
        setSpeech('You got this!');
      }, 2400);
    },
    [playSound],
  );

  const update = <K extends keyof PetDesign>(key: K, value: PetDesign[K]) =>
    setDesign((d) => ({ ...d, [key]: value }));
  const displayName = design.name.trim() || 'your buddy';

  function savePet() {
    if (!design.name.trim()) {
      setToast('Give your buddy a name before saving.');
      document.getElementById('pet-name')?.focus();
      return;
    }
    const id = activeId || uid();
    const saved = {
      id,
      design: { ...design, name: design.name.trim() },
      reactions: reactions.map((r) => ({ ...r })),
    };
    const next = pets.some((p) => p.id === id)
      ? pets.map((p) => (p.id === id ? saved : p))
      : [...pets, saved];
    try {
      localStorage.setItem('keycritter-pets', JSON.stringify(next));
      setPets(next);
      setActiveId(id);
      setDesign(saved.design);
      setToast(`${saved.design.name} is saved to My Pets!`);
    } catch {
      setToast('Could not save. Please allow browser storage and try again.');
    }
  }
  function newPet() {
    setDesign({ ...DEFAULT_PET, name: 'New buddy' });
    setReactions(DEFAULT_REACTIONS.map((r) => ({ ...r })));
    setActiveId(undefined);
    setText('');
    setTab('playground');
    resetEditor();
    setToast('A new friendship begins. Make this buddy yours!');
  }
  function loadPet(p: SavedPet) {
    setDesign({ ...p.design });
    setReactions(p.reactions.map((r) => ({ ...r })));
    setActiveId(p.id);
    setTab('playground');
    setText('');
    resetEditor();
    setToast(`${p.design.name} is ready to keep you company.`);
  }
  function deletePet() {
    const next = pets.filter((p) => p.id !== deleteId);
    try {
      localStorage.setItem('keycritter-pets', JSON.stringify(next));
      setPets(next);
      if (activeId === deleteId) setActiveId(undefined);
      setDeleteId(undefined);
      setToast('Pet removed from your collection.');
    } catch {
      setToast('Could not delete. Please allow browser storage and try again.');
    }
  }
  function resetEditor() {
    setEditingId(undefined);
    setEditorKey('Enter');
    setEditorAction('cheer');
    setEditorPhrase('Nice work!');
    setEditorError('');
  }
  function openEditor(r?: Reaction) {
    setEditingId(r?.id);
    setEditorKey(r?.key || '');
    setEditorAction(r?.action || 'jump');
    setEditorPhrase(r?.phrase || 'Hello, friend!');
    setEditorError('');
    requestAnimationFrame(() => {
      editor.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      keyInput.current?.focus({ preventScroll: true });
    });
  }
  function saveReaction() {
    if (!editorKey) {
      setEditorError('Press a key to choose your trigger.');
      keyInput.current?.focus();
      return;
    }
    if (
      reactions.some((r) => normalizeKey(r.key) === normalizeKey(editorKey) && r.id !== editingId)
    ) {
      setEditorError(
        `${keyLabel(editorKey)} already has a reaction. Edit that reaction or choose another key.`,
      );
      return;
    }
    if (!editingId && reactions.length >= 30) {
      setEditorError('You can keep up to 30 reactions. Remove one to make room.');
      return;
    }
    const next: Reaction = {
      id: editingId || uid(),
      key: normalizeKey(editorKey),
      action: editorAction,
      phrase: editorPhrase.trim(),
    };
    setReactions((rs) =>
      editingId ? rs.map((r) => (r.id === editingId ? next : r)) : [...rs, next],
    );
    setToast(`${keyLabel(editorKey)} now makes ${displayName} ${editorAction}!`);
    resetEditor();
  }
  const wpm = elapsed >= 5 ? Math.round(typed / 5 / (elapsed / 60)) : 0;

  return (
    <div className={`app ${focus ? 'focus-mode' : ''}`}>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab('playground');
          }}
          aria-label="KeyCritter home"
        >
          <span className="brand-mark">
            <PawPrint size={29} strokeWidth={2.3} />
          </span>
          <span>
            <span className="brand-name">
              KeyCritter<span className="brand-dot">.</span>
              <span className="app-version" data-testid="app-version" title="Application version">
                v{__APP_VERSION__}
              </span>
            </span>
            <span className="brand-tagline">Your tiny typing companion.</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={tab === 'playground' ? 'active' : ''}
            onClick={() => setTab('playground')}
          >
            <Keyboard size={17} />
            Playground
          </button>
          <button
            className={tab === 'pets' ? 'active' : ''}
            onClick={() => {
              setTab('pets');
              setFocus(false);
            }}
          >
            <Heart size={17} />
            My Pets{pets.length > 0 && <span className="nav-count">{pets.length}</span>}
          </button>
        </nav>
        <button className="button primary save-pet" onClick={savePet}>
          <Save size={16} />
          Save pet
        </button>
      </header>

      {tab === 'playground' ? (
        <main className="main-content">
          <div className="page-intro">
            <div>
              <span className="eyebrow">
                <span className="green-dot" /> A LITTLE COMPANY, A LOT OF JOY
              </span>
              <h1>
                Make yourself a little friend<span>.</span>
              </h1>
              <p>A dash of personality. A sprinkle of pixels. A buddy for every keystroke.</p>
            </div>
            <span className="intro-doodle">
              <Sparkles size={24} />
              Made to be yours
            </span>
          </div>
          {desktopState && (
            <DesktopPanel initial={desktopState} design={design} reactions={reactions} />
          )}
          <div className="workspace-grid">
            <section className="playground-column" aria-label="Pet playground">
              <div className={`room ${night ? 'night' : ''}`}>
                <div className="room-art" />
                <div className="room-toolbar">
                  <span className="room-label">
                    <span className="green-dot" />
                    {displayName}'s little corner
                  </span>
                  <div className="room-tools">
                    <button
                      className="glass-button"
                      aria-label={sound ? 'Mute sounds' : 'Enable sounds'}
                      aria-pressed={sound}
                      onClick={() => setSound(!sound)}
                    >
                      {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                    </button>
                    <button
                      className="glass-button"
                      aria-label={night ? 'Switch to daytime' : 'Switch to evening'}
                      onClick={() => setNight(!night)}
                    >
                      {night ? <Moon size={17} /> : <Sun size={17} />}
                    </button>
                    <button
                      className="glass-button"
                      aria-label={focus ? 'Exit focus mode' : 'Enter focus mode'}
                      onClick={() => setFocus(!focus)}
                    >
                      {focus ? <Minimize size={17} /> : <Expand size={17} />}
                    </button>
                  </div>
                </div>
                <div
                  className="pet-position"
                  style={{ '--pet-scale': design.size / 100 } as React.CSSProperties}
                >
                  <div className="speech-bubble" key={`speech-${animation.n}`}>
                    <span>{speech}</span>
                    <span className="bubble-sparkle">✦</span>
                  </div>
                  <button
                    className="pet-hit-area"
                    aria-label={`Pet ${displayName}`}
                    onClick={() => react('cheer', 'Aww, I love you too!')}
                  >
                    <div
                      key={animation.n}
                      className={`pet-animated ${animation.action || 'idle'}`}
                      data-testid="active-pet"
                      data-species={design.species}
                      data-action={animation.action || 'idle'}
                    >
                      <Pet design={design} action={animation.action} />
                    </div>
                  </button>
                  {animation.action && (
                    <div
                      key={`particles-${animation.n}`}
                      className={`particles ${animation.action}`}
                      aria-hidden="true"
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <span key={i} style={{ '--i': i } as React.CSSProperties}>
                          {animation.action === 'sleep'
                            ? 'z'
                            : animation.action === 'surprise'
                              ? '!'
                              : i % 2
                                ? '✦'
                                : '♥'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="room-caption">
                  <Heart size={12} fill="currentColor" />A happy place for your little companion
                </div>
              </div>

              <section className="card typing-card">
                <div className="section-heading">
                  <div className="heading-icon lavender">
                    <Keyboard size={19} />
                  </div>
                  <div>
                    <h2>A little typing. A little magic.</h2>
                    <p>Every keystroke brings your buddy to life.</p>
                  </div>
                  <span className="tiny-tag">
                    TRY IT OUT <ArrowDown size={12} />
                  </span>
                </div>
                <div className="typing-input-wrap">
                  <textarea
                    ref={textarea}
                    aria-label="Typing playground"
                    placeholder="Hello, little buddy! Start typing here…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
                      if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') {
                        if (!sessionStart) setSessionStart(Date.now());
                        if (e.key.length === 1) setTyped((n) => n + 1);
                      }
                      const reaction = reactions.find(
                        (r) => normalizeKey(r.key) === normalizeKey(e.key),
                      );
                      if (reaction) react(reaction.action, reaction.phrase);
                    }}
                    spellCheck={false}
                  />
                  <button
                    className="send-button"
                    aria-label="Cheer for my typing"
                    onClick={() => {
                      react('cheer', text.trim() ? 'Look at you go!' : 'Ready when you are!');
                      textarea.current?.focus();
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <div className="typing-footer">
                  <div className="typing-stats">
                    <span>
                      <Keyboard size={14} />
                      <b>{text.length}</b> characters
                    </span>
                    <span>
                      <Sparkles size={14} />
                      <b>{triggered}</b> reactions
                    </span>
                    <span className="wpm-stat">
                      <Zap size={14} />
                      <b>{wpm}</b> wpm
                    </span>
                  </div>
                  <span className="keep-typing">
                    <Heart size={13} fill="currentColor" />
                    Keep typing, friend.
                  </span>
                </div>
                <div className="quick-keys">
                  <span>Give it a try</span>
                  {reactions.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        react(r.action, r.phrase);
                        textarea.current?.focus();
                      }}
                    >
                      <kbd>{keyLabel(r.key)}</kbd>
                      <span>{ACTIONS.find((a) => a.value === r.action)?.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </section>

            <aside className="design-column">
              <section className="card design-card">
                <div className="section-heading">
                  <div className="pet-avatar">
                    <Pet design={design} mini />
                  </div>
                  <div>
                    <h2>Meet {displayName}</h2>
                    <p>A little you, a little magic.</p>
                  </div>
                  <Palette className="heading-decoration" size={20} />
                </div>
                <div className="design-fields">
                  <div className="field-row">
                    <label htmlFor="pet-name">Name</label>
                    <input
                      id="pet-name"
                      maxLength={24}
                      value={design.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your buddy's name"
                      autoComplete="off"
                    />
                  </div>
                  <CustomPetStudio design={design} onChange={setDesign} />
                  <div className="field-row color-row">
                    <span id="color-label">Color</span>
                    <div className="color-options" role="group" aria-labelledby="color-label">
                      {COLORS.map((c) => (
                        <button
                          key={c.value}
                          className={`color-swatch ${design.color === c.value ? 'selected' : ''}`}
                          style={{ background: c.value }}
                          title={c.name}
                          aria-label={`${c.name} color`}
                          aria-pressed={design.color === c.value}
                          onClick={() => update('color', c.value)}
                        >
                          {design.color === c.value && <Check size={17} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field-row species-row">
                    <span id="species-label">Species</span>
                    <div className="species-options" role="group" aria-labelledby="species-label">
                      {(['cat', 'bunny', 'blob'] as Species[]).map((species) => (
                        <button
                          key={species}
                          className={`choice species-choice ${design.species === species ? 'selected' : ''}`}
                          aria-pressed={design.species === species}
                          onClick={() => update('species', species)}
                        >
                          <Pet design={{ ...design, species, accessory: 'none' }} mini />
                          <span>{species.charAt(0).toUpperCase() + species.slice(1)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field-row size-row">
                    <label htmlFor="pet-size">Size</label>
                    <div className="size-control">
                      <PawPrint size={15} />
                      <input
                        id="pet-size"
                        aria-label="Pet size"
                        type="range"
                        min="70"
                        max="125"
                        value={design.size}
                        onChange={(e) => update('size', Number(e.target.value))}
                        style={
                          {
                            '--range-progress': `${((design.size - 70) / 55) * 100}%`,
                          } as React.CSSProperties
                        }
                      />
                      <PawPrint size={22} />
                    </div>
                  </div>
                  <div className="field-row accessory-row">
                    <span id="accessory-label">Accessory</span>
                    <div
                      className="accessory-options"
                      role="group"
                      aria-labelledby="accessory-label"
                    >
                      {(['bow', 'glasses', 'star', 'none'] as Accessory[]).map((a) => (
                        <button
                          className={`choice accessory-choice ${design.accessory === a ? 'selected' : ''}`}
                          key={a}
                          aria-label={`${a === 'none' ? 'No' : a.charAt(0).toUpperCase() + a.slice(1)} accessory`}
                          title={a === 'none' ? 'No accessory' : a}
                          aria-pressed={design.accessory === a}
                          onClick={() => update('accessory', a)}
                        >
                          {a === 'bow' ? (
                            <svg width="27" height="22" viewBox="0 0 30 22">
                              <path
                                d="M2 3v16h5l8-5 8 5h5V3h-5l-8 5-8-5z"
                                fill="#efa6c7"
                                stroke="#69536e"
                                strokeWidth="1.5"
                              />
                              <rect
                                x="12"
                                y="7"
                                width="6"
                                height="8"
                                rx="1"
                                fill="#f7c5dd"
                                stroke="#69536e"
                              />
                            </svg>
                          ) : a === 'glasses' ? (
                            <svg width="29" height="22" viewBox="0 0 30 22">
                              <path
                                d="M2 6h10v10H4V13H2zm16 0h10v7h-2v3h-8z"
                                fill="#c0d7c4"
                                stroke="#51465d"
                                strokeWidth="2"
                              />
                              <path d="M12 9h6" stroke="#51465d" strokeWidth="2" />
                            </svg>
                          ) : a === 'star' ? (
                            <Star size={25} fill="#f8d998" stroke="#8c7256" strokeWidth={1.5} />
                          ) : (
                            <X size={18} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="design-note">
                  <Sparkles size={13} />
                  Small details. Big personality.
                </div>
              </section>

              <section className="card reactions-card">
                <div className="section-heading">
                  <div className="heading-icon peach">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2>Key reactions</h2>
                    <p>You type. Your buddy does its thing.</p>
                  </div>
                  <span className="count-badge">{reactions.length}</span>
                </div>
                <div className="reaction-list">
                  {reactions.length === 0 ? (
                    <p className="empty-reactions">
                      A blank slate! Add your first key reaction below.
                    </p>
                  ) : (
                    reactions.map((r) => (
                      <div className="reaction-row" key={r.id}>
                        <button
                          className="reaction-preview"
                          aria-label={`Preview ${keyLabel(r.key)} reaction`}
                          onClick={() => react(r.action, r.phrase)}
                        >
                          <kbd>{keyLabel(r.key)}</kbd>
                          <ArrowRight size={14} />
                          <span className={`reaction-pet reaction-${r.action}`}>
                            <Pet design={design} action={r.action} mini />
                          </span>
                          <span className="reaction-name">
                            {ACTIONS.find((a) => a.value === r.action)?.label}
                          </span>
                        </button>
                        <button
                          className="icon-button edit-reaction"
                          aria-label={`Edit ${keyLabel(r.key)} reaction`}
                          onClick={() => openEditor(r)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="icon-button remove-reaction"
                          aria-label={`Remove ${keyLabel(r.key)} reaction`}
                          onClick={() => {
                            setReactions((rs) => rs.filter((x) => x.id !== r.id));
                            if (editingId === r.id) resetEditor();
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button className="button add-reaction" onClick={() => openEditor()}>
                  <Plus size={16} />
                  Add a reaction
                </button>
                <p className="reaction-hint">Psst… click a reaction for a little preview.</p>
              </section>
            </aside>
          </div>

          <section
            className="card reaction-editor"
            ref={editor}
            aria-label="Custom reaction editor"
          >
            <div className="editor-title">
              <div className="heading-icon lavender">
                <Sparkles size={21} />
              </div>
              <div>
                <h2>{editingId ? 'Make it even more you' : 'Make a little magic'}</h2>
                <p>
                  {editingId
                    ? 'Give this reaction a fresh personality.'
                    : 'Give your buddy a reaction of its own.'}
                </p>
              </div>
            </div>
            <div className="editor-fields">
              <label className="editor-key">
                <span>When I press</span>
                <div className="key-capture">
                  <input
                    ref={keyInput}
                    aria-label="Reaction key"
                    placeholder="Press a key"
                    value={editorKey ? keyLabel(editorKey) : ''}
                    readOnly
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') return;
                      e.preventDefault();
                      if (['Shift', 'Control', 'Meta', 'Alt', 'CapsLock', 'Escape'].includes(e.key))
                        return;
                      setEditorKey(normalizeKey(e.key));
                      setEditorError('');
                    }}
                  />
                  <Keyboard size={14} />
                </div>
              </label>
              <ArrowRight className="editor-arrow" size={15} />
              <label className="editor-action">
                <span className="sr-only">Reaction animation</span>
                <div className="select-wrap">
                  <select
                    aria-label="Reaction animation"
                    value={editorAction}
                    onChange={(e) => setEditorAction(e.target.value as Action)}
                  >
                    {ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </label>
              <label className="editor-phrase">
                <span>and say</span>
                <input
                  aria-label="Reaction message"
                  maxLength={80}
                  placeholder="Something encouraging…"
                  value={editorPhrase}
                  onChange={(e) => setEditorPhrase(e.target.value)}
                />
              </label>
            </div>
            <div className="editor-buttons">
              <button
                className="button preview-button"
                onClick={() => react(editorAction, editorPhrase)}
              >
                <Play size={14} fill="currentColor" />
                Preview
              </button>
              <button className="button primary" onClick={saveReaction}>
                {editingId ? <Check size={15} /> : <Plus size={15} />}
                {editingId ? 'Update' : 'Add'}
              </button>
              {editingId && (
                <button
                  className="icon-button"
                  aria-label="Cancel editing reaction"
                  onClick={resetEditor}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {editorError && (
              <p className="editor-error" role="alert">
                {editorError}
              </p>
            )}
          </section>
          <div className="bottom-note">
            <span>
              <span className="green-dot" />
              {storageError
                ? 'Browser storage is unavailable. Keep this tab open to keep your design.'
                : desktopState
                  ? 'Changes sync to your desktop pet automatically.'
                  : 'Your design stays right here in your browser.'}
            </span>
            <span>
              Little companion. Endless possibilities.
              <Star size={12} />
            </span>
          </div>
        </main>
      ) : (
        <main className="main-content library-page">
          <div className="page-intro">
            <div>
              <span className="eyebrow">
                <Heart size={12} /> YOUR LITTLE FAMILY
              </span>
              <h1>
                Good company, in every color<span>.</span>
              </h1>
              <p>All your tiny companions, in one happy place. Saved on this browser.</p>
            </div>
            <button className="button primary" onClick={newPet}>
              <Plus size={17} />
              Create a pet
            </button>
          </div>
          {pets.length === 0 ? (
            <div className="card empty-library">
              <div className="empty-pet">
                <Pet design={design} />
              </div>
              <h2>A little friend is waiting.</h2>
              <p>Design your first buddy, then choose “Save pet” to give it a home here.</p>
              <button className="button primary" onClick={() => setTab('playground')}>
                <ArrowLeft size={16} />
                Back to the playground
              </button>
            </div>
          ) : (
            <div className="pet-library">
              {pets.map((p) => (
                <article className="card saved-pet-card" key={p.id}>
                  <div
                    className="saved-pet-scene"
                    style={{ '--saved-color': p.design.color } as React.CSSProperties}
                  >
                    <span className="saved-sparkle">✦</span>
                    <Pet design={p.design} />
                    <span className="saved-heart">♡</span>
                  </div>
                  <div className="saved-pet-info">
                    <h2>{p.design.name}</h2>
                    <span>
                      {p.design.species} · {p.reactions.length} reactions
                    </span>
                    <div className="saved-pet-actions">
                      <button className="button preview-button" onClick={() => loadPet(p)}>
                        Hang out
                        <ArrowRight size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${p.design.name}`}
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}

      <footer className="site-footer">
        <span className="footer-brand">
          <PawPrint size={14} />
          KeyCritter
        </span>
        <span>
          Made for the love of little things.
          <Heart size={12} />
        </span>
        <span className="footer-version">A tiny corner of the internet.</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={15} />
          </span>
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {deleteId && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(undefined);
          }}
        >
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDeleteId(undefined);
              if (e.key === 'Tab') {
                const buttons = Array.from(e.currentTarget.querySelectorAll('button'));
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="heading-icon peach">
              <Heart size={24} />
            </div>
            <h2 id="delete-title">
              Say goodbye to {pets.find((p) => p.id === deleteId)?.design.name}?
            </h2>
            <p>
              This removes this pet from your saved collection. You can always make a new friend.
            </p>
            <div className="modal-actions">
              <button
                className="button preview-button"
                ref={modalCancel}
                onClick={() => setDeleteId(undefined)}
              >
                Keep my buddy
              </button>
              <button className="button danger" onClick={deletePet}>
                <Trash2 size={15} />
                Remove pet
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
