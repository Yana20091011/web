# Laptop pet artwork

These generated fan-art sheets follow the user's detailed chibi pixel-art laptop
reference. The original `../../laptop-buddy` assets remain the first pet unchanged.

`manifest.json` records each sheet's row order, character names, series, and
categories. Each row has four columns: idle, blinking, typing, and happy/waving.
All sheets have transparent backgrounds; the generator retains one transform per
row to keep pose changes aligned.

Run `node scripts/create-character-library.mjs` from the repository root to rebuild
`../characters.json` using the checked-in sheets and the original laptop buddy.
Chromium is required. No image service or API key is needed to rebuild the assets.

The roster includes 25 anime characters and 24 game characters, plus laptop buddy.
Some original game choices could not be generated; Amy Rose, Silver, Blaze, Rouge,
Mega Man, Cloud, Aerith, Sora, Ralsei, and Toriel fill those slots. Knuckles replaces
Villager to include another character from the user's style reference.
Character names belong to their respective creators.
