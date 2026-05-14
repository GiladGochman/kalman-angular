import {
  Component, OnInit, AfterViewChecked,
  signal, computed, QueryList, ViewChildren, ElementRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';

const XOR_KEY = 0xA7;

interface PdfMetadata {
  totalPages: number;
  tileRows: number;
  tileCols: number;
  pageWidthPx: number;
  pageHeightPx: number;
}

@Component({
  selector: 'app-reunion',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatCardModule],
  templateUrl: './reunion.component.html',
  styleUrls: ['./reunion.component.css'],
})
export class ReunionComponent implements OnInit, AfterViewChecked {
  @ViewChildren('tileCanvas') tileCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  metadata = signal<PdfMetadata | null>(null);
  currentPage = signal(1);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Pending draw work: set when tiles arrive before canvases are in the DOM
  private pendingDraws: Array<{ index: number; imageData: ImageData }> = [];
  private canvasesReady = false;

  tileSlots = computed(() => {
    const m = this.metadata();
    if (!m) return [];
    const slots: { row: number; col: number; key: string }[] = [];
    for (let r = 0; r < m.tileRows; r++) {
      for (let c = 0; c < m.tileCols; c++) {
        slots.push({ row: r, col: c, key: `${r}-${c}` });
      }
    }
    return slots;
  });

  tileWidth = computed(() => {
    const m = this.metadata();
    return m ? Math.ceil(m.pageWidthPx / m.tileCols) : 0;
  });

  tileHeight = computed(() => {
    const m = this.metadata();
    return m ? Math.ceil(m.pageHeightPx / m.tileRows) : 0;
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<PdfMetadata>('/api/metadata').subscribe({
      next: (data) => {
        this.metadata.set(data);
        this.loadPage(1);
      },
      error: (err) => this.error.set('Could not connect to book server. Make sure it is running.'),
    });
  }

  ngAfterViewChecked(): void {
    if (this.pendingDraws.length && this.tileCanvases.length) {
      const draws = [...this.pendingDraws];
      this.pendingDraws = [];
      for (const { index, imageData } of draws) {
        this.drawToCanvas(index, imageData);
      }
    }
  }

  loadPage(page: number): void {
    const m = this.metadata();
    if (!m || page < 1 || page > m.totalPages) return;

    this.currentPage.set(page);
    this.isLoading.set(true);
    this.canvasesReady = false;
    this.pendingDraws = [];

    const tileCount = m.tileRows * m.tileCols;
    const fetches = Array.from({ length: tileCount }, (_, i) => {
      const row = Math.floor(i / m.tileCols);
      const col = i % m.tileCols;
      return this.http.get(`/api/page/${page}/tile/${row}/${col}`, { responseType: 'blob' });
    });

    forkJoin(fetches).subscribe({
      next: (blobs) => {
        this.isLoading.set(false);
        blobs.forEach((blob, index) => this.decodeBlobToCanvas(index, blob));
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to load page tiles.');
      },
    });
  }

  private async decodeBlobToCanvas(index: number, blob: Blob): Promise<void> {
    const bitmap = await createImageBitmap(blob);
    const offscreen = document.createElement('canvas');
    offscreen.width = bitmap.width;
    offscreen.height = bitmap.height;
    const ctx = offscreen.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    this.decodeImageData(imageData);
    this.drawToCanvas(index, imageData);
  }

  private decodeImageData(imageData: ImageData): void {
    const d = imageData.data;
    const pixelCount = d.length / 4;
    for (let i = 0; i < pixelCount; i++) {
      const salt = (i * 31) & 0xFF;
      const key = XOR_KEY ^ salt;
      const base = i * 4;
      d[base]     ^= key;
      d[base + 1] ^= key;
      d[base + 2] ^= key;
    }
  }

  private drawToCanvas(index: number, imageData: ImageData): void {
    const canvasEl = this.tileCanvases?.get(index)?.nativeElement;
    if (!canvasEl) {
      this.pendingDraws.push({ index, imageData });
      return;
    }
    canvasEl.width = imageData.width;
    canvasEl.height = imageData.height;
    canvasEl.getContext('2d')!.putImageData(imageData, 0, 0);
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
