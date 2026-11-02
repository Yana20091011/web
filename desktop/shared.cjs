const { resolve, sep } = require('node:path');

const COLORS = ['#b5dbb3', '#c7b5ee', '#f1b2cb', '#f5d793', '#a9cce9'];
const ACTIONS = ['jump', 'cheer', 'surprise', 'dance', 'sleep'];
function validAnimations(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  let length = 0;
  const entries = Object.entries(value);
  return (
    entries.length <= 6 &&
    entries.every(([pose, clip]) => {
      if (
        !['idle', ...ACTIONS].includes(pose) ||
        !clip ||
        typeof clip !== 'object' ||
        typeof clip.enabled !== 'boolean' ||
        typeof clip.loop !== 'boolean' ||
        !Number.isInteger(clip.pauseMs) ||
        clip.pauseMs < 0 ||
        clip.pauseMs > 15000 ||
        !Array.isArray(clip.frames) ||
        !clip.frames.length ||
        clip.frames.length > 12
      )
        return false;
      const ids = new Set();
      return clip.frames.every((frame) => {
        if (
          !frame ||
          typeof frame.id !== 'string' ||
          !frame.id.length ||
          frame.id.length > 100 ||
          ids.has(frame.id) ||
          typeof frame.image !== 'string' ||
          frame.image.length > 60000 ||
          !/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(frame.image) ||
          !Number.isInteger(frame.duration) ||
          frame.duration < 40 ||
          frame.duration > 5000
        )
          return false;
        ids.add(frame.id);
        length += frame.image.length;
        return length <= 900000;
      });
    })
  );
}
function validImages(images) {
  if (!images || typeof images !== 'object' || Array.isArray(images)) return false;
  const entries = Object.entries(images);
  return (
    entries.length <= 6 &&
    entries.every(
      ([slot, data]) =>
        ['idle', ...ACTIONS].includes(slot) &&
        typeof data === 'string' &&
        data.length <= 220000 &&
        /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(data),
    )
  );
}
const DEFAULT_PET = {
  design: { name: 'Mochi', species: 'cat', color: COLORS[0], size: 100, accessory: 'bow' },
  reactions: [
    { id: 'space', key: ' ', action: 'jump', phrase: 'Wheee!' },
    { id: 'enter', key: 'Enter', action: 'cheer', phrase: 'You got this!' },
    { id: 'backspace', key: 'Backspace', action: 'surprise', phrase: 'A little plot twist!' },
  ],
};

function validPet(pet) {
  if (!pet || typeof pet !== 'object') return false;
  const { design: d, reactions: rs } = pet;
  return (
    !!d &&
    typeof d.name === 'string' &&
    d.name.length <= 24 &&
    ['cat', 'bunny', 'blob', 'custom'].includes(d.species) &&
    (d.images === undefined || validImages(d.images)) &&
    (d.animations === undefined || validAnimations(d.animations)) &&
    (d.species !== 'custom' || (validImages(d.images) && typeof d.images.idle === 'string')) &&
    COLORS.includes(d.color) &&
    Number.isFinite(d.size) &&
    d.size >= 70 &&
    d.size <= 125 &&
    ['bow', 'glasses', 'star', 'none'].includes(d.accessory) &&
    Array.isArray(rs) &&
    rs.length <= 30 &&
    rs.every(
      (r) =>
        r &&
        typeof r.id === 'string' &&
        r.id.length <= 100 &&
        typeof r.key === 'string' &&
        r.key.length > 0 &&
        r.key.length <= 20 &&
        ACTIONS.includes(r.action) &&
        typeof r.phrase === 'string' &&
        r.phrase.length <= 80,
    ) &&
    new Set(rs.map((r) => r.id)).size === rs.length &&
    new Set(rs.map((r) => r.key.toLowerCase())).size === rs.length
  );
}

function cleanPet(pet) {
  if (!validPet(pet)) return null;
  const { name, species, color, size, accessory } = pet.design;
  return {
    design: {
      name,
      species,
      color,
      size,
      accessory,
      ...(pet.design.images ? { images: { ...pet.design.images } } : {}),
      ...(pet.design.animations
        ? {
            animations: Object.fromEntries(
              Object.entries(pet.design.animations).map(([pose, clip]) => [
                pose,
                {
                  enabled: clip.enabled,
                  loop: clip.loop,
                  pauseMs: clip.pauseMs,
                  frames: clip.frames.map(({ id, image, duration }) => ({ id, image, duration })),
                },
              ]),
            ),
          }
        : {}),
    },
    reactions: pet.reactions.map(({ id, key, action, phrase }) => ({ id, key, action, phrase })),
  };
}

function clampPosition(position, workArea, width = 290, height = 390) {
  const x = Number.isFinite(position?.x) ? position.x : workArea.x + workArea.width - width - 30;
  const y = Number.isFinite(position?.y) ? position.y : workArea.y + workArea.height - height - 12;
  return {
    x: Math.round(
      Math.max(workArea.x, Math.min(x, workArea.x + Math.max(0, workArea.width - width))),
    ),
    y: Math.round(
      Math.max(workArea.y, Math.min(y, workArea.y + Math.max(0, workArea.height - height))),
    ),
  };
}

function assetPath(root, url) {
  const u = new URL(url);
  if (u.protocol !== 'keycritter:' || u.host !== 'app') return null;
  let path;
  try {
    path = decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
  const absolute = resolve(root, `.${path === '/' ? '/index.html' : path}`);
  return absolute.startsWith(resolve(root) + sep) ? absolute : null;
}

module.exports = {
  DEFAULT_PET,
  ACTIONS,
  validImages,
  validAnimations,
  validPet,
  cleanPet,
  clampPosition,
  assetPath,
};
