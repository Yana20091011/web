const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, access, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { generateImage, validRequest, providerError } = require('../desktop/ai.cjs');
const { createKeyStore } = require('../desktop/ai-key-store.cjs');
const { cleanPet, DEFAULT_PET } = require('../desktop/shared.cjs');
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const image = `data:image/png;base64,${png}`;
const request = { prompt: 'A tiny lavender dragon', model: 'gpt-image-1.5', pose: 'cheer' };
const key = 'sk-test-only-not-a-real-credential';

test('custom image settings preserve poses and reject external or invalid data', () => {
  const pet = {
    ...DEFAULT_PET,
    design: { ...DEFAULT_PET.design, species: 'custom', images: { idle: image, cheer: image } },
  };
  assert.deepEqual(cleanPet(pet), pet);
  for (const images of [
    { idle: 'https://example.com/pet.png' },
    { idle: 'data:image/svg+xml;base64,AAAA' },
    { idle: image, unknown: image },
    { cheer: image },
    { idle: 'data:image/png;base64,' + 'A'.repeat(220001) },
  ]) {
    assert.equal(cleanPet({ ...pet, design: { ...pet.design, images } }), null);
  }
});
test('image requests validate input and stay on the fixed OpenAI endpoint', async () => {
  let called = false;
  assert.equal(validRequest({ ...request, model: 'untrusted-url' }), false);
  await assert.rejects(
    generateImage({
      request: { ...request, prompt: '' },
      key,
      fetchImpl: () => {
        called = true;
      },
    }),
  );
  assert.equal(called, false);
  await assert.rejects(
    generateImage({
      request,
      key: '',
      fetchImpl: () => {
        called = true;
      },
    }),
    /Connect your OpenAI API key/,
  );
  const result = await generateImage({
    request,
    key,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/images/generations');
      assert.equal(options.headers.Authorization, `Bearer ${key}`);
      const body = JSON.parse(options.body);
      assert.equal(body.model, request.model);
      assert.equal(body.background, 'transparent');
      assert.equal(body.n, 1);
      assert.equal(body.output_format, 'png');
      assert.ok(body.prompt.includes(request.prompt));
      assert.ok(!body.prompt.includes(key));
      return Response.json({ data: [{ b64_json: png }] });
    },
  });
  assert.equal(result, image);
});
test('reference images use multipart edits with the same character instruction', async () => {
  const result = await generateImage({
    request: { ...request, reference: image },
    key,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/images/edits');
      assert.ok(options.body instanceof FormData);
      assert.equal(options.headers['Content-Type'], undefined);
      assert.ok(options.body.get('image') instanceof Blob);
      assert.ok(options.body.get('prompt').includes('preserve this exact character'));
      assert.equal(options.body.get('n'), '1');
      return Response.json({ data: [{ b64_json: png }] });
    },
  });
  assert.equal(result, image);
});
test('provider errors are useful without exposing response text or credentials', async () => {
  for (const code of [400, 401, 403, 404, 429, 500]) {
    await assert.rejects(
      generateImage({
        request,
        key,
        fetchImpl: async () => new Response(`Incorrect key: ${key}`, { status: code }),
      }),
      (e) => e.message === providerError(code) && !e.message.includes(key),
    );
  }
});
test('generation rejects missing or malformed image responses', async () => {
  for (const body of [
    { data: [{ url: 'https://untrusted.example/pet.png' }] },
    { data: [{ b64_json: 'bm90IGFuIGltYWdl' }] },
    {},
  ]) {
    await assert.rejects(
      generateImage({ request, key, fetchImpl: async () => Response.json(body) }),
      /usable PNG/,
    );
  }
});

test('reference expression edits request fixed body pose and placement for animation frames', async () => {
  await generateImage({
    request: {
      ...request,
      pose: 'idle',
      reference: image,
      prompt: 'The same character with half-closed eyes',
    },
    key,
    fetchImpl: async (_url, options) => {
      const prompt = options.body.get('prompt');
      assert.ok(
        prompt.includes(
          'Preserve the reference body pose, silhouette, scale, camera, and placement',
        ),
      );
      assert.ok(prompt.includes('Change only the expression details requested'));
      assert.ok(!prompt.includes('Standing in a relaxed'));
      return Response.json({ data: [{ b64_json: png }] });
    },
  });
});
test('network failures and cancellation are handled without leaking secrets', async () => {
  await assert.rejects(
    generateImage({
      request,
      key,
      fetchImpl: async () => {
        throw new Error(`network failure ${key}`);
      },
    }),
    (e) => e.message.includes('Could not reach') && !e.message.includes(key),
  );
  const controller = new AbortController();
  const pending = generateImage({
    request,
    key,
    signal: controller.signal,
    fetchImpl: (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new Error('abort'))),
      ),
  });
  controller.abort();
  await assert.rejects(pending, /cancelled or timed out/);
});

test('API keys are session-only by default and never appear in status', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'keycritter-key-'));
  try {
    const store = createKeyStore({
      directory,
      platform: 'win32',
      safeStorage: { isEncryptionAvailable: () => false },
    });
    await store.set(key, false);
    assert.equal(store.get(), key);
    assert.deepEqual(store.status(), { configured: true, remembered: false, canRemember: false });
    await assert.rejects(access(join(directory, 'ai-key.bin')));
    await assert.rejects(store.set(key, true), /Secure key storage/);
    assert.ok(!JSON.stringify(store.status()).includes(key));
    await store.clear();
    assert.equal(store.get(), '');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('remembered keys use OS encryption and can be removed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'keycritter-encrypted-'));
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (s) => Buffer.from(s).map((b) => b ^ 0xaa),
    decryptString: (b) =>
      Buffer.from(b)
        .map((v) => v ^ 0xaa)
        .toString(),
  };
  try {
    const store = createKeyStore({ directory, platform: 'win32', safeStorage });
    await store.set(key, true);
    assert.ok(!(await readFile(join(directory, 'ai-key.bin'))).includes(Buffer.from(key)));
    const restored = createKeyStore({ directory, platform: 'win32', safeStorage });
    await restored.load();
    assert.equal(restored.get(), key);
    assert.equal(restored.status().remembered, true);
    await restored.clear();
    await assert.rejects(access(join(directory, 'ai-key.bin')));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('Linux plaintext fallback is not used to remember keys', async () => {
  const store = createKeyStore({
    directory: tmpdir(),
    platform: 'linux',
    safeStorage: {
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'basic_text',
    },
  });
  assert.equal(store.status().canRemember, false);
  await assert.rejects(store.set(key, true), /Secure key storage/);
});
