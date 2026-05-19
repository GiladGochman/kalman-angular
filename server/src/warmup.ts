/**
 * Pre-renders all PDF pages into obfuscated tile cache.
 * Run once with: npm run warmup
 * Also writes tile-cache/<pdfName>/metadata.json for static hosting.
 */
import { config } from './config';
import { getPdfInfo, getPageDimensions, renderPage } from './services/renderer.service';
import { splitIntoTiles } from './services/tiler.service';
import { encodeTile } from './services/obfuscator.service';
import { getCachedTile, saveTile } from './services/cache.service';
import * as fs from 'fs';
import * as path from 'path';

interface BookConfig { key: string; pdfPath: string; }

async function warmBook({ key, pdfPath }: BookConfig): Promise<void> {
  const pdfName = `${key}-${path.basename(pdfPath, '.pdf')}`;
  const info = await getPdfInfo(pdfPath);
  console.log(`\n[${key}] Warming up ${info.totalPages} pages...`);

  const pageDimensions: { width: number; height: number }[] = [];

  for (let p = 1; p <= info.totalPages; p++) {
    process.stdout.write(`  Page ${p}/${info.totalPages}... `);

    const dims = await getPageDimensions(pdfPath, p, 1.5);
    pageDimensions.push(dims);

    const allCached = Array.from({ length: config.tileRows }, (_, r) =>
      Array.from({ length: config.tileCols }, (_, c) => getCachedTile(pdfName, p, r, c))
    ).flat().every(Boolean);

    if (allCached) {
      console.log('cached');
      continue;
    }

    const pageBuffer = await renderPage(pdfPath, p, 1.5);
    const tiles = await splitIntoTiles(pageBuffer);
    for (let r = 0; r < config.tileRows; r++) {
      for (let c = 0; c < config.tileCols; c++) {
        const encoded = await encodeTile(tiles[r][c].buffer);
        saveTile(pdfName, p, r, c, encoded);
      }
    }
    console.log('done');
  }

  const metadata = {
    totalPages: info.totalPages,
    tileRows: config.tileRows,
    tileCols: config.tileCols,
    pages: pageDimensions,
  };
  const metaPath = path.join(config.cacheDir, pdfName, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  console.log(`[${key}] Wrote ${metaPath}`);
}

async function main() {
  await warmBook({ key: 'reunion', pdfPath: config.pdfPath });
  await warmBook({ key: 'why', pdfPath: config.whyPdfPath });
  console.log('\nWarmup complete.');
}

main().catch(console.error);
