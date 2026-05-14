import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/about', pathMatch: 'full' },
  { path: 'about', loadComponent: () => import('./about/about.component').then(m => m.AboutComponent) },
  { path: 'why', loadComponent: () => import('./why/why.component').then(m => m.WhyComponent) },
  { path: 'book', loadComponent: () => import('./reunion/reunion.component').then(m => m.ReunionComponent) },
];
