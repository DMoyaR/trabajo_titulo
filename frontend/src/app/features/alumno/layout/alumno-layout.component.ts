import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface AlumnoNavItem {
  route: string;
  label: string;
  icon: string;
  alt: string;
}

@Component({
  selector: 'alumno-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './alumno-layout.component.html',
  styleUrls: ['./alumno-layout.component.css'],
})
export class AlumnoLayoutComponent {
  menuOpen = true;

  readonly navItems: AlumnoNavItem[] = [
    { route: 'notifications', label: 'Notificaciones', icon: 'assets/Notificaciones.png', alt: 'Notificaciones' },
    { route: 'bandeja', label: 'Bandeja Entrada', icon: 'assets/Bandeja_entrada.png', alt: 'Bandeja de entrada' },
    { route: 'dashboard', label: 'Inicio', icon: 'assets/Inicio.png', alt: 'Panel alumno' },
    { route: 'calendar', label: 'Calendario', icon: 'assets/Calendario.png', alt: 'Calendario' },
    { route: 'reuniones', label: 'Reuniones', icon: 'assets/Calendario.png', alt: 'Reuniones' },
    { route: 'entrega', label: 'Entregas', icon: 'assets/Bandeja_entrada.png', alt: 'Entregas' },
    { route: 'evaluations', label: 'Evaluaciones', icon: 'assets/Evaluaciones.png', alt: 'Evaluaciones' },
    { route: 'trabajo', label: 'Trabajo de Título', icon: 'assets/Procesos.png', alt: 'Trabajo de título' },
    { route: 'temas', label: 'Temas', icon: 'assets/Reportes.png', alt: 'Temas disponibles' },
    { route: 'practica', label: 'Práctica', icon: 'assets/Docentes.png', alt: 'Práctica' },

    { route: 'docs', label: 'Documentos', icon: 'assets/Reportes.png', alt: 'Documentos' },
    { route: 'viewer', label: 'Visor', icon: 'assets/LogoUTEM.png', alt: 'Visor de documentos' },

    { route: 'perfil', label: 'Perfil', icon: 'assets/Perfil.png', alt: 'Perfil' },
  ];

  constructor(private readonly router: Router) {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  logout(): void {
    const confirmed = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmed) {
      this.router.navigateByUrl('/auth/login');
    }
  }
}
