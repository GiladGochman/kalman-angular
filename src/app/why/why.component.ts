import {
  Component, OnInit,
  signal, ViewChild, ElementRef, HostListener,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { LanguageService } from '../language.service';

const XOR_KEY = 0xA7;

interface PdfMetadata { totalPages: number; }

interface HelpTip { icon: string; text: string; }

const T = {
  en: {
    page: 'Page', of: 'of',
    openBook: 'Open Book',
    coverAlt: 'Why Did You Survive — Cover',
    helpTips: [
      { icon: 'chevron_left',  text: 'Use the arrow buttons (or ← → keys) to turn pages.' },
      { icon: 'zoom_in',       text: 'Use + / − to zoom in and out. Click the fit-screen icon to reset.' },
      { icon: 'pan_tool',      text: 'When zoomed in, click and drag to scroll the page.' },
      { icon: 'input',         text: 'Type a page number in the box and press Enter to jump directly.' },
    ] as HelpTip[],
  },
  he: {
    page: 'עמוד', of: 'מתוך',
    openBook: 'פתח את הספר',
    coverAlt: 'למה שרדת — עטיפה',
    helpTips: [
      { icon: 'chevron_left',  text: 'השתמש בחצים (או במקשי ← →) להפיכת עמודים.' },
      { icon: 'zoom_in',       text: 'השתמש ב‑ + / − להגדלה והקטנה. לחץ על אייקון ההתאמה לאיפוס.' },
      { icon: 'pan_tool',      text: 'בעת הגדלה, לחץ וגרור כדי לגלול את העמוד.' },
      { icon: 'input',         text: 'הקלד מספר עמוד בתיבה ולחץ Enter כדי לקפוץ ישירות.' },
    ] as HelpTip[],
  },
};

const ZOOM_STEP = 0.25;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 3.0;

@Component({
  selector: 'app-why',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatCardModule],
  templateUrl: './why.component.html',
  styleUrls: ['./why.component.css'],
})
export class WhyComponent implements OnInit {
  @ViewChild('pageCanvas')    pageCanvas!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper') canvasWrapper!: ElementRef<HTMLDivElement>;

  metadata    = signal<PdfMetadata | null>(null);
  currentPage = signal(1);
  isLoading   = signal(false);
  error       = signal<string | null>(null);
  showCover   = signal(true);
  zoom        = signal(1.0);
  showHelp    = signal(false);
  isOpening   = signal(false);

  isDragging  = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private scrollStartX = 0;
  private scrollStartY = 0;

  constructor(private http: HttpClient, public langSvc: LanguageService) {}

  get t() { return T[this.langSvc.lang()]; }
  get zoomPct() { return Math.round(this.zoom() * 100) + '%'; }

  ngOnInit(): void {
    this.http.get<PdfMetadata>('/api/why/metadata').subscribe({
      next:  (data) => this.metadata.set(data),
      error: () => this.error.set('Could not connect to book server. Make sure it is running.'),
    });
  }

  openBook(): void {
    this.isOpening.set(true);
    setTimeout(() => {
      this.isOpening.set(false);
      this.showCover.set(false);
      this.loadPage(1);
    }, 1400);
  }

  toggleHelp(): void { this.showHelp.set(!this.showHelp()); }

  onMouseDown(e: MouseEvent): void {
    this.isDragging   = true;
    this.dragStartX   = e.clientX;
    this.dragStartY   = e.clientY;
    const el = this.canvasWrapper.nativeElement;
    this.scrollStartX = el.scrollLeft;
    this.scrollStartY = el.scrollTop;
    e.preventDefault();
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const el = this.canvasWrapper.nativeElement;
    el.scrollLeft = this.scrollStartX - (e.clientX - this.dragStartX);
    el.scrollTop  = this.scrollStartY - (e.clientY - this.dragStartY);
  }

