import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadDialogComponent } from '../shareduploaddialog/upload-dialog.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'docente-trabajo-detalle',
  standalone: true,
   imports: [CommonModule, FormsModule, UploadDialogComponent],
  templateUrl: './docente-trabajo-detalle.component.html',
  styleUrls: ['./docente-trabajo-detalle.component.css'],
})
export class DocenteTrabajoDetalleComponent {
  showUpload = signal(false);
  indicadores = signal([
    { estudiante:'Ana', avance:80, estado:'ok' },
    { estudiante:'José', avance:45, estado:'pendiente' },
    { estudiante:'Daniela', avance:60, estado:'ok' },
  ]);
  repo = signal([
    { nombre:'Rúbrica de Evaluación', fecha:'10 abr. 2024' },
    { nombre:'Guía del Estudiante', fecha:'4 abr. 2024' },
    { nombre:'Formato de Acta', fecha:'15 abr. 2024' },
  ]);
}
