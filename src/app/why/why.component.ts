import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { LanguageService } from '../language.service';

const XOR_KEY = 0xa7;

interface PdfPageInfo {
  width: number;
  height: number;
}

interface PdfMetadata {
  totalPages: number;
  tileRows: number;
  tileCols: number;
  pages: PdfPageInfo[];
}

interface HelpTip {
  icon: string;
  text: string;
}

const T = {
  en: {
    page: 'Page',
    of: 'of',
    openBook: 'Open Book',
    continueFrom: 'Continue from page',
    startOver: 'Start from beginning',
    savePrompt: (page: number) => `Save your progress at page ${page}?`,
    keepPrompt: (page: number) => `Keep your saved progress at page ${page}?`,
    coverAlt: 'Why Did You Survive — Cover',
    helpTips: [
      {
        icon: 'chevron_left',
        text: 'Use the arrow buttons (or ← → keys) to turn pages.',
      },
      {
        icon: 'zoom_in',
        text: 'Use + / − to zoom in and out. Click the fit-screen icon to reset.',
      },
      {
        icon: 'pan_tool',
        text: 'When zoomed in, click and drag to scroll the page.',
      },
      {
        icon: 'input',
        text: 'Type a page number in the box and press Enter to jump directly.',
      },
    ] as HelpTip[],
  },
  he: {
    page: 'עמוד',
    of: 'מתוך',
    openBook: 'פתח את הספר',
    continueFrom: 'המשך מעמוד',
    startOver: 'התחל מהתחלה',
    savePrompt: (page: number) => `לשמור את ההתקדמות בעמוד ${page}?`,
    keepPrompt: (page: number) => `לשמור את ההתקדמות בעמוד ${page}?`,
    coverAlt: 'למה שרדת — עטיפה',
    helpTips: [
      {
        icon: 'chevron_left',
        text: 'השתמש בחצים (או במקשי ← →) להפיכת עמודים.',
      },
      {
        icon: 'zoom_in',
        text: 'השתמש ב‑ + / − להגדלה והקטנה. לחץ על אייקון ההתאמה לאיפוס.',
      },
      { icon: 'pan_tool', text: 'בעת הגדלה, לחץ וגרור כדי לגלול את העמוד.' },
      {
        icon: 'input',
        text: 'הקלד מספר עמוד בתיבה ולחץ Enter כדי לקפוץ ישירות.',
      },
    ] as HelpTip[],
  },
};

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

const BOOK_FOLDER = 'why-why did you survive';

@Component({
  selector: 'app-why',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
  ],
  templateUrl: './why.component.html',
  styleUrls: ['./why.component.css'],
})
export class WhyComponent implements OnInit, OnDestroy {
  @ViewChild('pageCanvas') pageCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper') canvasWrapper!: ElementRef<HTMLDivElement>;

  metadata = signal<PdfMetadata | null>(null);
  currentPage = signal(1);
  isLoading = signal(false);
  error = signal<string | null>(null);
  showCover = signal(true);
  zoom = signal(1.0);
  showHelp = signal(false);
  isOpening = signal(false);
  savedPage = signal<number | null>(null);

  isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private scrollStartX = 0;
  private scrollStartY = 0;
  private leavingViaBeforeUnload = false;
  private readonly COOKIE_KEY = 'why_page';

  constructor(public langSvc: LanguageService) {}

  get t() {
    return T[this.langSvc.lang()];
  }
  get zoomPct() {
    return Math.round(this.zoom() * 100) + '%';
  }

  ngOnInit(): void {
    this.loadMetadata().subscribe({
      next: (data) => {
        this.metadata.set(data);
        this.savedPage.set(this.readPageCookie());
        if (!this.showCover() && this.savedPage()) {
          this.loadPage(this.currentPage());
        }
      },
      error: () => this.error.set('Could not load the local book files.'),
    });
  }

  ngOnDestroy(): void {
    if (this.leavingViaBeforeUnload) return;
    if (!this.showCover() && this.currentPage() > 1) {
      const save = window.confirm(this.t.savePrompt(this.currentPage()));
      if (save) this.writePageCookie(this.currentPage());
      else this.clearPageCookie();
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.showCover() && this.currentPage() > 1) {
      this.leavingViaBeforeUnload = true;
      this.writePageCookie(this.currentPage());
      event.preventDefault();
      event.returnValue = '';
      setTimeout(() => {
        this.leavingViaBeforeUnload = false;
        const keep = window.confirm(this.t.keepPrompt(this.currentPage()));
        if (!keep) this.clearPageCookie();
      }, 100);
    }
  }

  openBook(page = 1): void {
    this.isOpening.set(true);
    setTimeout(() => {
      this.isOpening.set(false);
      this.showCover.set(false);
      this.loadPage(page);
    }, 1400);
  }

  startFromBeginning(): void {
    this.clearPageCookie();
    this.savedPage.set(null);
    this.openBook(1);
  }

