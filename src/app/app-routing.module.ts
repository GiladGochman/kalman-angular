import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { WhyComponent } from './why/why.component';
import { ReunionComponent } from './reunion/reunion.component';

const routes: Routes = [
  { path: 'about-component', component: AboutComponent },
  { path: 'why-component', component: WhyComponent },
  { path: 'reunion-component', component: ReunionComponent },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
