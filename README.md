# KeyCritter

A floating typing pet for Windows, with a cozy React designer. Customize a pixel pet, animate your own image frames, or generate a new companion with an AI prompt.

## Use the Windows desktop pet

1. Open `KeyCritter-Windows-1.6.0.exe` on a Windows 10/11 x64 computer. This is a portable app; Node.js and an installer are not required.
2. Design your pet, then click **Enable keyboard reactions**. Ordinary typing makes it bounce; Space, Enter, and Backspace have special reactions by default. Add more in the reaction editor.
3. Drag the little name label beneath your desktop pet to move it. The pet stays above other windows without taking keyboard focus.
4. Close the designer to keep just the pet. Reopen it from the pet's **Designer** button or the KeyCritter system-tray menu, which may be under Windows' hidden-icons arrow.
5. Pause reactions from the pet, designer, or tray menu. Choose **Quit KeyCritter** in the tray menu to close everything.

Reactions start paused on every launch. There is no automatic Windows startup task. The portable build is unsigned; it is a development build, not a signed public release.

The version appears beside the logo and in the window title. Quit an existing copy completely before opening an update. If another copy is already running, a new launch displays a message rather than silently presenting the existing app as the update. Versioned local URLs and cache headers prevent stale interface files from being reused; saved pets and settings are preserved.

**Pin above apps** keeps the floating pet above normal application windows. It is on by default and can be toggled from the pet, designer, or tray menu. The choice is saved. On Windows, the app reapplies its non-activating topmost window level while the pet is visible and pinned, including after foreground-window changes. Unpinning stops that behavior; hiding the pet keeps it hidden. The pet never requests keyboard focus to stay above a browser.

### Privacy and storage

The keyboard hook runs only after you enable reactions, in a separate local process. It matches configured keys, then sends only a reaction identifier or a generic typing pulse to the pet. It does not assemble, record, or transmit typed text, and it never suppresses or injects input. Ctrl, Alt, and Windows-key shortcuts are ignored. Custom letter and symbol triggers use physical US keyboard positions.

Pet design, reactions, custom images, and position are stored at `%APPDATA%\KeyCritter\pet-settings.json`. Saved pet collections live in the app's local browser storage in the same user-data folder. The pet and image uploads work offline. AI image generation needs Internet access and your own OpenAI API key. Closing the app terminates the keyboard-hook process.

## Upload your own pet

Choose **Upload** in the pet designer. Add a main PNG, JPG, or WebP image (up to 8 MB). Transparent images work best; existing image backgrounds are preserved. Images are resized locally to at most 384 pixels on the longest side and compressed for storage.

Add optional images for **Jump**, **Cheer**, **Surprise**, **Dance**, and **Sleep**. The pet swaps to that image when the corresponding animation is triggered. A missing pose uses the main image and its movement animation. Use the key-reaction editor to map keys to those actions and set speech bubbles. **Pixel pets** switches back to the original characters without deleting your uploaded images.

## Animate your own images

The **Laptop buddy** preset includes a pixel character using a laptop, with three transparent blink expressions. Choose **Animate → Idle / blink → Use laptop buddy**, then **Save pet** to use them directly without downloading files or connecting an AI account. It installs four frames (open → half-closed → closed → half-closed), with 100 / 120 / 400 / 120 ms timing and a 3-second pause. You can change every frame's timing and order afterward. Applying it to another selected pose replaces only that pose's animation; your name and key reactions stay the same. The original images ship with the app, so this also works offline and in the standalone HTML export.

1. Choose **Animate** in the designer, then select **Idle / blink** or a reaction such as **Cheer**.
2. Click **Add frames** and select several PNG, JPG, or WebP images. They are added in the file picker's returned order; the numbered thumbnails show the playback order. For blinking, use open eyes → half-closed → closed → open eyes. Matching canvas sizes and transparent backgrounds keep the pet steady.
3. Use the arrows to reorder frames, the trash button to remove one, and each frame's **ms** field to set its duration. **Use blink timing** sets every frame to 100 ms with a 3-second pause between repeats.
4. **Repeat animation** loops the sequence; its pause holds frame 1 (use open eyes as your resting frame). Without repeat, the last frame stays until the reaction ends. **Stop preview** pauses only the small editor preview. **Use this animation on my pet** controls actual playback.
5. Idle animations play automatically on the floating pet and continue through ordinary typing pulses. For reaction sequences, map the matching action in **Key reactions**. A reaction remains active for at least one full sequence. Choose **Save pet** to add the animated design to **My Pets**.

Each pose supports up to 12 frames, 40–5000 ms per frame, and a pause up to 15 seconds. Frames are resized locally to at most 256 pixels and compressed; total frame data is limited to keep storage manageable. Frames work offline and are saved with the pet. Reduced-motion settings show a still frame. Replacing a pose through Upload or AI turns off its existing frame animation while retaining its frames, which can be enabled again in Animate. Existing single-image pets continue to work.

## Control movement and position

