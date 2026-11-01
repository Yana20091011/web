# KeyCritter

A floating pixel pet for Windows, with a cozy React designer. Customize a cat, bunny, or blob and let it react while you type in other apps.

## Use the Windows desktop pet

1. Open `KeyCritter-Windows-1.0.0.exe` on a Windows 10/11 x64 computer. This is a portable app; Node.js and an installer are not required.
2. Design your pet, then click **Enable keyboard reactions**. Ordinary typing makes it bounce; Space, Enter, and Backspace have special reactions by default. Add more in the reaction editor.
3. Drag the little name label beneath your desktop pet to move it. The pet stays above other windows without taking keyboard focus.
4. Close the designer to keep just the pet. Reopen it from the pet's **Designer** button or the KeyCritter system-tray menu, which may be under Windows' hidden-icons arrow.
5. Pause reactions from the pet, designer, or tray menu. Choose **Quit KeyCritter** in the tray menu to close everything.

Reactions start paused on every launch. There is no automatic Windows startup task. The portable build is unsigned; it is a development build, not a signed public release.

### Privacy and storage

The keyboard hook runs only after you enable reactions, in a separate local process. It matches configured keys, then sends only a reaction identifier or a generic typing pulse to the pet. It does not assemble, record, or transmit typed text, and it never suppresses or injects input. Ctrl, Alt, and Windows-key shortcuts are ignored. Custom letter and symbol triggers use physical US keyboard positions.

Pet design, reactions, and position are stored at `%APPDATA%\KeyCritter\pet-settings.json`. Saved pet collections live in the app's local browser storage in the same user-data folder. No account, API key, or Internet connection is needed to use the desktop app. Closing the app terminates the keyboard-hook process.

## Development

Use Node.js **22.12+**, preferably Node.js 24, and npm.

```sh
npm ci
npm run desktop
```

The desktop command downloads Electron's official runtime if necessary, builds the renderer, then starts the app. The desktop pet targets Windows x64; the integration test can also exercise it on a Linux X11 display. Native keyboard hooks on Linux Wayland are not supported by this implementation.

For the browser-only designer:

```sh
npm run dev
```

Open the address printed by Vite. Type in the playground to trigger reactions. Keys used in the design controls do not trigger the pet. Custom reaction keys are case insensitive. Sound is optional and off by default.

## Checks

```sh
npm run build
npm test
npm run test:desktop:unit
npm run test:desktop
```

Browser tests run in desktop and mobile Chromium. They use `/usr/bin/chromium` when available. Otherwise install Chromium with `npx playwright install chromium`, or set `CHROMIUM_PATH` to a browser executable. Playwright starts the development server automatically if it is not running.

`npm run preview` serves the production build after `npm run build`.

Desktop unit checks cover settings validation, key matching, event filtering, throttling, position restoration, and the local asset protocol. The desktop integration check requires a Linux X11 display and `xdotool`. Set `DISPLAY` and optionally `XDOTOOL_PATH`. It checks the actual Electron windows and native keyboard hook with a separate input window, input delivery, pause, closing the designer, persistence, and restart with reactions off.

Windows-specific transparency, tray behavior, and native key handling should also be checked on a Windows computer. A Linux integration run does not establish Windows runtime behavior.

## Build the Windows download

The prepared GitHub Actions workflow in `.github/workflows/windows-desktop.yml` builds on `windows-latest` when code is pushed to `main`, or when started manually. After a successful run, sign in to GitHub, open the repository's **Actions** tab, select **Build Windows desktop pet**, open the completed run, and download **KeyCritter-Windows** under **Artifacts**. Extract that ZIP and follow `START-HERE.txt`. The artifact is retained for 14 days; rerun the workflow to produce another download. The workflow must first be uploaded to GitHub before this route is available.

```sh
npm run desktop:win
```

The result is `release/KeyCritter-Windows-1.0.0.exe`. Packaging downloads official Electron and NSIS resources; it does not publish anything. The native keyboard package includes Windows x64 N-API prebuilds, which remain unpacked outside the app archive. The portable launcher requests ordinary user privileges.

## Open without installing anything

Run `npm run export` to create `dist/KeyCritter.html`. Download that file and double-click it to open the complete website in a browser. All artwork, scripts, styles, and fonts are embedded, so it works offline without a server. Keep using the same file and browser to keep your saved pets.

This HTML version cannot create a desktop overlay or receive typing from other apps. Use the Windows executable for that.

## How it works

- `src/App.tsx`: playground, pet designer, key bindings, and local collection.
- `desktop/main.cjs`: isolated native windows, tray menu, validated IPC, settings, and keyboard-worker lifecycle.
- `desktop/keyboard-worker.cjs`, `desktop/keys.cjs`: key matching and generic typing pulses; no typed-text storage.
- `desktop/preload.cjs`: narrow, context-isolated renderer bridge.
- `src/DesktopPet.tsx`: transparent floating pet.
- `src/DesktopPanel.tsx`: desktop controls inside the designer.
- `src/Pet.tsx`: recolorable SVG pixel characters and accessories.
- `src/model.ts`: defaults, key normalization, and validation of stored data.
- `src/styles.css`: responsive layout, reaction animations, and reduced-motion support.
- `public/cozy-room.png`: AI-generated background artwork created for this project. The pet itself is a separate, interactive SVG.

In the browser version, drafts save automatically; **Save pet** adds or updates the current pet in **My Pets**. Both are local to this browser and origin. Clearing browser storage removes them. The browser page must be focused for typing reactions.

Desktop renderers load bundled files through an origin-restricted local protocol, with a content security policy, sandboxing, no Node integration, and external navigation disabled. No web server is required by the packaged app.
