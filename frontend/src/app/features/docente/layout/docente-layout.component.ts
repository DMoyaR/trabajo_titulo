import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from '../../../auth.service';

interface DocenteNavItem {
  route: string;
  label: string;
  icon: string;
  alt: string;
}

@Component({
  selector: 'docente-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './docente-layout.component.html',
  styleUrls: ['./docente-layout.component.css'],
})
export class DocenteLayoutComponent implements OnDestroy {
  menuOpen = true;

  readonly navItems: DocenteNavItem[] = [
    { route: 'notificaciones', label: 'Notificaciones', icon: 'assets/Notificaciones.png', alt: 'Notificaciones' },
    { route: 'bandeja', label: 'Bandeja de Entrada', icon: 'assets/Bandeja_entrada.png', alt: 'Bandeja de entrada' },
    { route: 'dashboard', label: 'Panel Docente', icon: 'assets/Inicio.png', alt: 'Panel docente' },
    { route: 'trabajo', label: 'Trabajo de Título', icon: 'assets/Procesos.png', alt: 'Trabajo de título' },
    { route: 'temas', label: 'Temas', icon: 'assets/Reportes.png', alt: 'Temas de trabajo de título' },
    { route: 'evaluaciones', label: 'Evaluaciones', icon: 'assets/Evaluaciones.png', alt: 'Evaluaciones' },
    { route: 'calendario', label: 'Calendario', icon: 'assets/Calendario.png', alt: 'Calendario' },
    { route: 'perfil', label: 'Perfil', icon: 'assets/Perfil.png', alt: 'Perfil' },
  ];

  private readonly highlightMap: Record<string, string> = {
    trabajodetalle: 'trabajo',
    reuniones: 'calendario',
  };

  private readonly destroy$ = new Subject<void>();
  private activeSection = 'dashboard';

    constructor(private readonly router: Router, private readonly authService: AuthService) {
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
    this.router.navigate(['/docente', destination]);
  }

  isActive(route: string): boolean {
    return this.activeSection === route || this.highlightMap[this.activeSection] === route;
  }

  logout(): void {
    if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      return;
    }

    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => this.router.navigateByUrl('/auth/login'),
    });
  }

  private extractSection(url: string): string {
    const [cleanUrl] = url.split('?');
    const segments = cleanUrl.split('/').filter(Boolean);
    const docenteIndex = segments.indexOf('docente');
    if (docenteIndex >= 0) {
      const next = segments[docenteIndex + 1];
      if (next) {
        return next;
      }
    }
    return 'dashboard';
  }
}
