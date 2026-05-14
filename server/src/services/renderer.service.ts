import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createCanvas: (w: number, h: number) => any;
function ensureLoaded(): void {
  if (pdfjsLib) return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

  // Point to the bundled worker (required for pdfjs to function in Node.js)
  pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(
    __dirname,
    '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.js'
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
}

// NodeCanvasFactory tells pdfjs how to create canvases for image XObjects
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: { canvas: any; context: any }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

export interface PageInfo {
  width: number;
  height: number;
  totalPages: number;
}

export async function getPdfInfo(pdfPath: string): Promise<PageInfo> {
  ensureLoaded();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const totalPages = doc.numPages;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  await doc.destroy();
  return {
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    totalPages,
  };
}

export async function renderPage(pdfPath: string, pageNum: number, scale = 1.5): Promise<Buffer> {
  ensureLoaded();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const canvasFactory = new NodeCanvasFactory();
  const doc = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    canvasFactory,
  }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;
  await doc.destroy();

  return canvas.toBuffer('image/png') as Buffer;
}
