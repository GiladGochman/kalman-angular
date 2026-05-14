/**
 * Pre-renders all PDF pages into obfuscated tile cache.
 * Run once with: npm run warmup
 */
import { config } from './config';
import { getPdfInfo, renderPage } from './services/renderer.service';
import { splitIntoTiles } from './services/tiler.service';
import { encodeTile } from './services/obfuscator.service';
import { getCachedTile, saveTile } from './services/cache.service';
import * as path from 'path';

async function main() {
  const pdfName = path.basename(config.pdfPath, '.pdf');
  const info = await getPdfInfo(config.pdfPath);
  console.log(`Warming up ${info.totalPages} pages...`);

  for (let p = 1; p <= info.totalPages; p++) {
    process.stdout.write(`Page ${p}/${info.totalPages}... `);
    const allCached = Array.from({ length: config.tileRows }, (_, r) =>
      Array.from({ length: config.tileCols }, (_, c) => getCachedTile(pdfName, p, r, c))
    ).flat().every(Boolean);

    if (allCached) {
      console.log('cached');
      continue;
    }

    const pageBuffer = await renderPage(config.pdfPath, p, 1.5);
    const tiles = await splitIntoTiles(pageBuffer);
    for (let r = 0; r < config.tileRows; r++) {
      for (let c = 0; c < config.tileCols; c++) {
        const encoded = await encodeTile(tiles[r][c].buffer);
        saveTile(pdfName, p, r, c, encoded);
      }
    }
    console.log('done');
  }

  console.log('Warmup complete.');
}

main().catch(console.error);
