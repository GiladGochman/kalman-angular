import sharp from 'sharp';
import { config } from '../config';

export interface Tile {
  row: number;
  col: number;
  buffer: Buffer;
}

export async function splitIntoTiles(pageBuffer: Buffer): Promise<Tile[][]> {
  const meta = await sharp(pageBuffer).metadata();
  const pageW = meta.width!;
  const pageH = meta.height!;

  const tileW = Math.ceil(pageW / config.tileCols);
  const tileH = Math.ceil(pageH / config.tileRows);

  const tiles: Tile[][] = [];

  for (let r = 0; r < config.tileRows; r++) {
    tiles[r] = [];
    for (let c = 0; c < config.tileCols; c++) {
      const left = c * tileW;
      const top = r * tileH;
      // Clamp to actual image bounds
      const width = Math.min(tileW, pageW - left);
      const height = Math.min(tileH, pageH - top);

      const buffer = await sharp(pageBuffer)
        .extract({ left, top, width, height })
        .png()
        .toBuffer();

      tiles[r][c] = { row: r, col: c, buffer };
    }
  }

  return tiles;
}
