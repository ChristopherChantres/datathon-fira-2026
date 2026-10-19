// Copies the generated model data from ../data into public/data so Vite can serve it.
// The files in ../data are the source of truth and are never modified here.
import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(webRoot, '..', 'data');
const targetDir = join(webRoot, 'public', 'data');
const files = ['model.json', 'ndvi_curves.json', 'parcels.geojson'];

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = join(sourceDir, file);
  if (!existsSync(source)) {
    console.error(`sync-data: missing ${source}`);
    process.exit(1);
  }
  const target = join(targetDir, file);
  copyFileSync(source, target);
  // The originals may be owner-only; the copies must be world-readable for nginx.
  chmodSync(target, 0o644);
}

console.log(`sync-data: copied ${files.length} files to public/data`);
