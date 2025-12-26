import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubirArchivoComponent, DatosPublicacion } from '../subirarchivo/subirarchivo.component';

@Component({
  selector: 'docente-upload-dialog',
  standalone: true,
  imports: [CommonModule, SubirArchivoComponent],
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.css'],
})
export class UploadDialogComponent {
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<DatosPublicacion>();
}