import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'upload-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.css']
})
export class UploadDialogComponent {
  @Output() close = new EventEmitter<void>();
}
