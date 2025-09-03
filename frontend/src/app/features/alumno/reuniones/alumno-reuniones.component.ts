import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Listado simple de reuniones (ESTUDIANTE_22) */
@Component({
  selector: 'alumno-reuniones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-reuniones.component.html',
  styleUrls: ['./alumno-reuniones.component.css'],
})
export class AlumnoReunionesComponent {
  rows = signal([
    { fecha: '15/04/2024', hora: '10:00', tema: 'Revisión de avances', dur: '30 min', obs: 'Entrega de avances' },
    { fecha: '05/04/2024', hora: '14:30', tema: 'Planificación del proyecto', dur: '45 min', obs: 'Anteproyecto' },
    { fecha: '25/03/2024', hora: '09:45', tema: 'Revisión de informes', dur: '1 hr', obs: 'Informe final' },
  ]);
}
