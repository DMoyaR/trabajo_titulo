import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'alumno-trabajo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-trabajo.component.html',
  styleUrls: ['./alumno-trabajo.component.css']
})
export class AlumnoTrabajoComponent {
  entregas = signal([
    { nombre:'Informe de avance #2', estado:'Aprobado', fecha:'15 de abril' }
  ]);
}