**Movement strength**, below **Size** in the designer, controls the amount of shaking, bouncing, rotation, and stretching. Try 25% for gentle reactions, 100% for the original movement, or 0% for a still body while images, expressions, and uploaded animation frames keep changing. **Reset** restores 100%. This setting is saved with each pet and applies in the playground and on the desktop. Existing pets start at 100%. **Size** changes the pet's overall size.

To move the floating pet, click and hold the name bar marked **Drag to move**, then drag it anywhere on the screen. The app follows the actual OS cursor and remembers its position when reopened. Transparent window padding can extend off-screen; releasing the pet keeps its name-bar anchor reachable. The character image itself is separate from this drag handle.

## Generate a pet with AI

1. In the Windows app, choose **Create with AI**.
2. Add an OpenAI API key. **Get an OpenAI API key** opens OpenAI's key dashboard in your normal browser. API billing is separate from a ChatGPT subscription.
3. Enter a prompt such as “A tiny lavender dragon with round glasses and a star-shaped tail, soft pixel art.” Choose a target pose and image model.
4. If a main image exists, optionally enable **Use main image as a character reference** to send it with the prompt and request a matching character pose.
5. Click **Generate image**, review the preview, and choose **Use this image** or **Discard**. Repeat for additional poses as desired.

To make expressions of your own character, first upload its main image, then click **Make more expressions of this character**. Keep **Use main image as a character reference** selected. For blinking, choose **Main image** as the target and ask for “the same character with half-closed eyes, same body pose and placement.” After generation, **Add as frame** adds that preview to the selected pose's animation. A new sequence starts with your original pose image, then the generated expression; an existing sequence receives one new frame. Repeat for closed eyes, then choose **Animate** to adjust the order and durations. The original main image stays available as a reference. You can also create frames elsewhere and upload them without using the app's API connection.

Each generation makes one paid image request to OpenAI, with a transparent background requested. AI generates a single still image per request; **Add as frame** prepares it locally and makes no extra provider request. Character identity and alignment depend on the image model; reference edits request consistent placement but may still need adjustment. Nothing is sent when you merely type or upload an image. Generation sends only the prompt and, if explicitly selected, the main reference image. Typing activity never goes to the AI. Supported model IDs are checked against the official OpenAI SDK image definitions; the default is `gpt-image-1.5`.

API requests run in Electron's main process against the fixed `api.openai.com` image endpoints. The key is session-only by default. **Remember securely on this computer** uses Electron safeStorage/Windows DPAPI to encrypt it in `ai-key.bin`; plaintext fallback storage is not used. **Disconnect and remove key** clears the saved connection. Keys are not returned to the renderer or stored in pet settings, prompts, or browser local storage. The browser-only designer supports uploads, but deliberately does not make AI requests with a browser-stored key.

AI transport, error, reference-image, and preview tests use mock responses and do not spend API credits. Live image generation requires a usable account key and model access; it has not been verified in the cloud environment without those credentials.

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

Windows verification checks 0% movement with blinking still active, scaled reaction movement at 25%, and persistence of that setting. It also moves the OS cursor during a captured drag, checks rightward and vertical movement against actual Win32 window positions, verifies no drift from stale renderer events, and checks that edge placement is saved. Drag movement is sampled in the main process, independently of coordinates reported by the moving renderer window.

The GitHub Actions workflow in `.github/workflows/windows-desktop.yml` builds on `windows-latest` when code is pushed to `main`, or when started manually. It opens the actual portable executable on the Windows runner, verifies matching native and interface versions, Upload/AI panels, and uploaded frames playing on the floating pet, and saves screenshots before uploading the download. It also opens Microsoft Edge, switches tabs, and uses Win32 window order/styles to check that the pet stays above the browser without taking focus, recovers from an intentional native topmost reset, and respects unpinning. After a successful run, sign in to GitHub, open the repository's **Actions** tab, select **Build Windows desktop pet**, open the latest completed run, and download the versioned **KeyCritter-Windows-v1.6.0** artifact. Extract that ZIP and follow `START-HERE.txt`. The three `verified-*-ui.png` screenshots and `package-verification.json` show what was tested. Artifacts are retained for 14 days.

```sh
npm run desktop:win
```

The result is `release/KeyCritter-Windows-1.6.0.exe`. Packaging downloads official Electron and NSIS resources; it does not publish anything. The native keyboard package includes Windows x64 N-API prebuilds, which remain unpacked outside the app archive. The portable launcher requests ordinary user privileges. Run `npm run test:portable` on Windows to verify this exact executable, or `npm run test:second-instance` with Linux X11/xdotool to exercise the duplicate-launch message and saved-data protection.

## Open without installing anything

Run `npm run export` to create `dist/KeyCritter.html`. Download that file and double-click it to open the complete website in a browser. All artwork, scripts, styles, and fonts are embedded, so it works offline without a server. Keep using the same file and browser to keep your saved pets.

This HTML version cannot create a desktop overlay or receive typing from other apps. Use the Windows executable for that.

## How it works

