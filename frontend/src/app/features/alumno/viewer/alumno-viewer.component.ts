import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Viewer de documentos (ESTUDIANTE_17/18/19/20)
 * - Placeholder para embeber PDFs (cuando tengas URL real, usa <iframe>).
 */
@Component({
  selector: 'alumno-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-viewer.component.html',
  styleUrls: ['./alumno-viewer.component.css'],
})
export class AlumnoViewerComponent {}
