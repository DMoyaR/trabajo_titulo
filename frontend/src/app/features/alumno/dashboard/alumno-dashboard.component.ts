import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'alumno-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-dashboard.component.html',
  styleUrls: ['./alumno-dashboard.component.css']
})
export class AlumnoDashboardComponent {
  entregas = signal([
    { nombre: 'Informe de avance #2', estado: 'Aprobado', fecha: '15 de abril' }
  ]);
}
