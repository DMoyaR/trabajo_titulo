import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-evaluaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-evaluaciones.component.html',
  styleUrls: ['./docente-evaluaciones.component.css'],
})
export class DocenteEvaluacionesComponent {
  rows = signal([
    { estudiante: 'Ana Gómez', seccion: 'A-01', estado: 'Por evaluar', proy: 'TT I' },
    { estudiante: 'José Riquelme', seccion: 'A-01', estado: 'Entregado', proy: 'TT I' },
    { estudiante: 'Daniela Torres', seccion: 'B-02', estado: 'Revisión', proy: 'Práctica' },
  ]);
}