  onMouseUp(): void { this.isDragging = false; }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.showCover() || !this.metadata()) return;
    if (event.key === 'ArrowRight') this.prevPage();
    else if (event.key === 'ArrowLeft') this.nextPage();
  }

  zoomIn():    void { this.setZoom(Math.min(ZOOM_MAX, +(this.zoom() + ZOOM_STEP).toFixed(2))); }
  zoomOut():   void { this.setZoom(Math.max(ZOOM_MIN, +(this.zoom() - ZOOM_STEP).toFixed(2))); }
  zoomReset(): void { this.setZoom(1.0); }

  private setZoom(z: number): void {
    this.zoom.set(z);
    this.applyCanvasSize();
  }

  loadPage(page: number): void {
    const m = this.metadata();
    if (!m || page < 1 || page > m.totalPages) return;

    this.currentPage.set(page);
    this.isLoading.set(true);

    this.http.get<{ width: number; height: number; tileRows: number; tileCols: number }>
        (`/api/why/page/${page}/info`).subscribe({
      next: (info) => {
        const tileCount = info.tileRows * info.tileCols;
        const fetches = Array.from({ length: tileCount }, (_, i) => {
          const row = Math.floor(i / info.tileCols);
          const col = i % info.tileCols;
          return this.http.get(`/api/why/page/${page}/tile/${row}/${col}`, { responseType: 'blob' });
        });

        forkJoin(fetches).subscribe({
          next:  (blobs) => { this.isLoading.set(false); this.renderTilesToCanvas(blobs, info.width, info.height, info.tileRows, info.tileCols); },
          error: () => { this.isLoading.set(false); this.error.set('Failed to load page tiles.'); },
        });
      },
      error: () => { this.isLoading.set(false); this.error.set('Failed to load page info.'); },
    });
  }

  private async renderTilesToCanvas(
    blobs: Blob[], pageW: number, pageH: number, tileRows: number, tileCols: number
  ): Promise<void> {
    const canvas = this.pageCanvas?.nativeElement;
    if (!canvas) return;

    canvas.width  = pageW;
    canvas.height = pageH;

    const ctx   = canvas.getContext('2d')!;
    const tileW = Math.ceil(pageW / tileCols);
    const tileH = Math.ceil(pageH / tileRows);
    const decoded = await Promise.all(blobs.map(b => this.decodeBlob(b)));

    for (let i = 0; i < decoded.length; i++) {
      ctx.putImageData(decoded[i], (i % tileCols) * tileW, Math.floor(i / tileCols) * tileH);
    }

    this.applyCanvasSize();
  }

  private applyCanvasSize(): void {
    const canvas  = this.pageCanvas?.nativeElement;
    const wrapper = this.canvasWrapper?.nativeElement;
    if (!canvas || !wrapper) return;

    const containerW  = wrapper.clientWidth;
    const displayW    = Math.round(containerW * this.zoom());

    canvas.style.width  = displayW + 'px';
    canvas.style.height = 'auto';
  }

  private async decodeBlob(blob: Blob): Promise<ImageData> {
    const bitmap    = await createImageBitmap(blob);
    const offscreen = document.createElement('canvas');
    offscreen.width  = bitmap.width;
    offscreen.height = bitmap.height;
    const ctx = offscreen.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    this.decodeImageData(imageData);
    return imageData;
  }

  private decodeImageData(imageData: ImageData): void {
    const d = imageData.data;
    const pixelCount = d.length / 4;
    for (let i = 0; i < pixelCount; i++) {
      const salt = (i * 31) & 0xFF;
      const key  = XOR_KEY ^ salt;
      const base = i * 4;
      d[base]     ^= key;
      d[base + 1] ^= key;
      d[base + 2] ^= key;
    }
  }

  prevPage(): void { this.loadPage(this.currentPage() - 1); }
  nextPage(): void { this.loadPage(this.currentPage() + 1); }

  goToPage(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.loadPage(val);
  }
}
