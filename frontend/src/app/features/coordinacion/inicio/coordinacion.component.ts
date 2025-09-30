import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
// Interfaces para tipado de datos
interface CardData {
  title: string;
  value: number;
  color?: string;
}

interface ProcesoReciente {
  id?: number;
  estudiante: string;
  tituloProyecto: string;
  estado: 'en-progreso' | 'completado' | 'pendiente';
  fecha: string;
}

interface Profesor {
  id?: number;
  nombre: string;
  email: string;
}

@Component({
  selector: 'app-coordinacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coordinacion.component.html',
  styleUrls: ['./coordinacion.component.css']
})
export class CoordinacionComponent implements OnInit {
  menuOpen = true;

  // ===== DATOS DINÁMICOS PARA LAS TARJETAS =====
  cardStats: CardData[] = [
    { title: 'Estudiantes', value: 0, color: '#008c4a' },
    { title: 'Docentes', value: 0, color: '#008c4a' },
    { title: 'Evaluaciones pendientes', value: 0, color: '#008c4a' }
  ];

  // ===== DATOS DINÁMICOS PARA LAS TABLAS =====
  procesosRecientes: ProcesoReciente[] = [];
  profesores: Profesor[] = [];

  // ===== ESTADOS DE CARGA =====
  isLoadingStats = false;
  isLoadingProcesos = false;
  isLoadingProfesores = false;

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    // Cargar datos iniciales cuando tengas el backend
    // this.loadInitialData();
  }

  // ===== MÉTODOS PREPARADOS PARA EL BACKEND =====

  async loadInitialData(): Promise<void> {
    // Cargar todos los datos necesarios al inicializar
    await Promise.all([
      this.loadCardStats(),
      this.loadProcesosRecientes(),
      this.loadProfesores()
    ]);
  }

  // Cargar estadísticas para las tarjetas
  async loadCardStats(): Promise<void> {
    this.isLoadingStats = true;
    try {
      // TODO: Conectar con el backend
      // const response = await this.httpClient.get<any>('/api/stats').toPromise();
      // this.cardStats[0].value = response.estudiantes;
      // this.cardStats[1].value = response.docentes;
      // this.cardStats[2].value = response.evaluacionesPendientes;

    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      this.isLoadingStats = false;
    }
  }

  // Cargar procesos recientes
  async loadProcesosRecientes(): Promise<void> {
    this.isLoadingProcesos = true;
    try {
      // TODO: Conectar con el backend
      // this.procesosRecientes = await this.httpClient.get<ProcesoReciente[]>('/api/procesos-recientes').toPromise();

    } catch (error) {
      console.error('Error al cargar procesos recientes:', error);
      this.procesosRecientes = [];
    } finally {
      this.isLoadingProcesos = false;
    }
  }

  // Cargar profesores
  async loadProfesores(): Promise<void> {
    this.isLoadingProfesores = true;
    try {
      // TODO: Conectar con el backend
      // this.profesores = await this.httpClient.get<Profesor[]>('/api/profesores').toPromise();

    } catch (error) {
      console.error('Error al cargar profesores:', error);
      this.profesores = [];
    } finally {
      this.isLoadingProfesores = false;
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  // Obtener clase CSS para el estado del proceso
  getBadgeClass(estado: string): string {
    const classes = {
      'en-progreso': 'in-progress',
      'completado': 'completed',
      'pendiente': 'pending'
    };
    return classes[estado as keyof typeof classes] || 'pending';
  }

  // Obtener texto legible del estado
  getEstadoText(estado: string): string {
    const estados = {
      'en-progreso': 'En progreso',
      'completado': 'Completado',
      'pendiente': 'Pendiente'
    };
    return estados[estado as keyof typeof estados] || estado;
  }

  // Refrescar datos manualmente
  async refreshData(): Promise<void> {
    console.log('Refrescando datos...');
    await this.loadInitialData();
  }

  // ===== MÉTODOS DE TRACKING PARA RENDIMIENTO =====

  trackByProcesoId(index: number, proceso: ProcesoReciente): any {
    return proceso.id || index;
  }

  trackByProfesorId(index: number, profesor: Profesor): any {
    return profesor.id || index;
  }

  trackByCardTitle(index: number, card: CardData): any {
    return card.title;
  }

  // ===== MÉTODOS DE NAVEGACIÓN =====

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a: ${section}`);
    // TODO: Implementar navegación real
  }

  logout(): void {
    if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      return;
    }

    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => this.router.navigateByUrl('/auth/login'),
    });
  }

  onOutsideClick(event: Event): void {
    if (window.innerWidth <= 768 && this.menuOpen) {
      const target = event.target as HTMLElement;
      const sidebar = document.querySelector('.sidebar');
      
      if (sidebar && !sidebar.contains(target)) {
        this.menuOpen = false;
      }
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'm') {
      event.preventDefault();
      this.toggleMenu();
    }
    
    if (event.key === 'Escape' && window.innerWidth <= 768) {
      this.menuOpen = false;
    }
  }
}