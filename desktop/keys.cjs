// Match physical US-layout keys. No typed text is assembled or retained.
function createKeyDecoder(keys) {
  const plain = new Map();
  const shifted = new Map();
  for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    plain.set(keys[char], char.toLowerCase());
  for (const name of [
    'Enter',
    'Backspace',
    'Tab',
    'Escape',
    'Delete',
    'Insert',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
  ])
    plain.set(keys[name], name);
  for (let n = 1; n <= 24; n++) plain.set(keys[`F${n}`], `F${n}`);
  plain.set(keys.Space, ' ');
  for (const [name, a, b] of [
    ['Semicolon', ';', ':'],
    ['Equal', '=', '+'],
    ['Comma', ',', '<'],
    ['Minus', '-', '_'],
    ['Period', '.', '>'],
    ['Slash', '/', '?'],
    ['Backquote', '`', '~'],
    ['BracketLeft', '[', '{'],
    ['Backslash', '\\', '|'],
    ['BracketRight', ']', '}'],
    ['Quote', "'", '"'],
  ]) {
    plain.set(keys[name], a);
    shifted.set(keys[name], b);
  }
  [...')!@#$%^&*('].forEach((char, n) => shifted.set(keys[String(n)], char));
  for (let n = 0; n <= 9; n++) plain.set(keys[`Numpad${n}`], String(n));
  plain.set(keys.NumpadEnter, 'Enter');
  for (const [name, char] of [
    ['NumpadAdd', '+'],
    ['NumpadSubtract', '-'],
    ['NumpadMultiply', '*'],
    ['NumpadDivide', '/'],
    ['NumpadDecimal', '.'],
  ])
    plain.set(keys[name], char);
  return (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return null;
    return (
      (event.shiftKey ? shifted.get(event.keycode) : undefined) ?? plain.get(event.keycode) ?? null
    );
  };
}

function createReactionFilter(decode, emit, now = Date.now) {
  let bindings = [];
  let last = -Infinity;
  return {
    configure(reactions) {
      bindings = reactions.map(({ id, key }) => ({
        id,
        key: key.length === 1 ? key.toLowerCase() : key,
      }));
    },
    handle(event) {
      const key = decode(event);
      if (key === null) return;
      const time = now();
      if (time - last < 95) return;
      last = time;
      const match = bindings.find((r) => r.key === key);
      // Only an opaque reaction id or generic activity leaves this process.
      if (match) emit({ type: 'reaction', id: match.id });
      else if (key.length === 1 || key === 'Enter' || key === 'Backspace')
        emit({ type: 'activity' });
    },
  };
}
module.exports = { createKeyDecoder, createReactionFilter };
