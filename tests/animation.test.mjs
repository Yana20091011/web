import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { frameAt, reactionDuration, validAnimations } from '../src/framePlayback.ts';
const require = createRequire(import.meta.url);
const {
  cleanPet,
  DEFAULT_PET,
  validAnimations: nativeValidAnimations,
} = require('../desktop/shared.cjs');
const image =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const clip = {
  enabled: true,
  loop: true,
  pauseMs: 3000,
  frames: [100, 80, 120].map((duration, n) => ({ id: String(n), image, duration })),
};

test('variable frame durations, blink pauses, and late timers use elapsed time', () => {
  assert.deepEqual(frameAt(clip, 0), { index: 0, nextIn: 100 });
  assert.deepEqual(frameAt(clip, 100), { index: 1, nextIn: 80 });
  assert.deepEqual(frameAt(clip, 299), { index: 2, nextIn: 1 });
  assert.deepEqual(frameAt(clip, 300), { index: 0, nextIn: 3000 });
  assert.deepEqual(frameAt(clip, 3299), { index: 0, nextIn: 1 });
  assert.deepEqual(frameAt(clip, 3400), { index: 1, nextIn: 80 });
  assert.deepEqual(frameAt({ ...clip, pauseMs: 0 }, 400), { index: 1, nextIn: 80 });
});
test('playing once holds the final frame and reactions allow one complete sequence', () => {
  assert.deepEqual(frameAt({ ...clip, loop: false }, 300), { index: 2, nextIn: null });
  const design = {
    ...DEFAULT_PET.design,
    species: 'custom',
    animations: { cheer: { ...clip, frames: clip.frames.map((f) => ({ ...f, duration: 1000 })) } },
  };
  assert.equal(reactionDuration(design, 'cheer', 1800), 3000);
  assert.equal(reactionDuration(design, 'jump', 1800), 1800);
  assert.equal(reactionDuration({ ...design, species: 'cat' }, 'cheer', 1800), 1800);
});
test('both settings boundaries accept old pets, clone frames, and reject invalid sequences', () => {
  assert.ok(cleanPet(DEFAULT_PET));
  const pet = {
    ...DEFAULT_PET,
    design: {
      ...DEFAULT_PET.design,
      species: 'custom',
      images: { idle: image },
      animations: { idle: clip },
    },
  };
  const copy = cleanPet(pet);
  assert.deepEqual(copy, pet);
  assert.notEqual(copy.design.animations.idle.frames[0], clip.frames[0]);
  const invalid = [
    null,
    [],
    { unknown: clip },
    ...[
      { frames: [] },
      { frames: Array(13).fill(clip.frames[0]) },
      { frames: [clip.frames[0], clip.frames[0]] },
      { frames: [{ ...clip.frames[0], duration: 0 }] },
      { frames: [{ ...clip.frames[0], duration: 5001 }] },
      { frames: [{ ...clip.frames[0], duration: 40.5 }] },
      { frames: [{ ...clip.frames[0], image: 'https://example.com/image.png' }] },
      { frames: [{ ...clip.frames[0], image: 'data:image/svg+xml;base64,AAAA' }] },
      { enabled: 'true' },
      { loop: null },
      { pauseMs: -1 },
      { pauseMs: 15001 },
    ].map((change) => ({ idle: { ...clip, ...change } })),
    Object.fromEntries(
      ['idle', 'jump'].map((pose) => [
        pose,
        {
          ...clip,
          frames: Array.from({ length: 12 }, (_, n) => ({
            id: String(n),
            image: 'data:image/png;base64,' + 'A'.repeat(59000),
            duration: 100,
          })),
        },
      ]),
    ),
  ];
  for (const animations of [{ idle: clip }, ...invalid]) {
    const expected = !invalid.includes(animations);
    assert.equal(validAnimations(animations), expected);
    assert.equal(nativeValidAnimations(animations), expected);
    if (!expected) assert.equal(cleanPet({ ...pet, design: { ...pet.design, animations } }), null);
  }
});
