import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadDialogComponent } from '../shareduploaddialog/upload-dialog.component';
import { FormsModule } from '@angular/forms';

interface UserProfile {
  nombre: string;
  correo: string;
  carrera: string;
  telefono?: string;
  ultimoAcceso?: string;
  contrasena?: string;
}

@Component({
  selector: 'docente-trabajo-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, UploadDialogComponent],
  templateUrl: './docente-trabajo-detalle.component.html',
  styleUrls: ['./docente-trabajo-detalle.component.css'],
})
export class DocenteTrabajoDetalleComponent {
  // Contenido de Código 2
  showUpload = signal(false);
  searchTerm = signal('');
  
  indicadores = signal([
    { 
      estudiante: 'Ana González', 
      avance: 4.5, 
      ultimasEntregas: '10 abr. 2024',
      proximasEntregas: '15 may. 2024'
    },
    { 
      estudiante: 'Javier Morales', 
      avance: 4, 
      ultimasEntregas: '10 abr. 2024',
      proximasEntregas: ''
    },
    { 
      estudiante: 'Laura Pérez', 
      avance: 92, 
      ultimasEntregas: '20 abr. 2024',
      proximasEntregas: ''
    },
    { 
      estudiante: 'Diego Robles', 
      avance: 3.5, 
      ultimasEntregas: '15 abr. 2024',
      proximasEntregas: ''
    },
  ]);
  
  repo = signal([
    { nombre: 'Rúbrica de Evaluación', fecha: '10 abr. 2024' },
    { nombre: 'Guía del Estudiante', fecha: '4 abr. 2024' },
    { nombre: 'Formato de Acta', fecha: '1 abr. 2024' },
  ]);

  getBarClass(avance: number): string {
    if (avance >= 4) return 'high';
    if (avance >= 3) return '';
    return 'low';
  }

  getBarWidth(avance: number): number {
    // Si el avance es menor a 10, asumimos que es una nota (1-5) y la convertimos a porcentaje
    if (avance <= 5) {
      return (avance / 5) * 100;
    }
    return avance;
  }
}