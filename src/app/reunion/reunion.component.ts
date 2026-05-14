import {
  Component, OnInit, AfterViewInit,
  signal, ViewChild, ElementRef,
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
}

@Component({
  selector: 'app-reunion',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatCardModule],
  templateUrl: './reunion.component.html',
  styleUrls: ['./reunion.component.css'],
})
export class ReunionComponent implements OnInit, AfterViewInit {
  @ViewChild('pageCanvas') pageCanvas!: ElementRef<HTMLCanvasElement>;

  metadata = signal<PdfMetadata | null>(null);
  currentPage = signal(1);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<PdfMetadata>('/api/metadata').subscribe({
      next: (data) => {
        this.metadata.set(data);
        this.loadPage(1);
      },
      error: () => this.error.set('Could not connect to book server. Make sure it is running.'),
    });
  }

  ngAfterViewInit(): void {}

  loadPage(page: number): void {
    const m = this.metadata();
    if (!m || page < 1 || page > m.totalPages) return;

    this.currentPage.set(page);
    this.isLoading.set(true);

    this.http.get<{ width: number; height: number; tileRows: number; tileCols: number }>(`/api/page/${page}/info`).subscribe({
      next: (info) => {
        const tileCount = info.tileRows * info.tileCols;
        const fetches = Array.from({ length: tileCount }, (_, i) => {
          const row = Math.floor(i / info.tileCols);
          const col = i % info.tileCols;
          return this.http.get(`/api/page/${page}/tile/${row}/${col}`, { responseType: 'blob' });
        });

        forkJoin(fetches).subscribe({
          next: (blobs) => {
            this.isLoading.set(false);
            this.renderTilesToCanvas(blobs, info.width, info.height, info.tileRows, info.tileCols);
          },
          error: () => {
            this.isLoading.set(false);
            this.error.set('Failed to load page tiles.');
          },
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set('Failed to load page info.');
      },
    });
  }

  private async renderTilesToCanvas(
    blobs: Blob[], pageW: number, pageH: number, tileRows: number, tileCols: number
  ): Promise<void> {
    const canvas = this.pageCanvas?.nativeElement;
    if (!canvas) return;

    canvas.width = pageW;
    canvas.height = pageH;

    const ctx = canvas.getContext('2d')!;
    const tileW = Math.ceil(pageW / tileCols);
    const tileH = Math.ceil(pageH / tileRows);

    const decoded = await Promise.all(blobs.map(blob => this.decodeBlob(blob)));

    for (let i = 0; i < decoded.length; i++) {
      const row = Math.floor(i / tileCols);
      const col = i % tileCols;
      ctx.putImageData(decoded[i], col * tileW, row * tileH);
    }
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
      const salt = (i * 31) & 0xFF;
      const key = XOR_KEY ^ salt;
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
