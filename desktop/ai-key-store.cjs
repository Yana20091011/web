const { readFile, writeFile, mkdir, unlink } = require('node:fs/promises');
const { join } = require('node:path');

function createKeyStore({ directory, safeStorage, platform = process.platform }) {
  let key = '';
  let remembered = false;
  const path = join(directory, 'ai-key.bin');
  const canRemember = () =>
    safeStorage.isEncryptionAvailable() &&
    (platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
  const status = () => ({ configured: !!key, remembered, canRemember: canRemember() });
  return {
    status,
    get: () => key,
    async load() {
      if (!canRemember()) return;
      try {
        key = safeStorage.decryptString(await readFile(path));
        remembered = !!key;
      } catch {
        key = '';
        remembered = false;
      }
    },
    async set(value, remember) {
      if (
        typeof value !== 'string' ||
        !/^[\x21-\x7e]{20,512}$/.test(value) ||
        typeof remember !== 'boolean'
      )
        throw new Error('Enter a valid OpenAI API key.');
      if (remember && !canRemember())
        throw new Error('Secure key storage is unavailable. Use a session-only connection.');
      try {
        if (remember) {
          await mkdir(directory, { recursive: true });
          await writeFile(path, safeStorage.encryptString(value), { mode: 0o600 });
        } else {
          await unlink(path).catch((e) => {
            if (e.code !== 'ENOENT') throw e;
          });
        }
      } catch {
        throw new Error('Could not save the API connection. Check your user-folder permissions.');
      }
      key = value;
      remembered = remember;
      return status();
    },
    async clear() {
      try {
        await unlink(path);
      } catch (e) {
        if (e.code !== 'ENOENT')
          throw new Error(
            'Could not remove the saved API connection. Check your user-folder permissions.',
          );
      }
      key = '';
      remembered = false;
      return status();
    },
  };
}
module.exports = { createKeyStore };
