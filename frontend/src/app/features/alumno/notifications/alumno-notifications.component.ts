import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'alumno-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-notifications.component.html',
  styleUrls: ['./alumno-notifications.component.css']
})
export class AlumnoNotificationsComponent {
  notis = signal([
    { tipo:'Entrega', texto:'Entrega 2 vence el 22 abr. 2024', tiempo:'hace 20 min', icon:'📄' },
    { tipo:'Feedback', texto:'Retroalimentación disponible', tiempo:'hace 1 h', icon:'💬' },
    { tipo:'Reunión', texto:'Nueva reunión: 5 de abr 15:00', tiempo:'hace 4 h', icon:'📅' },
  ]);
}
