import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notificacion.component.html',
  styleUrls: ['./notificacion.component.css'],
})
export class CoordinacionNotificacionComponent {
  readonly items = [
    { tipo: 'entregas', titulo: 'Entrega 2 vence el 22 abr. 2024', hace: 'hace 20 min', icon: '📅', fecha: 'hoy' },
    { tipo: 'retro', titulo: 'Retroalimentación disponible para Informe…', hace: 'hace 1 h', icon: '🔵', fecha: 'hoy' },
    { tipo: 'reuniones', titulo: 'Nueva reunión: 5 de abr. 2024 15:00', hace: 'hace 4 h', icon: '📅', fecha: 'hoy' },
    { tipo: 'estados', titulo: 'Estado del proceso cambiado a Cierre', hace: 'ayer', icon: '🟡', fecha: 'ayer' },
  ];

  filtroTipo: string = 'todas';
  filtroFecha: string = 'todas';

  get list() {
    let filteredItems = this.items;
    
    // Filtrar por tipo
    if (this.filtroTipo !== 'todas') {
      filteredItems = filteredItems.filter(i => i.tipo === this.filtroTipo);
    }
    
    // Filtrar por fecha
    if (this.filtroFecha !== 'todas') {
      filteredItems = filteredItems.filter(i => i.fecha === this.filtroFecha);
    }
    
    return filteredItems;
  }

  onFiltroTipoChange(v: string) {
    this.filtroTipo = v;
  }

  onFiltroFechaChange(v: string) {
    this.filtroFecha = v;
  }

  marcarComoLeido(): void {
    console.log('Marcando notificaciones como leídas...');
    // Aquí puedes implementar la lógica para marcar como leído
  }
}