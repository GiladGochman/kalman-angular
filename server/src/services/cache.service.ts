import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

function tilePath(pdfName: string, page: number, row: number, col: number): string {
  const dir = path.join(config.cacheDir, pdfName);
  return path.join(dir, `p${page}-r${row}-c${col}.png`);
}

export function getCachedTile(pdfName: string, page: number, row: number, col: number): Buffer | null {
  const fp = tilePath(pdfName, page, row, col);
  if (fs.existsSync(fp)) {
    return fs.readFileSync(fp);
  }
  return null;
}

export function saveTile(pdfName: string, page: number, row: number, col: number, data: Buffer): void {
  const fp = tilePath(pdfName, page, row, col);
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fp, data);
}
