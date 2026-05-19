/**
 * Uploads pre-generated tiles to Vercel Blob.
 *
 * Prerequisites:
 *   1. Go to your Vercel project → Storage → Create Blob store
 *   2. Copy the BLOB_READ_WRITE_TOKEN from the store's settings
 *
 * Run:
 *   $env:BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxx"
 *   node scripts/upload-tiles.mjs
 *
 * On the first run it prints the base URL — paste that into environment.prod.ts.
 * Subsequent runs skip already-uploaded files.
 */

import { put, head } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TILE_CACHE = path.resolve(__dirname, '../tile-cache');

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Missing env var: BLOB_READ_WRITE_TOKEN');
  process.exit(1);
}

// Maps local pdfName dirs to the short prefix used by the Angular app
const DIR_TO_PREFIX = {};
for (const entry of fs.readdirSync(TILE_CACHE)) {
  if (entry.startsWith('reunion-')) DIR_TO_PREFIX[entry] = 'reunion';
  else if (entry.startsWith('why-')) DIR_TO_PREFIX[entry] = 'why';
}

let baseUrl = null;
let total = 0, skipped = 0, uploaded = 0;

for (const [dir, prefix] of Object.entries(DIR_TO_PREFIX)) {
  const dirPath = path.join(TILE_CACHE, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
  console.log(`\n[${prefix}] ${files.length} tiles in ${dir}`);

  for (const file of files) {
    const blobPath = `${prefix}/${file}`;
    total++;

    const existing = await head(blobPath).catch(() => null);
    if (existing) {
      process.stdout.write('.');
      skipped++;
      if (!baseUrl) baseUrl = new URL(existing.url).origin + '/...';
      continue;
    }

    const body = fs.readFileSync(path.join(dirPath, file));
    const result = await put(blobPath, body, { access: 'public', contentType: 'image/png' });
    uploaded++;
    process.stdout.write('+');

    if (!baseUrl) {
      // Strip the path to get the store base URL
      const u = new URL(result.url);
      baseUrl = `${u.protocol}//${u.host}`;
    }
  }
  console.log();
}

console.log(`\nDone. ${uploaded} uploaded, ${skipped} skipped, ${total} total.`);
if (baseUrl) {
  console.log(`\nBase URL: ${baseUrl}`);
  console.log(`Paste into src/environments/environment.prod.ts as R2_TILES_BASE_URL.`);
}
