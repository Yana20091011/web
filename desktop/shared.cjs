const { resolve, sep } = require('node:path');

const COLORS = ['#b5dbb3', '#c7b5ee', '#f1b2cb', '#f5d793', '#a9cce9'];
const ACTIONS = ['jump', 'cheer', 'surprise', 'dance', 'sleep'];
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
  validPet,
  cleanPet,
  clampPosition,
  assetPath,
};
