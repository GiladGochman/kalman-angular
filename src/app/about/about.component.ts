import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { LanguageService } from '../language.service';

const T = {
  en: [
    `Kalman Gochman (1922–2007) was the author of the books "Class Reunion" and "Why did you survive?" in which he wrote a personal narrative of his experience of the Holocaust, and how he survived nine concentration and labor camps, including Auschwitz, Majdanek, and Mauthausen.`,
    `Kalman immigrated to Israel in 1958 and lived there since, with his loving wife Galia and children: Simcha, Rivka (and from his first marriage) Tanya.`,
    `He was talented in many arts including playing the Violin, oil painting and various percussion instruments.`,
    `The first book — "Class Reunion" — was written in Yiddish as soon as Kalman was freed from the camps by the American army, and later was translated to Hebrew and published by him.`,
  ],
  he: [
    `קלמן גוכמן (1922–2007) היה מחברם של הספרים "פגישת מחזור" ו"למה שרדת?" בהם כתב נרטיב אישי על חווייתו בשואה, וכיצד שרד תשעה מחנות ריכוז ועבודה, כולל אושוויץ, מיידנק ומאוטהאוזן.`,
    `קלמן עלה לישראל ב-1958 וחי שם מאז, עם אשתו האהובה גליה וילדיו: שמחה, רבקה (ומנישואיו הראשונים) טניה.`,
    `הוא היה מוכשר באמנויות רבות, כולל נגינה בכינור, ציור בשמן וכלי הקשה שונים.`,
    `הספר הראשון — "פגישת מחזור" — נכתב באידיש מיד לאחר שקלמן שוחרר מהמחנות בידי הצבא האמריקאי, ולאחר מכן תורגם לעברית ופורסם על ידו.`,
  ],
};

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  constructor(public langSvc: LanguageService) {}

  get paragraphs() { return T[this.langSvc.lang()]; }
  get isHe() { return this.langSvc.lang() === 'he'; }
}
