/**
 * Copies tile-cache metadata.json files into src/assets/ so Vercel serves them.
 * Run after warmup: node scripts/copy-metadata.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TILE_CACHE = path.resolve(__dirname, '../tile-cache');
const ASSETS = path.resolve(__dirname, '../src/assets');

for (const entry of fs.readdirSync(TILE_CACHE)) {
  const src = path.join(TILE_CACHE, entry, 'metadata.json');
  if (!fs.existsSync(src)) continue;

  let dest;
  if (entry.startsWith('book-')) dest = path.join(ASSETS, 'book-metadata.json');
  else if (entry.startsWith('why-')) dest = path.join(ASSETS, 'why-metadata.json');
  else continue;

  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} → ${dest}`);
}
