import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';

// Package the production app as one file that can be opened without a server.
const root = resolve('dist');
const output = resolve(process.argv[2] || 'dist/KeyCritter.html');
const mimeTypes = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.js': 'text/javascript',
};

function assetPath(asset, base = root) {
  const path = resolve(asset.startsWith('/') ? root : base, asset.replace(/^\/+/, ''));
  if (!path.startsWith(root + sep)) throw new Error('Asset outside build directory');
  return path;
}

async function dataUrl(asset, base = root) {
  const path = assetPath(asset, base);
  const data = await readFile(path);
  return `data:${mimeTypes[extname(path)] || 'application/octet-stream'};base64,${data.toString('base64')}`;
}

let html = await readFile(resolve(root, 'index.html'), 'utf8');
const scriptTag = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const styleTag = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!scriptTag || !styleTag) throw new Error('Build the app before exporting it.');

// Lazy library chunks must travel with the standalone HTML too.
async function inlineModule(path) {
  let source = await readFile(path, 'utf8');
  const imports = [...source.matchAll(/import\(["'](\.[^"']+\.js)["']\)/g)];
  for (const match of imports) {
    const dependency = await inlineModule(assetPath(match[1], dirname(path)));
    const url = `data:text/javascript;base64,${Buffer.from(dependency).toString('base64')}`;
    source = source.replace(match[0], `import("${url}")`);
  }
  return source;
}
const script = await inlineModule(assetPath(scriptTag[1]));
const cssPath = assetPath(styleTag[1]);
let css = await readFile(cssPath, 'utf8');
const assets = [...css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)];
for (const match of assets) {
  if (!match[2].startsWith('data:'))
    css = css.replace(match[0], `url("${await dataUrl(match[2], dirname(cssPath))}")`);
}

html = html.replace(
  scriptTag[0],
  () => `<script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script>`,
);
html = html.replace(styleTag[0], () => `<style>${css}</style>`);
html = html.replace(/href="\.?\/?favicon.svg"/, `href="${await dataUrl('/favicon.svg')}"`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, html);
console.log(`Standalone website saved to ${output}`);
