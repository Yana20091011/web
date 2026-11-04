const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
// Representative libuiohook scan codes; pure tests don't initialize an OS hook.
const UiohookKey = {
  K: 37,
  Space: 57,
  Enter: 28,
  NumpadEnter: 3612,
  F12: 88,
  Semicolon: 39,
  Shift: 42,
  1: 2,
};
const {
  DEFAULT_PET,
  cleanPet,
  clampPosition,
  clampAnchoredPosition,
  validDragAnchor,
  assetPath,
} = require('../desktop/shared.cjs');
const { createKeyDecoder, createReactionFilter } = require('../desktop/keys.cjs');
const decode = createKeyDecoder(UiohookKey);

test('background and character identity survive native cleaning and reject unsafe values', () => {
  const pet = {
    ...DEFAULT_PET,
    design: { ...DEFAULT_PET.design, backgroundId: 'leaf-village', libraryCharacterId: 'naruto' },
  };
  assert.deepEqual(cleanPet(pet), pet);
  for (const backgroundId of [
    'unknown-scene',
    'https://example.com/background.png',
    '../private',
    null,
    {},
  ])
    assert.equal(cleanPet({ ...pet, design: { ...pet.design, backgroundId } }), null);
  for (const libraryCharacterId of ['../private', '', null, {}])
    assert.equal(cleanPet({ ...pet, design: { ...pet.design, libraryCharacterId } }), null);
  assert.deepEqual(cleanPet(DEFAULT_PET), DEFAULT_PET);
});

test('movement strength preserves old pets and validates the complete range', () => {
  assert.ok(cleanPet(DEFAULT_PET));
  for (const motionStrength of [0, 25, 100]) {
    const pet = { ...DEFAULT_PET, design: { ...DEFAULT_PET.design, motionStrength } };
    assert.deepEqual(cleanPet(pet), pet);
  }
  for (const motionStrength of [-1, 101, 25.5, null, '25', NaN, Infinity])
    assert.equal(
      cleanPet({ ...DEFAULT_PET, design: { ...DEFAULT_PET.design, motionStrength } }),
      null,
    );
});

test('desktop settings are validated and unrelated data is discarded', () => {
  assert.deepEqual(cleanPet({ ...DEFAULT_PET, typedText: 'never store this' }), DEFAULT_PET);
  assert.equal(
    cleanPet({ ...DEFAULT_PET, design: { ...DEFAULT_PET.design, color: 'url(example)' } }),
    null,
  );
  assert.equal(
    cleanPet({ ...DEFAULT_PET, reactions: [{ ...DEFAULT_PET.reactions[0], action: 'execute' }] }),
    null,
  );
  assert.equal(
    cleanPet({ ...DEFAULT_PET, reactions: [DEFAULT_PET.reactions[0], DEFAULT_PET.reactions[0]] }),
    null,
  );
});
test('key decoder handles physical letters, symbols, special keys, and modifiers', () => {
  assert.equal(decode({ keycode: UiohookKey.K }), 'k');
  assert.equal(decode({ keycode: UiohookKey.K, shiftKey: true }), 'k');
  assert.equal(decode({ keycode: UiohookKey.Space }), ' ');
  assert.equal(decode({ keycode: UiohookKey[1], shiftKey: true }), '!');
  assert.equal(decode({ keycode: UiohookKey.Semicolon, shiftKey: true }), ':');
  assert.equal(decode({ keycode: UiohookKey.Enter }), 'Enter');
  assert.equal(decode({ keycode: UiohookKey.NumpadEnter }), 'Enter');
  assert.equal(decode({ keycode: UiohookKey.F12 }), 'F12');
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey'])
    assert.equal(decode({ keycode: UiohookKey.K, [modifier]: true }), null);
  assert.equal(decode({ keycode: UiohookKey.Shift }), null);
});
test('only opaque reaction ids and generic activity leave the keyboard process', () => {
  let time = 0;
  const emitted = [];
  const filter = createReactionFilter(
    decode,
    (event) => emitted.push(event),
    () => time,
  );
  filter.configure(DEFAULT_PET.reactions);
  filter.handle({ keycode: UiohookKey.Space });
  time += 100;
  filter.handle({ keycode: UiohookKey.K });
  time += 100;
  filter.handle({ keycode: UiohookKey.Enter });
  assert.deepEqual(emitted, [
    { type: 'reaction', id: 'space' },
    { type: 'activity' },
    { type: 'reaction', id: 'enter' },
  ]);
  assert.ok(
    emitted.every((event) => !('key' in event) && !('keycode' in event) && !('text' in event)),
  );
});
test('repeated keys are throttled and changing bindings takes effect immediately', () => {
  let time = 0;
  const emitted = [];
  const filter = createReactionFilter(
    decode,
    (event) => emitted.push(event),
    () => time,
  );
  filter.configure(DEFAULT_PET.reactions);
  filter.handle({ keycode: UiohookKey.Space });
  time = 30;
  filter.handle({ keycode: UiohookKey.Space });
  assert.equal(emitted.length, 1);
  filter.configure([{ id: 'dance', key: 'K' }]);
  time = 100;
  filter.handle({ keycode: UiohookKey.K });
  assert.deepEqual(emitted[1], { type: 'reaction', id: 'dance' });
  time = 200;
  filter.handle({ keycode: UiohookKey.Space });
  assert.deepEqual(emitted[2], { type: 'activity' });
});
test('restored window positions remain visible on offset monitors and small displays', () => {
  assert.deepEqual(
    clampPosition({ x: -9000, y: 9000 }, { x: -1920, y: 0, width: 1920, height: 1080 }),
    { x: -1920, y: 690 },
  );
  assert.deepEqual(
    clampPosition({ x: NaN, y: Infinity }, { x: 0, y: 0, width: 200, height: 200 }),
    { x: 0, y: 0 },
  );
});

