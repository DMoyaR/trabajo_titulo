import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AlumnoSidebarComponent } from '../shared/alumno-sidebar.component';

@Component({
  selector: 'alumno-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AlumnoSidebarComponent],
  template: `
    <div class="alumno-layout">
      <alumno-sidebar class="sidebar"></alumno-sidebar>
      <main class="content"><router-outlet /></main>
    </div>
  `,
  styles: [`
    .alumno-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100dvh;
      background: #f6f7fb;
    }
    .sidebar {
      border-right: 1px solid #e7e7e7;
      background: #fff;
      position: sticky;
      top: 0;
      height: 100dvh;
      overflow-y: auto;
    }
    .content { padding: 24px; }
    @media (max-width: 1024px){ .alumno-layout { grid-template-columns: 72px 1fr; } }
    @media (max-width: 640px){
      .alumno-layout { grid-template-columns: 1fr; }
      .sidebar { position: static; height: auto; }
    }
  `]
})
export class AlumnoLayoutComponent {}
