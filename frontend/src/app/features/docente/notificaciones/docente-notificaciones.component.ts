import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 
import { Router } from '@angular/router';


@Component({
  selector: 'docente-notificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule], // 
  templateUrl: './docente-notificaciones.component.html',
  styleUrls: ['./docente-notificaciones.component.css'],
})
export class DocenteNotificacionesComponent {
  // Estado sidebar
  menuOpen = true;
  currentView: string = 'notificaciones'; // vista por defecto

  private readonly sectionRouteMap: Record<string, string> = {
    inicio: 'dashboard',
    procesos: 'trabajo',
    reportes: 'calendario',
  };

  constructor(private router: Router) {}




  // Filtros de notificaciones
  filtroTipo: string = 'todas';
  filtroFecha: string = 'todas';
  
  items = [
    { tipo:'entregas',  titulo:'Entrega 2 vence el 22 abr. 2024', hace:'hace 20 min', icon:'📅', fecha: 'hoy' },
    { tipo:'retro',     titulo:'Retroalimentación disponible para Informe…', hace:'hace 1 h', icon:'🔵', fecha: 'hoy' },
    { tipo:'reuniones', titulo:'Nueva reunión: 5 de abr. 2024 15:00', hace:'hace 4 h', icon:'📅', fecha: 'hoy' },
    { tipo:'estados',   titulo:'Estado del proceso cambiado a Cierre', hace:'ayer', icon:'🟡', fecha: 'ayer' },
  ];

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

  // Funciones menú
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    // Por ahora solo funciona la sección de notificaciones
    const destination = this.sectionRouteMap[section] ?? section;
    this.router.navigate(['/docente', destination]);
  }

  logout(): void {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) console.log('Cerrando sesión...');
  }

  marcarComoLeido(): void {
    console.log('Marcando notificaciones como leídas...');
    // Aquí puedes implementar la lógica para marcar como leído
  }
}