import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../server/.env') });

export const config = {
  pdfPath: path.resolve(
    __dirname,
    '..',
    process.env['PDF_PATH'] || '../src/assets/pgishat mahzor.pdf',
  ),
  whyPdfPath: path.resolve(
    __dirname,
    '..',
    process.env['WHY_PDF_PATH'] || '../src/assets/why did you survive.pdf',
  ),
  cacheDir: path.resolve(
    __dirname,
    '..',
    process.env['CACHE_DIR'] || './tile-cache',
  ),
  port: parseInt(process.env['PORT'] || '3000', 10),
  tileRows: 4,
  tileCols: 4,
  renderDpi: 150,
  xorKey: 0xa7,
};
