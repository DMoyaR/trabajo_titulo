import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'alumno-docs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-docs.component.html',
  styleUrls: ['./alumno-docs.component.css']
})
export class AlumnoDocsComponent {
  docs = signal([
    { categoria:'Práctica', nombre:'Rúbrica de Evaluación', fecha:'10 abr 2024', tipo:'PDF' },
    { categoria:'Práctica', nombre:'Guía del Estudiante', fecha:'4 abr 2024', tipo:'PDF' },
    { categoria:'Título', nombre:'Cronograma', fecha:'', tipo:'PDF' },
  ]);
}