- `src/App.tsx`: playground, pet designer, key bindings, and local collection.
- `desktop/main.cjs`: isolated native windows, tray menu, validated IPC, settings, and keyboard-worker lifecycle.
- `desktop/keyboard-worker.cjs`, `desktop/keys.cjs`: key matching and generic typing pulses; no typed-text storage.
- `desktop/preload.cjs`: narrow, context-isolated renderer bridge.
- `desktop/ai.cjs`, `desktop/ai-key-store.cjs`: fixed-endpoint AI requests and secure key storage.
- `src/CustomPetStudio.tsx`, `src/petImages.ts`: image uploads, pose assignments, and AI previews.
- `src/AnimationEditor.tsx`, `src/CustomPetImage.tsx`, `src/framePlayback.ts`: frame order, timing, looping, and animation playback.
- `src/DesktopPet.tsx`: transparent floating pet.
- `src/DesktopPanel.tsx`: desktop controls inside the designer.
- `src/Pet.tsx`: recolorable SVG pixel characters and accessories.
- `src/model.ts`: defaults, key normalization, and validation of stored data.
- `src/styles.css`: responsive layout, reaction animations, and reduced-motion support.
- `public/cozy-room.png`: AI-generated background artwork created for this project. The pet itself is a separate, interactive SVG.

In the browser version, drafts save automatically; **Save pet** adds or updates the current pet in **My Pets**. Both are local to this browser and origin. Clearing browser storage removes them. The browser page must be focused for typing reactions.

Desktop renderers load bundled files through an origin-restricted local protocol, with a content security policy, sandboxing, no Node integration, and external navigation disabled. No web server is required by the packaged app.

## Built-in character library

A compact preview sits directly below the typing playground. Choose a featured
anime or game pet without losing your typed text, or click **Browse all 309 pets**.
The full gallery shows 24 cards per page; search and category filters cover the
entire collection. Portraits load separately, and full artwork batches load only
when you preview a pose or choose a pet.

Open **My Pets → Character library** to browse 309 companions: the original laptop
buddy, 162 anime characters, and 146 game characters. Search by name or series,
filter by Anime/Game/Original, then narrow by **Franchise / collection** and
**Series**. Franchise groups collect related titles, such as Naruto/Boruto, the
Studio Ghibli films, Final Fantasy, NieR, Persona, and Hades. Counts show the size
of each group. Search combines with these filters; **Clear filters** restores the
whole collection. Sort by library order, character name, or franchise and series.
Preview **Idle**, **Blinking**, **Typing**, and **Happy** before choosing a pet.
**Choose** loads a copy into the existing playground; **Save pet** adds it to your
personal collection without changing the built-in library or your other saved pets.
Pets blink automatically, show their typing pose for ordinary playground keys, and
use their happy pose for Enter or affection. Existing custom key reactions take
priority. Reduced-motion preferences keep idle frames still.

The first entry reuses `src/assets/laptop-buddy` artwork. The other entries use detailed generated chibi pixel-art sheets: each character sits
at a laptop, blinks, types, and waves happily. The source sheets and roster are in
`src/assets/character-library/sheets`. `scripts/create-character-library.mjs`
extracts aligned, transparent sprites from those sheets.
The checked-in, self-contained WebP data keeps the library available without image
hosts or API keys and supports the standalone export. To rebuild the embedded sprites from the source sheets, run
`node scripts/create-character-library.mjs` with Chromium installed (or set
`CHROMIUM_PATH`). `npm test` includes desktop/mobile library coverage and decodes
all 1236 pose images. Character names belong to their respective creators.

The existing `.github/workflows/website.yml` builds and deploys the website to
GitHub Pages on pushes to `main`.

## Public Windows download

The website's **Download for Windows** button links directly to the latest public
release's `KeyCritter-Windows.exe`. Users need no GitHub account or installer.
Release notes, the optional ZIP, and SHA-256 checksums are also available at
<https://github.com/Yana20091011/web/releases/latest>.

The Windows workflow builds and tests the actual portable executable, uploads its
verified artifact, checks its checksum after transfer, and publishes public EXE/ZIP
assets only after those checks pass. Each release has its own build tag; the fixed
asset name keeps the website button current. Release publication needs the
workflow's `contents: write` permission; no personal token is required.

## Transfer a pet between website and desktop

In the playground, choose **Export pet** under **Take this pet with you**. Open the
latest desktop app (v1.4.0 or newer) and choose **Import pet**, then select the
`.keycritter.json` file. The same steps work from desktop to website or between
browsers and computers. The file includes the current design, custom images,
typing pose, animation frames and timing, movement strength, and key reactions.
No account, cloud connection, or API key is needed.

Importing saves a **new** pet in My Pets and makes it active. Existing saved pets
are preserved; repeated imports create separate copies. Malformed, unsupported,
unsafe, oversized, or unreadable files are rejected before changing the active
pet. If storage is full, importing reports an error and leaves the current pet
unchanged. The maximum transfer file size is 3 MB.

Transfer files contain pet artwork and settings only. API keys, typed playground
text, desktop position, and keyboard-monitoring permissions are not transferred.
Keyboard reactions remain paused on desktop startup until explicitly enabled.
