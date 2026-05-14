import { Router, Request, Response } from 'express';
import * as path from 'path';
import { config } from '../config';
import { getPdfInfo, renderPage, getPageDimensions } from '../services/renderer.service';
import { splitIntoTiles } from '../services/tiler.service';
import { encodeTile } from '../services/obfuscator.service';
import { getCachedTile, saveTile } from '../services/cache.service';

const router = Router();
const pdfName = path.basename(config.pdfPath, '.pdf');

router.get('/metadata', async (_req: Request, res: Response) => {
  try {
    const info = await getPdfInfo(config.pdfPath);
    const scale = 1.5;
    res.json({
      totalPages: info.totalPages,
      tileRows: config.tileRows,
      tileCols: config.tileCols,
      pageWidthPx: Math.round(info.width * scale),
      pageHeightPx: Math.round(info.height * scale),
    });
  } catch (e) {
    console.error('metadata error', e);
    res.status(500).json({ error: String(e) });
  }
});

router.get('/page/:pageNum/info', async (req: Request, res: Response) => {
  const pageNum = parseInt(req.params['pageNum'], 10);
  if (isNaN(pageNum)) { res.status(400).json({ error: 'Invalid page' }); return; }
  try {
    const dims = await getPageDimensions(config.pdfPath, pageNum, 1.5);
    res.json({ ...dims, tileRows: config.tileRows, tileCols: config.tileCols });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get('/page/:pageNum/tile/:row/:col', async (req: Request, res: Response) => {
  const pageNum = parseInt(req.params['pageNum'], 10);
  const row = parseInt(req.params['row'], 10);
  const col = parseInt(req.params['col'], 10);

  if (isNaN(pageNum) || isNaN(row) || isNaN(col)) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  try {
    const cached = getCachedTile(pdfName, pageNum, row, col);
    if (cached) {
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(cached);
      return;
    }

    const pageBuffer = await renderPage(config.pdfPath, pageNum, 1.5);
    const tiles = await splitIntoTiles(pageBuffer);

    if (row >= config.tileRows || col >= config.tileCols) {
      res.status(400).json({ error: 'Tile out of range' });
      return;
    }

    // Encode and cache all tiles for this page at once
    for (let r = 0; r < config.tileRows; r++) {
      for (let c = 0; c < config.tileCols; c++) {
        const encoded = await encodeTile(tiles[r][c].buffer);
        saveTile(pdfName, pageNum, r, c, encoded);
      }
    }

    const result = getCachedTile(pdfName, pageNum, row, col)!;
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(result);
  } catch (e) {
    console.error('tile error', e);
    res.status(500).json({ error: String(e) });
  }
});

export default router;
