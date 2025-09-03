import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Práctica Profesional (ESTUDIANTE_5/10/18/19/20)
 * - Indicadores de avance y repositorio de documentos.
 */
@Component({
  selector: 'alumno-practica',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-practica.component.html',
  styleUrls: ['./alumno-practica.component.css'],
})
export class AlumnoPracticaComponent {
  indicadores = signal([
    { etapa: 'Inicio', pct: 25 },
    { etapa: 'Entrega', pct: 60 },
    { etapa: 'Evaluación', pct: 80 },
    { etapa: 'Cierre', pct: 10 },
  ]);

  documentos = signal([
    { nombre: 'Certificado de práctica', tipo: 'PDF' },
    { nombre: 'Certificado de cumplimiento', tipo: 'PDF' },
  ]);
}
