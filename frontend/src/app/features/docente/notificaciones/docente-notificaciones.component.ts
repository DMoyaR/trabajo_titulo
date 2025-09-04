import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'docente-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-notificaciones.component.html',
  styleUrls: ['./docente-notificaciones.component.css'],
})
export class DocenteNotificacionesComponent {
  filtroTipo = signal('todas');
  items = signal([
    { tipo:'entregas', titulo:'Entrega 2 vence el 22 abr. 2024', hace:'hace 20 min', icon:'📅' },
    { tipo:'retro', titulo:'Retroalimentación disponible para Informe…', hace:'hace 1 h', icon:'🔵' },
    { tipo:'reuniones', titulo:'Nueva reunión: 5 de abr. 2024 15:00', hace:'hace 4 h', icon:'📅' },
    { tipo:'estados', titulo:'Estado de un proceso cambió a Cierre', hace:'ayer', icon:'🟡' },
  ]);
  list = computed(()=> this.filtroTipo()==='todas'? this.items(): this.items().filter(i=>i.tipo===this.filtroTipo()));
}
