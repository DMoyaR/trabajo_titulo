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
  
  { path: 'alumno', loadChildren: () => 
      import('./features/alumno/alumno.routes')
        .then(m => m.ALUMNO_ROUTES) },

   // --- DOCENTE ---
  {
    path: 'docente',
    loadComponent: () =>
      import('./features/docente/layout/docente-layout.component')
        .then(m => m.DocenteLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

        { path: 'calendario',
        loadComponent: () =>
          import('./features/docente/calendario/calendario.component')
            .then(m => m.CalendarioComponent) },

        { path: 'dashboard',
        loadComponent: () =>
          import('./features/docente/dashboard/docente-dashboard.component')
            .then((m) => m.DocenteDashboardComponent), },

        { path: 'notificaciones',
        loadComponent: () =>
          import('./features/docente/notificaciones/docente-notificaciones.component')
            .then((m) => m.DocenteNotificacionesComponent), },

        { path: 'trabajo',
        loadComponent: () =>
          import('./features/docente/trabajolist/docente-trabajo-list.component')
            .then((m) => m.DocenteTrabajoListComponent), },

        { path: 'temas',
        loadComponent: () =>
          import('./features/docente/temas/docente-temas.component')
            .then((m) => m.DocenteTemasComponent), },

        { path: 'trabajodetalle',
        loadComponent: () =>
          import('./features/docente/trabajodetalle/docente-trabajo-detalle.component')
            .then((m) => m.DocenteTrabajoDetalleComponent), },

        { path: 'subirarchivo',
        loadComponent: () =>
          import('./features/docente/subirarchivo/subirarchivo.component')
            .then((m) => m.SubirArchivoComponent), },

        { path: 'evaluaciones',
        loadComponent: () =>
          import('./features/docente/evaluaciones/docente-evaluaciones.component')
            .then((m) => m.DocenteEvaluacionesComponent), },

        { path: 'reuniones',
        loadComponent: () =>
          import('./features/docente/reunionesresumen/docente-reuniones.component')
            .then((m) => m.DocenteReunionesComponent),},

        { path: 'bandeja',
        loadComponent: () =>
          import('./features/docente/bandejachat/docente-bandeja.component')
            .then((m) => m.DocenteBandejaComponent), },

        { path: 'perfil',
        loadComponent: () =>
          import('./features/docente/perfil/docente-perfil.component')
            .then((m) => m.DocentePerfilComponent), },
    ],
  },
        
   // --- COORDINACIÓN ---
  {
    path: 'coordinacion',
    loadComponent: () =>
      import('./features/coordinacion/layout/coordinacion-layout.component')
        .then(m => m.CoordinacionLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/coordinacion/inicio/coordinacion.component')
            .then(m => m.CoordinacionComponent),
      },
      {
        path: 'notificaciones',
        loadComponent: () =>
          import('./features/coordinacion/Notificacion/notificacion.component')
            .then(m => m.CoordinacionNotificacionComponent),
      },
      {
        path: 'bandeja',
        loadComponent: () =>
          import('./features/coordinacion/Bandeja/bandeja.component')
            .then(m => m.CoordinacionBandejaComponent),
      },
      {
        path: 'estudiantes',
        loadComponent: () =>
          import('./features/coordinacion/estudiantes/estudiantes.component')
            .then(m => m.CoordinacionEstudiantesComponent),
      },
      {
        path: 'docentes',
        loadComponent: () =>
          import('./features/coordinacion/Docentes/docentes.component')
            .then(m => m.CoordinacionDocentesComponent),
      },
      {
        path: 'practicas',
        loadComponent: () =>
          import('./features/coordinacion/practicas/practicas.component')
            .then(m => m.PracticasComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/coordinacion/Perfil/perfil.component')
            .then(m => m.CoordinacionPerfilComponent),
      },
    ],
  },

    // --- REDIRECCIONES ---
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', redirectTo: 'auth/login' },
];