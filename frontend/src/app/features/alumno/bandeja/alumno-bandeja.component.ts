import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'alumno-bandeja',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-bandeja.component.html',
  styleUrls: ['./alumno-bandeja.component.css']
})
export class AlumnoBandejaComponent {
  mensajes = signal([
    { de: 'Gabriel Ruiz', texto: 'No olvides completar las últimas secciones del informe.', hora: 'Hoy 10:21' },
    { de: 'Natalia Rojas', texto: 'Revisión de avance.', hora: 'Ayer' },
    { de: 'Vicente Torres', texto: 'Dudas sobre redacción.', hora: '10 abr' },
    { de: 'Daniela Soto', texto: 'Re: Título del informe', hora: '7 abr' },
  ]);
}
