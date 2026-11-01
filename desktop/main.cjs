const {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  screen,
  Tray,
  Menu,
  nativeImage,
  utilityProcess,
  net,
  safeStorage,
  shell,
  session,
  dialog,
} = require('electron');
const { readFile, writeFile, rename, mkdir } = require('node:fs/promises');
const { join, extname } = require('node:path');
const { DEFAULT_PET, cleanPet, clampPosition, assetPath, ACTIONS } = require('./shared.cjs');
const { generateImage } = require('./ai.cjs');
const { createKeyStore } = require('./ai-key-store.cjs');

app.setName('KeyCritter');
protocol.registerSchemesAsPrivileged([
  { scheme: 'keycritter', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
// Tests use a temporary profile; normal launches use Electron's standard per-user directory.
const profile = process.argv.find((arg) => arg.startsWith('--profile='));
if (profile) app.setPath('userData', profile.slice('--profile='.length));
let designer, companion, tray, worker;
let quitting = false;
let position;
let pet = structuredClone(DEFAULT_PET);
let listening = false;
let starting = false;
let visible = true;
let pinned = true;
let pinTimer;
let error = '';
let saveTimer, hookTimer;
let keyStore, generation;
let writeQueue = Promise.resolve();
const settingsFile = () => join(app.getPath('userData'), 'pet-settings.json');
const windows = () => [designer, companion].filter((w) => w && !w.isDestroyed());
const state = () => ({
  pet,
  listening,
  starting,
  visible,
  pinned,
  error,
  platform: process.platform,
  version: app.getVersion(),
});

function save() {
  clearTimeout(saveTimer);
  // Opt-in is session-only: keyboard monitoring never silently resumes on launch.
  const contents = JSON.stringify({ version: 1, pet, position, pinned });
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      await mkdir(app.getPath('userData'), { recursive: true });
      await writeFile(settingsFile() + '.tmp', contents, { mode: 0o600 });
      await rename(settingsFile() + '.tmp', settingsFile());
    })
    .catch(() => {
      error = 'Your settings could not be saved. Check that your Windows user folder is writable.';
      broadcast();
    });
  return writeQueue;
}
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}
function broadcast() {
  for (const w of windows()) w.webContents.send('pet:changed', state());
  updateTray();
}
function sendReaction(reaction) {
  if (companion && !companion.isDestroyed()) companion.webContents.send('pet:reaction', reaction);
}
function applyPetPin(refresh = false) {
  if (quitting || !companion || companion.isDestroyed()) return;
  // A Windows foreground/fullscreen transition can leave Chromium's cached
  // topmost state out of sync with the native window. Reset the native level
  // without activating the window, then raise it within the topmost group.
  if (pinned && refresh && process.platform === 'win32') companion.setAlwaysOnTop(false);
  companion.setAlwaysOnTop(pinned, process.platform === 'win32' ? 'pop-up-menu' : 'floating');
  if (pinned && visible && companion.isVisible() && !companion.isMinimized()) companion.moveTop();
}
function setPetPin(value) {
  if (typeof value !== 'boolean') throw new Error('Invalid pin setting');
  pinned = value;
  applyPetPin(true);
  queueSave();
  broadcast();
  return state();
}
function stopListening() {
  clearTimeout(hookTimer);
  const previous = worker;
  worker = undefined;
  listening = false;
  starting = false;
  previous?.kill();
  broadcast();
}
function failListening() {
  stopListening();
  error =
    'Keyboard reactions could not start. Close and reopen KeyCritter, then try again. The designer and pet still work.';
  broadcast();
}
function startListening() {
  if (worker) return;
  error = '';
  starting = true;
  broadcast();
  let child;
  try {
    child = utilityProcess.fork(join(__dirname, 'keyboard-worker.cjs'), [], {
      serviceName: 'KeyCritter keyboard reactions',
      stdio: 'ignore',
    });
  } catch {
    failListening();
    return;
  }
  worker = child;
  child.on('spawn', () => {
    if (worker === child) child.postMessage({ type: 'configure', reactions: pet.reactions });
  });
  child.on('message', (message) => {
    if (worker !== child) return;
    if (message?.type === 'ready') {
      clearTimeout(hookTimer);
      starting = false;
      listening = true;
      broadcast();
    } else if (message?.type === 'failed') failListening();
    else if (listening && !designer?.isFocused() && message?.type === 'reaction') {
      const r = pet.reactions.find((r) => r.id === message.id);
      if (r) sendReaction({ action: r.action, phrase: r.phrase });
    } else if (listening && !designer?.isFocused() && message?.type === 'activity')
      sendReaction({ action: 'tap', phrase: '' });
  });
  child.on('exit', () => {
    if (worker === child && !quitting) failListening();
  });
  hookTimer = setTimeout(() => {
    if (worker === child && !listening) failListening();
  }, 8000);
}

