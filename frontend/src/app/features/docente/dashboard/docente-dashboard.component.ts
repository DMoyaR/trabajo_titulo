import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'docente-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-dashboard.component.html',
  styleUrls: ['./docente-dashboard.component.css'],
})
export class DocenteDashboardComponent {
  rows = signal([
    { estudiante:'Ana Gómez', correo:'ana@utem.cl', tipo:'TT', estado:'Público', avance:80 },
    { estudiante:'Carlos Peña', correo:'carlos@utem.cl', tipo:'Práctica', estado:'Privado', avance:40 },
    { estudiante:'José Riquelme', correo:'jose@utem.cl', tipo:'TT', estado:'Revisión', avance:55 },
    { estudiante:'Daniela Torres', correo:'dani@utem.cl', tipo:'TT', estado:'En curso', avance:25 },
  ]);
  obs = signal(''); obs2 = signal('');
}
