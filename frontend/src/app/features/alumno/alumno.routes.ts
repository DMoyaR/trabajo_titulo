import { Routes } from '@angular/router';
import { AlumnoLayoutComponent } from './layout/alumno-layout.component';
import { Component } from '@angular/core';
// IMPORTA TUS COMPONENTES REALES SI YA EXISTEN.
// Dejo placeholders con nombres claros por si aún no los tienes.
import { AlumnoDashboardComponent } from './dashboard/alumno-dashboard.component';
import { AlumnoCalendarComponent } from './calendar/alumno-calendar.component';
import { AlumnoNotificationsComponent } from './notifications/alumno-notifications.component';
import { AlumnoTrabajoComponent } from './trabajo/alumno-trabajo.component';
import { AlumnoPerfilComponent } from './perfil/alumno-perfil.component';
import { AlumnoReunionesComponent } from './reuniones/alumno-reuniones.component';
import { AlumnoBandejaComponent } from './bandeja/alumno-bandeja.component';
import { AlumnoDocsComponent } from './docs/alumno-docs.component';
import { AlumnoEvaluationsComponent } from './evaluations/alumno-evaluations.component';
import { AlumnoEntregaComponent } from './entrega/alumno-entrega.component';
import { AlumnoPracticaComponent } from './practica/alumno-practica.component';
import { AlumnoViewerComponent } from './viewer/alumno-viewer.component';

export const ALUMNO_ROUTES: Routes = [
  {

    path: '',
    component: AlumnoLayoutComponent,
    
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      { path: 'dashboard',      component: AlumnoDashboardComponent,     title: 'Alumno | Dashboard' },
      { path: 'calendar',       component: AlumnoCalendarComponent,      title: 'Alumno | Calendar' },
      { path: 'notifications',  component: AlumnoNotificationsComponent, title: 'Alumno | Notifications' },
      { path: 'trabajo',        component: AlumnoTrabajoComponent,       title: 'Alumno | Trabajo' },
      { path: 'perfil',         component: AlumnoPerfilComponent,        title: 'Alumno | Perfil' },
      { path: 'reuniones',      component: AlumnoReunionesComponent,     title: 'Alumno | Reuniones' },
      { path: 'bandeja',        component: AlumnoBandejaComponent,       title: 'Alumno | Bandeja' },
      { path: 'docs',           component: AlumnoDocsComponent,          title: 'Alumno | Docs' },
      { path: 'evaluations',    component: AlumnoEvaluationsComponent,   title: 'Alumno | Evaluations' },
      { path: 'entrega',        component: AlumnoEntregaComponent,       title: 'Alumno | Entrega' },
      { path: 'practica',       component: AlumnoPracticaComponent,      title: 'Alumno | Práctica' },
      { path: 'viewer',         component: AlumnoViewerComponent,        title: 'Alumno | Viewer' },

      // opcional: 404 dentro del área alumno
      // { path: '**', component: AlumnoDashboardComponent },
    ],
  },
];