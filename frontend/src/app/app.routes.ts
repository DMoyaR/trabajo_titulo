import { Routes } from '@angular/router';

export const routes: Routes = [
  // --- LOGIN ---
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent),
  },

  // --- ALUMNO ---
  {
    path: 'alumno',
    loadComponent: () =>
      import('./features/alumno/layout/alumno-layout.component')
        .then(m => m.AlumnoLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

       { path: 'dashboard',
        loadComponent: () =>
          import('./features/alumno/dashboard/alumno-dashboard.component')
            .then(m => m.AlumnoDashboardComponent) },
 
       { path: 'calendar',
        loadComponent: () =>
          import('./features/alumno/calendar/alumno-calendar.component')
            .then(m => m.AlumnoCalendarComponent) }, 

      { path: 'notifications',
        loadComponent: () =>
          import('./features/alumno/notifications/alumno-notifications.component')
            .then(m => m.AlumnoNotificationsComponent) }, 

       { path: 'docs',
        loadComponent: () =>
          import('./features/alumno/docs/alumno-docs.component')
            .then(m => m.AlumnoDocsComponent) }, 

      { path: 'entrega',
        loadComponent: () =>
          import('./features/alumno/entrega/alumno-entrega.component')
            .then(m => m.AlumnoEntregaComponent) },

      { path: 'evaluations',
        loadComponent: () =>
          import('./features/alumno/evaluations/alumno-evaluations.component')
            .then(m => m.AlumnoEvaluationsComponent) },

      { path: 'perfil',
        loadComponent: () =>
          import('./features/alumno/perfil/alumno-perfil.component')
            .then(m => m.AlumnoPerfilComponent) },

      { path: 'practica',
        loadComponent: () =>
          import('./features/alumno/practica/alumno-practica.component')
            .then(m => m.AlumnoPracticaComponent) },

      { path: 'reuniones',
        loadComponent: () =>
          import('./features/alumno/reuniones/alumno-reuniones.component')
            .then(m => m.AlumnoReunionesComponent) },

      { path: 'trabajo',
        loadComponent: () =>
          import('./features/alumno/trabajo/alumno-trabajo.component')
            .then(m => m.AlumnoTrabajoComponent) },

      { path: 'bandeja',
        loadComponent: () =>
          import('./features/alumno/bandeja/alumno-bandeja.component')
            .then(m => m.AlumnoBandejaComponent) },

      { path: 'viewer',
        loadComponent: () =>
          import('./features/alumno/viewer/alumno-viewer.component')
            .then(m => m.AlumnoViewerComponent) },
    ],
  },

   // --- DOCENTE ---
  {
    path: 'docente',
    loadComponent: () =>
      import('./features/docente/layout/docente-layout.component')
        .then(m => m.DocenteLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      /*{  path: 'dashboard',
        loadComponent: () =>
          import('./features/docente/dashboard/docente-dashboard.component')
            .then(m => m.DocenteDashboardComponent) },

      { path: 'trabajo',
        loadComponent: () =>
          import('./features/docente/trabajo-list/docente-trabajo-list.component')
            .then(m => m.DocenteTrabajoListComponent) },

      { path: 'trabajo/detalle',
        loadComponent: () =>
          import('./features/docente/trabajo-detalle/docente-trabajo-detalle.component')
            .then(m => m.DocenteTrabajoDetalleComponent) },

      { path: 'evaluaciones',
        loadComponent: () =>
          import('./features/docente/evaluaciones/docente-evaluaciones.component')
            .then(m => m.DocenteEvaluacionesComponent) },
 */
      { path: 'calendario',
        loadComponent: () =>
          import('./features/docente/calendario/calendario.component')
            .then(m => m.CalendarioComponent) },

      /* { path: 'notificaciones',
        loadComponent: () =>
          import('./features/docente/notificaciones/docente-notificaciones.component')
            .then(m => m.DocenteNotificacionesComponent) },

      { path: 'perfil',
        loadComponent: () =>
          import('./features/docente/perfil/docente-perfil.component')
            .then(m => m.DocentePerfilComponent) },

      { path: 'bandeja',
        loadComponent: () =>
          import('./features/docente/bandeja/docente-bandeja.component')
            .then(m => m.DocenteBandejaComponent) },

      { path: 'reuniones',
        loadComponent: () =>
          import('./features/docente/reuniones/docente-reuniones.component')
            .then(m => m.DocenteReunionesComponent) }, */
    ],
  },

/*   // --- COORDINACIÓN ---
  {
    path: 'coordinacion',
    loadComponent: () =>
      import('./features/coordinacion/layout/coordinacion-layout.component')
        .then(m => m.CoordinacionLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      { path: 'dashboard',
        loadComponent: () =>
          import('./features/coordinacion/dashboard/coordinacion-dashboard.component')
            .then(m => m.CoordinacionDashboardComponent) },

      { path: 'panel',
        loadComponent: () =>
          import('./features/coordinacion/panel/coordinacion-panel.component')
            .then(m => m.CoordinacionPanelComponent) },
    ],
  },  */

  // --- REDIRECCIONES ---
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', redirectTo: 'auth/login' },
];
