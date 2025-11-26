import { Routes } from '@angular/router';
import { StudentCalendarComponent } from './components/student-calendar/student-calendar.component';
import { TeacherRequestsComponent } from './components/teacher-requests/teacher-requests.component';

export const routes: Routes = [
  { path: '', redirectTo: 'alumno', pathMatch: 'full' },
  { path: 'alumno', component: StudentCalendarComponent },
  { path: 'docente', component: TeacherRequestsComponent }
];
