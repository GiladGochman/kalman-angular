import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { LanguageService } from './language.service';

const T = {
  en: {
    brand: 'Kalman Gochman',
    book: '"Class Reunion"',
    why: 'Why did you survive?',
    about: 'About the author',
    footer: 'This site is a non-profit memorial for Kalman Gochman (1922–2007). All rights reserved.',
    flagSrc: 'assets/IL.svg',
    langLabel: 'עברית',
  },
  he: {
    brand: 'קלמן גוכמן',
    book: '"פגישת מחזור"',
    why: 'למה שרדת?',
    about: 'על המחבר',
    footer: 'אתר זה הוא אנדרטה ללא מטרת רווח לזכר קלמן גוכמן (1922–2007). כל הזכויות שמורות.',
    flagSrc: 'assets/GB.svg',
    langLabel: 'English',
  },
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(public langSvc: LanguageService) {}

  get t() { return T[this.langSvc.lang()]; }
  get isHe() { return this.langSvc.lang() === 'he'; }
  toggle() { this.langSvc.toggle(); }
}
