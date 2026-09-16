// Copies pdfjs-dist's worker file into public/ so it's served as a plain static asset.
// Referencing it via `new URL('pdfjs-dist/.../pdf.worker.min.mjs', import.meta.url)` instead
// makes webpack bundle it and Next's production build runs that bundle through Terser, which
// can't parse the worker's ESM import/export syntax and fails the whole build. Runs on every
// `npm install` so the copy never drifts out of sync with the installed pdfjs-dist version.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Copied pdf.worker.min.mjs to public/');
} else {
  console.warn('pdfjs-dist worker file not found at', src, '— skipping copy.');
}
