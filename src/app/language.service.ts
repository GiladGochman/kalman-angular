import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'he';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  lang = signal<Lang>('en');
  toggle(): void { this.lang.set(this.lang() === 'en' ? 'he' : 'en'); }
}