  private readPageCookie(): number | null {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + this.COOKIE_KEY + '=([^;]*)'),
    );
    if (!match) return null;
    const val = parseInt(match[1], 10);
    return isNaN(val) ? null : val;
  }

  private writePageCookie(page: number): void {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${this.COOKIE_KEY}=${page};expires=${expires.toUTCString()};path=/`;
  }

  private clearPageCookie(): void {
    document.cookie = `${this.COOKIE_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }

  toggleHelp(): void {
    this.showHelp.set(!this.showHelp());
  }

  onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    const el = this.canvasWrapper.nativeElement;
    this.scrollStartX = el.scrollLeft;
    this.scrollStartY = el.scrollTop;
    e.preventDefault();
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const el = this.canvasWrapper.nativeElement;
    el.scrollLeft = this.scrollStartX - (e.clientX - this.dragStartX);
    el.scrollTop = this.scrollStartY - (e.clientY - this.dragStartY);
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    this.isDragging = true;
    this.dragStartX = e.touches[0].clientX;
    this.dragStartY = e.touches[0].clientY;
    const el = this.canvasWrapper.nativeElement;
    this.scrollStartX = el.scrollLeft;
    this.scrollStartY = el.scrollTop;
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const el = this.canvasWrapper.nativeElement;
    el.scrollLeft =
      this.scrollStartX - (e.touches[0].clientX - this.dragStartX);
    el.scrollTop = this.scrollStartY - (e.touches[0].clientY - this.dragStartY);
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.showCover() || !this.metadata()) return;
    if (event.key === 'ArrowRight') this.prevPage();
    else if (event.key === 'ArrowLeft') this.nextPage();
  }

  zoomIn(): void {
    this.setZoom(Math.min(ZOOM_MAX, +(this.zoom() + ZOOM_STEP).toFixed(2)));
  }
  zoomOut(): void {
    this.setZoom(Math.max(ZOOM_MIN, +(this.zoom() - ZOOM_STEP).toFixed(2)));
  }
  zoomReset(): void {
    this.setZoom(1.0);
  }

  private setZoom(z: number): void {
    this.zoom.set(z);
    this.applyCanvasSize();
  }

  loadPage(page: number): void {
    const m = this.metadata();
    if (!m || page < 1 || page > m.totalPages) return;

    this.currentPage.set(page);
    this.isLoading.set(true);

    const info = m.pages[page - 1];
    const tileCount = m.tileRows * m.tileCols;
    const fetches = Array.from({ length: tileCount }, (_, i) => {
      const row = Math.floor(i / m.tileCols);
      const col = i % m.tileCols;
      return this.loadTile(page, row, col);
    });

    forkJoin(fetches).subscribe({
      next: (blobs) => {
        this.isLoading.set(false);
        this.renderTilesToCanvas(
          blobs,
          info.width,
          info.height,
          m.tileRows,
          m.tileCols,
        );
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Failed to load local page tiles.');
      },
    });
  }

  private loadMetadata(): Observable<PdfMetadata> {
    return this.loadJson<PdfMetadata>(this.assetUrl('metadata.json'));
  }

  private loadTile(page: number, row: number, col: number): Observable<Blob> {
    return this.loadBlob(this.assetUrl(`p${page}-r${row}-c${col}.png`));
  }

  private loadJson<T>(url: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(response.statusText);
          return response.json() as Promise<T>;
        })
        .then((data) => {
          subscriber.next(data);
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  private loadBlob(url: string): Observable<Blob> {
    return new Observable<Blob>((subscriber) => {
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(response.statusText);
          return response.blob();
        })
        .then((blob) => {
          subscriber.next(blob);
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  private assetUrl(fileName: string): string {
    return encodeURI(`assets/tile-cache/${BOOK_FOLDER}/${fileName}`);
  }

  private async renderTilesToCanvas(
    blobs: Blob[],
    pageW: number,
    pageH: number,
    tileRows: number,
    tileCols: number,
  ): Promise<void> {
    const canvas = this.pageCanvas?.nativeElement;
    if (!canvas) return;

    canvas.width = pageW;
    canvas.height = pageH;

    const ctx = canvas.getContext('2d')!;
    const tileW = Math.ceil(pageW / tileCols);
    const tileH = Math.ceil(pageH / tileRows);
    const decoded = await Promise.all(blobs.map((b) => this.decodeBlob(b)));

    for (let i = 0; i < decoded.length; i++) {
      ctx.putImageData(
        decoded[i],
        (i % tileCols) * tileW,
        Math.floor(i / tileCols) * tileH,
      );
    }

    this.applyCanvasSize();
  }

  private applyCanvasSize(): void {
    const canvas = this.pageCanvas?.nativeElement;
    const wrapper = this.canvasWrapper?.nativeElement;
    if (!canvas || !wrapper) return;

    const containerW = wrapper.clientWidth;
    const displayW = Math.round(containerW * this.zoom());

    canvas.style.width = displayW + 'px';
    canvas.style.height = 'auto';
  }

  private async decodeBlob(blob: Blob): Promise<ImageData> {
    const bitmap = await createImageBitmap(blob);
    const offscreen = document.createElement('canvas');
    offscreen.width = bitmap.width;
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
      const salt = (i * 31) & 0xff;
      const key = XOR_KEY ^ salt;
      const base = i * 4;
      d[base] ^= key;
      d[base + 1] ^= key;
      d[base + 2] ^= key;
    }
  }

  prevPage(): void {
    this.loadPage(this.currentPage() - 1);
  }
  nextPage(): void {
    this.loadPage(this.currentPage() + 1);
  }

  goToPage(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) this.loadPage(val);
  }
}
