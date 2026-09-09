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
 *
 * CommonJS, and required by next.config.js as well as the npm scripts: the
 * config is loaded by every command that builds this app, including a bare
 * `next build`, which is what a host runs by default. As an ES module it could
 * only be `require`d from Node 22 onwards, and on anything older it would fail
 * quietly and deploy without the worker again.
 */
const { copyFileSync, mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');

function copyPdfWorker() {
  const source = join(
    dirname(require.resolve('pdfjs-dist/package.json')),
    'build',
    'pdf.worker.min.mjs',
  );
  const target = join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);

  const { version } = require('pdfjs-dist/package.json');
  console.log(`pdf.worker.min.mjs copied to public/ (pdfjs-dist ${version})`);
}

// Run when invoked directly by the npm scripts; exported for next.config.js.
if (require.main === module) copyPdfWorker();

module.exports = { copyPdfWorker };
