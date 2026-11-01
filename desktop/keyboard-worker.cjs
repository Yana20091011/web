const { createKeyDecoder, createReactionFilter } = require('./keys.cjs');
let hook;
let filter;
let started = false;

process.parentPort.on('message', ({ data }) => {
  if (data?.type !== 'configure' || !Array.isArray(data.reactions)) return;
  try {
    if (!hook) {
      const { uIOhook, UiohookKey } = require('uiohook-napi');
      hook = uIOhook;
      filter = createReactionFilter(createKeyDecoder(UiohookKey), (message) =>
        process.parentPort.postMessage(message),
      );
      hook.on('keydown', (event) => filter.handle(event));
    }
    filter.configure(data.reactions);
    if (!started) {
      hook.start();
      started = true;
      process.parentPort.postMessage({ type: 'ready' });
    }
  } catch {
    process.parentPort.postMessage({ type: 'failed' });
  }
});
