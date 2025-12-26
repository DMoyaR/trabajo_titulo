import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Evaluaciones (ESTUDIANTE_14/16/21)
 * - Lista el estado actual de una evaluación y abre un modal de "Subir Entrega" (mock).
 */
@Component({
  selector: 'alumno-evaluations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-evaluations.component.html',
  styleUrls: ['./alumno-evaluations.component.css'],
})
export class AlumnoEvaluationsComponent {
  showUpload = signal(false);

  // Estados de referencia
  titulo = 'anteproyecto';
  pasos = [
    { nombre: 'Inicio', estado: 'Completado' },
    { nombre: 'Revisión docente', estado: 'En revisión' },
    { nombre: 'Entrega final', estado: 'Pendiente' },
    { nombre: 'Cierre', estado: 'Pendiente' },
  ];
}
