/**
 * Put pdf.js's worker where the browser can actually fetch it.
 *
 * The viewer used to point `workerSrc` at
 * `new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url)`. Bundlers only
 * rewrite that form for *relative* specifiers; a bare package name is left
 * alone and resolves at runtime against the chunk it happens to be in, asking
 * for `/_next/static/chunks/pdfjs-dist/build/pdf.worker.mjs`. That 404s, and
 * the reviewer sees "could not load PDF viewer" - intermittently, because
 * whether pdf.js throws or limps on with a fake worker depends on timing.
 *
 * Copying it into `public/` at build time keeps the worker byte-identical to
 * the installed pdfjs-dist, so it cannot drift out of step with the library
 * the way a hand-pasted CDN version would.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const source = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build', 'pdf.worker.min.mjs');
const target = join(here, '..', 'public', 'pdf.worker.min.mjs');

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const { version } = require('pdfjs-dist/package.json');
console.log(`pdf.worker.min.mjs copied to public/ (pdfjs-dist ${version})`);