function updateTray() {
  if (!tray || tray.isDestroyed()) return;
  tray.setToolTip(`KeyCritter — ${listening ? 'keyboard reactions on' : 'reactions paused'}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open pet designer', click: showDesigner },
      {
        label: visible ? 'Hide desktop pet' : 'Show desktop pet',
        click: () => {
          visible = !visible;
          if (visible) {
            companion.showInactive();
            applyPetPin(true);
          } else companion.hide();
          broadcast();
        },
      },
      {
        label: 'Pin pet above other apps',
        type: 'checkbox',
        checked: pinned,
        click: (item) => setPetPin(item.checked),
      },
      { type: 'separator' },
      {
        label: starting
          ? 'Starting reactions…'
          : listening
            ? 'Pause keyboard reactions'
            : 'Enable keyboard reactions',
        enabled: !starting,
        click: () => (listening ? stopListening() : startListening()),
      },
      { type: 'separator' },
      { label: 'Quit KeyCritter', click: () => app.quit() },
    ]),
  );
}
function showDesigner() {
  if (!designer || designer.isDestroyed()) createDesigner();
  designer.show();
  designer.focus();
}
function secureWindow(window) {
  window.webContents.on('page-title-updated', (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
}
const webPreferences = () => ({
  preload: join(__dirname, 'preload.cjs'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
});
function createDesigner() {
  designer = new BrowserWindow({
    width: 1300,
    height: 1000,
    minWidth: 760,
    minHeight: 650,
    title: `KeyCritter v${app.getVersion()} — Pet designer`,
    backgroundColor: '#f9f7f2',
    autoHideMenuBar: true,
    webPreferences: webPreferences(),
  });
  secureWindow(designer);
  designer.loadURL(`keycritter://app/index.html?v=${app.getVersion()}`);
  designer.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      designer.hide();
    }
  });
  designer.on('blur', () => applyPetPin(true));
}
function createCompanion() {
  const display = position ? screen.getDisplayNearestPoint(position) : screen.getPrimaryDisplay();
  const point = clampPosition(position, display.workArea);
  companion = new BrowserWindow({
    ...point,
    width: 290,
    height: 390,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    title: `KeyCritter v${app.getVersion()} — Desktop companion`,
    webPreferences: { ...webPreferences(), backgroundThrottling: false },
  });
  applyPetPin();
  companion.setIgnoreMouseEvents(true, { forward: true });
  secureWindow(companion);
  companion.loadURL(`keycritter://app/index.html?v=${app.getVersion()}#companion`);
  companion.once('ready-to-show', () => companion.showInactive());
  companion.on('show', () => applyPetPin(true));
  companion.on('restore', () => applyPetPin(true));
  pinTimer = setInterval(() => {
    if (!pinned || !visible || quitting || companion.isDestroyed() || !companion.isVisible())
      return;
    try {
      applyPetPin(true);
    } catch {
      /* The window may be closing during shutdown. */
    }
  }, 1500);
  pinTimer.unref();
  companion.on('moved', () => {
    const [x, y] = companion.getPosition();
    position = { x, y };
    queueSave();
  });
  companion.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      visible = false;
      companion.hide();
      broadcast();
    }
  });
}

