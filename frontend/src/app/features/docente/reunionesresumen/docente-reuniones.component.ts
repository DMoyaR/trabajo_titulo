import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'docente-reuniones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-reuniones.component.html',
  styleUrls: ['./docente-reuniones.component.css'],
})
export class DocenteReunionesComponent {
 menuOpen = true;

  // 🚀 Datos de reuniones
  rows = signal([
    { 
      fecha: '15/04/2024', 
      hora: '10:00', 
      tema: 'Revisión de avances', 
      dur: '30 min', 
      obs: 'Entrega de avances' 
    },
    { 
      fecha: '05/04/2024', 
      hora: '14:30', 
      tema: 'Planificación del proyecto', 
      dur: '45 min', 
      obs: 'Anteproyecto' 
    },
    { 
      fecha: '25/03/2024', 
      hora: '09:45', 
      tema: 'Revisión de informes', 
      dur: '1 hr', 
      obs: 'Informe final' 
    },
    { 
      fecha: '10/03/2024', 
      hora: '11:00', 
      tema: 'Revisión de avances', 
      dur: '45 min', 
      obs: 'Entrega de avances' 
    },
  ]);

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a: ${section}`);
  }

  logout(): void {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) {
      console.log('Cerrando sesión...');
    }
  }
}