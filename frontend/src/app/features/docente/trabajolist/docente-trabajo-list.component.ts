import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent {
  menuOpen = true;

  private readonly sectionRouteMap: Record<string, string> = {
    inicio: 'dashboard',
    procesos: 'trabajo',
    reportes: 'calendario',
  };

  constructor(private router: Router) {}


  //Lógica de Código 2 (Trabajo de Título)
  tab = signal<'i' | 'ii'>('i');
  grupos = signal([
    { nombre: 'Proyecto del primer grupo', estado: 'en curso', alert: '' },
    { nombre: 'Proyecto del segundo grupo', estado: 'en riesgo', alert: '⚠️' },
    { nombre: 'Proyecto del tercer grupo', estado: 'pendiente', alert: '' },
  ]);

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a: ${section}`);
    const destination = this.sectionRouteMap[section] ?? section;
    this.router.navigate(['/docente', destination]);
  }

  logout(): void {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) {
      console.log('Cerrando sesión...');
    }
  }
}