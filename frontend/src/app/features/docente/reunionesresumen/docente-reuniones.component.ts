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
  rows = signal([
    { fecha:'15/04/2024', hora:'10:00', tema:'Revisión de avances', dur:'30 min', obs:'Entrega de avances' },
    { fecha:'05/04/2024', hora:'14:30', tema:'Planificación del proyecto', dur:'45 min', obs:'Anteproyecto' },
    { fecha:'25/03/2024', hora:'09:45', tema:'Revisión de informes', dur:'1 hr', obs:'Informe final' },
    { fecha:'10/03/2024', hora:'11:00', tema:'Revisión de avances', dur:'45 min', obs:'Entrega de avances' },
  ]);
}