test('anchored placement allows transparent margins off-screen and recovers a reachable name bar', () => {
  const area = { x: 0, y: 0, width: 1440, height: 1100 };
  const placement = { x: -60, y: -140, anchor: { x: 145, y: 348 } };
  assert.deepEqual(clampAnchoredPosition(placement, area), { x: -60, y: -140 });
  assert.deepEqual(clampAnchoredPosition({ ...placement, x: -9000, y: 9000 }, area), {
    x: -137,
    y: 744,
  });
  assert.deepEqual(
    clampAnchoredPosition({ x: -9000, y: 9000 }, area),
    clampPosition({ x: -9000, y: 9000 }, area),
  );
  for (const anchor of [null, { x: -1, y: 348 }, { x: 145, y: 391 }, { x: '145', y: 348 }]) {
    assert.ok(!validDragAnchor(anchor));
    assert.deepEqual(
      clampAnchoredPosition({ ...placement, anchor }, area),
      clampPosition(placement, area),
    );
  }
});
test('the desktop asset protocol rejects other origins and path escapes', () => {
  const root = join(tmpdir(), 'keycritter-test', 'dist');
  assert.equal(assetPath(root, 'keycritter://app/index.html'), join(root, 'index.html'));
  assert.equal(assetPath(root, 'https://app/index.html'), null);
  assert.equal(assetPath(root, 'keycritter://other/index.html'), null);
  assert.equal(assetPath(root, 'keycritter://app/%2f..%2fsecrets'), null);
  assert.equal(assetPath(root, 'keycritter://app/%ZZ'), null);
});

test('library typing poses survive desktop sanitization and reject unsafe sources', () => {
  const characters = require('../src/assets/character-library/characters.json');
  for (const character of characters) {
    const pet = {
      ...DEFAULT_PET,
      design: {
        ...DEFAULT_PET.design,
        species: 'custom',
        name: character.name,
        images: { idle: character.poses.idle },
        typingImage: character.poses.typing,
      },
    };
    assert.equal(cleanPet(pet).design.typingImage, character.poses.typing);
  }
  for (const typingImage of [
    'https://example.com/pet.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    123,
    null,
  ]) {
    assert.equal(
      cleanPet({ ...DEFAULT_PET, design: { ...DEFAULT_PET.design, typingImage } }),
      null,
    );
  }
});