function allowed(event, roles = ['designer', 'companion']) {
  return (
    event.senderFrame === event.sender.mainFrame &&
    roles.some((role) => (role === 'designer' ? designer : companion)?.webContents === event.sender)
  );
}
function handle(channel, roles, callback) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!allowed(event, roles)) throw new Error('Not allowed');
    return callback(...args);
  });
}
handle('pet:state', ['designer', 'companion'], state);
handle('pet:update', ['designer'], (value) => {
  const next = cleanPet(value);
  if (!next) throw new Error('Invalid pet settings');
  pet = next;
  worker?.postMessage({ type: 'configure', reactions: pet.reactions });
  queueSave();
  broadcast();
  return state();
});
handle('pet:enabled', ['designer', 'companion'], (enabled) => {
  if (typeof enabled !== 'boolean') throw new Error('Invalid switch');
  if (enabled) startListening();
  else {
    error = '';
    stopListening();
  }
  return state();
});
handle('pet:pin', ['designer', 'companion'], setPetPin);
handle('pet:show', ['designer', 'companion'], () => {
  visible = true;
  companion.showInactive();
  applyPetPin(true);
  broadcast();
  return state();
});
handle('pet:designer', ['companion'], showDesigner);
handle('pet:preview', ['designer'], (value) => {
  if (
    !value ||
    !ACTIONS.includes(value.action) ||
    typeof value.phrase !== 'string' ||
    value.phrase.length > 80
  )
    throw new Error('Invalid reaction');
  sendReaction({ action: value.action, phrase: value.phrase });
});
handle('pet:quit', ['designer', 'companion'], () => app.quit());
handle('ai:status', ['designer'], () => keyStore.status());
handle('ai:key-page', ['designer'], () =>
  shell.openExternal('https://platform.openai.com/api-keys'),
);
handle('ai:key', ['designer'], async (key, remember) => {
  try {
    return { ok: true, status: await keyStore.set(key, remember) };
  } catch (cause) {
    return { ok: false, error: cause.message };
  }
});
handle('ai:disconnect', ['designer'], async () => {
  generation?.abort();
  try {
    return { ok: true, status: await keyStore.clear() };
  } catch (cause) {
    return { ok: false, error: cause.message };
  }
});
handle('ai:cancel', ['designer'], () => generation?.abort());
handle('ai:generate', ['designer'], async (request) => {
  if (generation)
    return { ok: false, error: 'An image is already being generated. Wait or cancel it first.' };
  const controller = new AbortController();
  generation = controller;
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const image = await generateImage({
      request,
      key: keyStore.get(),
      fetchImpl: (url, options) => net.fetch(url, options),
      signal: controller.signal,
    });
    return { ok: true, image };
  } catch (cause) {
    return {
      ok: false,
      error: controller.signal.aborted ? 'Generation cancelled or timed out.' : cause.message,
    };
  } finally {
    clearTimeout(timeout);
    if (generation === controller) generation = undefined;
  }
});
ipcMain.on('pet:interactive', (event, interactive) => {
  if (allowed(event, ['companion']) && typeof interactive === 'boolean')
    companion.setIgnoreMouseEvents(!interactive, { forward: true });
});

const ownsInstanceLock = app.requestSingleInstanceLock();
if (!ownsInstanceLock) {
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'info',
      title: `KeyCritter v${app.getVersion()} did not start`,
      message: 'Another copy of KeyCritter is already running.',
      detail: `This executable is version ${app.getVersion()}, but the existing copy is still in control. Quit KeyCritter using the × beside Show pet or its system-tray menu, then open this executable again. Your saved pets will be kept.`,
      buttons: ['OK'],
    });
    app.quit();
  });
} else {
  app.on('second-instance', showDesigner);
  app
    .whenReady()
    .then(async () => {
      // Clear only the HTTP cache; keep saved pets, images, and local settings.
      await session.defaultSession.clearCache().catch(() => {});
      keyStore = createKeyStore({ directory: app.getPath('userData'), safeStorage });
      await keyStore.load();
      try {
        const saved = JSON.parse(await readFile(settingsFile(), 'utf8'));
        pet = cleanPet(saved.pet) || pet;
        if (Number.isFinite(saved.position?.x) && Number.isFinite(saved.position?.y))
          position = saved.position;
        if (typeof saved.pinned === 'boolean') pinned = saved.pinned;
      } catch {
        /* First launch or invalid settings: use a fresh pet. */
      }
      const root = join(__dirname, '..', 'dist');
      const types = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
      };
      protocol.handle('keycritter', async (request) => {
        const file = assetPath(root, request.url);
        if (!file) return new Response('Not found', { status: 404 });
        try {
          return new Response(await readFile(file), {
            headers: {
              'Content-Type': types[extname(file)] || 'application/octet-stream',
              'Cache-Control': 'no-store, max-age=0',
              'Content-Security-Policy':
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
            },
          });
        } catch {
          return new Response('Not found', { status: 404 });
        }
      });
      createCompanion();
      createDesigner();
      // A bundled raster icon is generated from the SVG at build time.
      tray = new Tray(nativeImage.createFromPath(join(__dirname, 'tray.png')));
      tray.on('double-click', showDesigner);
      updateTray();
    })
    .catch((cause) => {
      console.error('KeyCritter could not start:', cause.message);
      app.quit();
    });
}
app.on('window-all-closed', () => {
  /* Companion continues in the tray. */
});
app.on('before-quit', (event) => {
  if (!ownsInstanceLock) return;
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  clearInterval(pinTimer);
  generation?.abort();
  stopListening();
  clearTimeout(saveTimer);
  save().finally(() => app.quit());
});
