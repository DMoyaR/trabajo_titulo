import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-evaluaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluaciones.component.html',
  styleUrls: ['./evaluaciones.component.css'],
})
export class DocenteEvaluacionesComponent {
  menuOpen = true;

  rows = signal([
    { estudiante: 'Ana Gómez', seccion: 'A-01', estado: 'Por evaluar', proy: 'TT I' },
    { estudiante: 'José Riquelme', seccion: 'A-01', estado: 'Entregado', proy: 'TT I' },
    { estudiante: 'Daniela Torres', seccion: 'B-02', estado: 'Revisión', proy: 'Práctica' },
  ]);

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a: ${section}`);
  }

  logout(): void {
    const confirmLogout = confirm('¿Seguro que deseas cerrar sesión?');
    if (confirmLogout) {
      console.log('Sesión cerrada');
    }
  }
}
