import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../auth.service';

interface CoordinacionNavItem {
  route: string;
  label: string;
  icon: string;
  alt: string;
}

@Component({
  selector: 'coordinacion-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './coordinacion-layout.component.html',
  styleUrls: ['./coordinacion-layout.component.css'],
})
export class CoordinacionLayoutComponent implements OnDestroy {
  menuOpen = true;

  readonly navItems: CoordinacionNavItem[] = [
    {
      route: 'notificaciones',
      label: 'Notificaciones',
      icon: 'assets/Notificaciones.png',
      alt: 'Notificaciones',
    },
    { route: 'inicio', 
      label: 'Inicio', 
      icon: 'assets/Inicio.png', 
      alt: 'Inicio' 
    },
   /* {
      route: 'bandeja',
      label: 'Bandeja de Entrada',
      icon: 'assets/Bandeja_entrada.png',
      alt: 'Bandeja de entrada',
    },*/
    {
      route: 'estudiantes',
      label: 'Estudiantes',
      icon: 'assets/Estudiantes.png',
      alt: 'Gestión de estudiantes',
    },
    {
      route: 'docentes',
      label: 'Docentes',
      icon: 'assets/Docentes.png',
      alt: 'Gestión de docentes',
    },
    {
      route: 'practicas',
      label: 'Prácticas',
      icon: 'assets/Reportes.png',
      alt: 'Gestión de prácticas',
    },
        {
      route: 'titulo',
      label: 'Trabajo de título',
      icon: 'assets/Procesos.png',
      alt: 'Promedios de trabajo de título',
    },
    { route: 'perfil', label: 'Perfil', icon: 'assets/Perfil.png', alt: 'Perfil de coordinación' },
  ];

  private readonly destroy$ = new Subject<void>();
  private activeSection = 'inicio';

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
    const destination = section || 'inicio';
    this.router.navigate(['/coordinacion', destination]).then(() => {
      if (window.innerWidth <= 768) {
        this.menuOpen = false;
      }
    });
  }

  isActive(route: string): boolean {
    return this.activeSection === route;
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
    const coordinacionIndex = segments.indexOf('coordinacion');
    if (coordinacionIndex >= 0) {
      const next = segments[coordinacionIndex + 1];
      if (next) {
        return next;
      }
    }
    return 'inicio';
  }
}