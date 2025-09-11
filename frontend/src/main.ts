import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app/app';

// Rutas: login usa el componente standalone directamente.
// Los dashboards son componentes standalone de ejemplo (ver más abajo).
const routes: Routes = [
  { path: 'auth/login', loadComponent: () => import('./app/features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'alumno/dashboard', loadComponent: () => import('./app/features/alumno/dashboard/alumno-dashboard.component').then(m => m.AlumnoDashboardComponent) },
  { path: 'docente/dashboard', loadComponent: () => import('./app/features/docente/dashboard/docente-dashboard.component').then(m => m.DocenteDashboardComponent) },
  { path: 'coordinacion/inicio', loadComponent: () => import('./app/features/coordinacion/inicio/coordinacion.component').then(m => m.CoordinacionComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', redirectTo: 'auth/login' },
];

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ]
});
