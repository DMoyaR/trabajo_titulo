import { CommonModule } from '@angular/common';
import { AlumnoSidebarComponent } from '../shared/alumno-sidebar.component';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Component, OnDestroy } from '@angular/core';


interface AlumnoNavItem {
  route: string;
  label: string;
  icon: string;
  alt: string;
}


@Component({
  selector: 'alumno-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './alumno-layout.component.html',
  styleUrls: ['./alumno-layout.component.css'],
})
export class AlumnoLayoutComponent implements OnDestroy {
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

  private readonly highlightMap: Record<string, string> = {};

  private readonly destroy$ = new Subject<void>();
  private activeSection = 'dashboard';

  constructor(private readonly router: Router) {
    this.activeSection = this.extractSection(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(event => {
        this.activeSection = this.extractSection(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    const destination = section || 'dashboard';
    this.router.navigate(['/alumno', destination]);
  }

  isActive(route: string): boolean {
    return this.activeSection === route || this.highlightMap[this.activeSection] === route;
  }

  logout(): void {
    const confirmed = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmed) {
      this.router.navigateByUrl('/auth/login');
    }
    }

    private extractSection(url: string): string {
    const [cleanUrl] = url.split('?');
    const segments = cleanUrl.split('/').filter(Boolean);
    const alumnoIndex = segments.indexOf('alumno');
    if (alumnoIndex >= 0) {
      const next = segments[alumnoIndex + 1];
      if (next) {
        return next;
      }
    }
    return 'dashboard';
  }
}