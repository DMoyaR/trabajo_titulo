import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈

@Component({
  selector: 'docente-upload-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.css'],
})
export class UploadDialogComponent {
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ fecha: string; archivo: string; comentario: string }>();

  fecha: string = '';
  archivo: string = '';
  comentario: string = '';

  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    this.archivo = (input.files && input.files[0]) ? input.files[0].name : '';
  }

  doConfirm() {
    this.confirm.emit({ fecha: this.fecha, archivo: this.archivo, comentario: this.comentario });
  }
}