import * as fs from 'fs';
import * as path from 'path';

// pdfjs-dist v4 is ESM-only. We import it dynamically so this CommonJS
// ts-node process can use it.
// The 'canvas' package provides a Node.js Canvas implementation for rendering.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createCanvas: (w: number, h: number) => any;

async function ensureLoaded(): Promise<void> {
  if (pdfjsLib) return;

  // pdfjs-dist v3 ships a CommonJS-compatible build at build/pdf.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;

  // Disable worker in Node.js environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
}

export interface PageInfo {
  width: number;
  height: number;
  totalPages: number;
}

export async function getPdfInfo(pdfPath: string): Promise<PageInfo> {
  await ensureLoaded();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  await doc.destroy();
  return {
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    totalPages: doc.numPages,
  };
}

export async function renderPage(pdfPath: string, pageNum: number, scale = 1.5): Promise<Buffer> {
  await ensureLoaded();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;
  await doc.destroy();

  return canvas.toBuffer('image/png') as Buffer;
}
