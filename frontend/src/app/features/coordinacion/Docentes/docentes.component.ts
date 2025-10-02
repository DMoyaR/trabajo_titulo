import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';

interface Docente {
  id: number;
  nombre: string;
  cohorte: string;
  semestre: string;
  tipoMemoria: string;
  numeroEstudiantes: number;
  fechaInicio: string;
  encuestasCompletadas: number;
  porcentajeCompletado: number;
  fechaEntregaFinal: string;
  fechaCierre: string;
}

@Component({
  selector: 'app-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './docentes.component.html',
  styleUrls: ['./docentes.component.css']
})
export class CoordinacionDocentesComponent implements OnInit {
  // Estado del menú
  menuOpen = true;

  // Filtros
  cohortes: string[] = ['2019', '2020', '2021', '2022', '2023'];
  semestres: string[] = ['1° semestre', '2° semestre'];
  procesos: string[] = ['Práctica', 'Memoria', 'Tesis'];

  selectedCohorte = '';
  selectedSemestre = '';
  selectedProceso = '';

  // Lista de docentes
  docentes: Docente[] = [];
  filteredDocentes: Docente[] = [];

  // Datos mock para docentes con sistema de feedback de estudiantes
  private mockDocentes: Docente[] = [
    {
      id: 1,
      nombre: 'Juan Pérez',
      cohorte: '2020',
      semestre: '2° semestre',
      tipoMemoria: 'Práctica',
      numeroEstudiantes: 15,
      fechaInicio: '2024-08-15',
      encuestasCompletadas: 15,
      porcentajeCompletado: 100,
      fechaEntregaFinal: '2024-09-15',
      fechaCierre: '2024-09-20'
    },
    {
      id: 2,
      nombre: 'María González',
      cohorte: '2020',
      semestre: '2° semestre', 
      tipoMemoria: 'Práctica',
      numeroEstudiantes: 12,
      fechaInicio: '2024-08-15',
      encuestasCompletadas: 8,
      porcentajeCompletado: 67,
      fechaEntregaFinal: '2024-09-15',
      fechaCierre: '2024-09-20'
    },
    {
      id: 3,
      nombre: 'Andrés López',
      cohorte: '2020',
      semestre: '2° semestre',
      tipoMemoria: 'Práctica',
      numeroEstudiantes: 18,
      fechaInicio: '2024-08-15',
      encuestasCompletadas: 5,
      porcentajeCompletado: 28,
      fechaEntregaFinal: '2024-09-15',
      fechaCierre: '2024-09-20'
    },
    {
      id: 4,
      nombre: 'Claudia Rivera',
      cohorte: '2020',
      semestre: '2° semestre',
      tipoMemoria: 'Práctica',
      numeroEstudiantes: 10,
      fechaInicio: '2024-08-15',
      encuestasCompletadas: 3,
      porcentajeCompletado: 30,
      fechaEntregaFinal: '2024-09-15',
      fechaCierre: '2024-09-20'
    },
    {
      id: 5,
      nombre: 'Francisco Torres',
      cohorte: '2020',
      semestre: '2° semestre',
      tipoMemoria: 'Práctica',
      numeroEstudiantes: 14,
      fechaInicio: '2024-08-15',
      encuestasCompletadas: 0,
      porcentajeCompletado: 0,
      fechaEntregaFinal: '2024-09-15',
      fechaCierre: '2024-09-20'
    },
    {
      id: 6,
      nombre: 'Laura Méndez',
      cohorte: '2020',
      semestre: '2° semestre',
      tipoMemoria: 'Práctica',
      numeroEstudiantes: 16,
      fechaInicio: '2024-08-15',
      encuestasCompletadas: 12,
      porcentajeCompletado: 75,
      fechaEntregaFinal: '2024-09-15',
      fechaCierre: '2024-09-20'
    },
    {
      id: 7,
      nombre: 'Sergio Vargas',
      cohorte: '2020',
      semestre: '2° semestre',
      tipoMemoria: 'Práctica',
      numeroEstudiantes: 20,
      fechaInicio: '2024-08-15',
      encuestasCompletadas: 20,
      porcentajeCompletado: 100,
      fechaEntregaFinal: '2024-09-15',
      fechaCierre: '2024-09-20'
    }
  ];
  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  // Inicialización del componente
  ngOnInit(): void {
    this.loadDocentes();
    // Establecer filtros por defecto según la imagen
    this.selectedCohorte = '2020';
    this.selectedSemestre = '2° semestre';
    this.selectedProceso = 'Práctica';
    this.applyFilters();
  }

  loadDocentes(): void {
    this.docentes = [...this.mockDocentes];
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredDocentes = this.docentes.filter(docente => {
      return (!this.selectedCohorte || docente.cohorte === this.selectedCohorte) &&
             (!this.selectedSemestre || docente.semestre === this.selectedSemestre) &&
             (!this.selectedProceso || docente.tipoMemoria === this.selectedProceso);
    });
  }

  // Método para formatear fechas
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Método para obtener el estado del progreso basado en porcentaje
  getProgressStatus(porcentaje: number): string {
    if (porcentaje === 100) return 'completado';
    if (porcentaje >= 70) return 'progreso-alto';
    if (porcentaje >= 40) return 'progreso-medio';
    if (porcentaje > 0) return 'progreso-bajo';
    return 'sin-progreso';
  }

  // Método para obtener el texto del estado del progreso
  getProgressText(porcentaje: number): string {
    if (porcentaje === 100) return 'Completado';
    if (porcentaje >= 70) return 'En progreso';
    if (porcentaje >= 40) return 'Progreso medio';
    if (porcentaje > 0) return 'Iniciado';
    return 'Sin iniciar';
  }

  // Método para determinar si una fecha está próxima a vencer
  isDateNearDeadline(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0; // Próximo a vencer en 7 días
  }

  // Método para determinar si una fecha ya venció
  isDateOverdue(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date < today;
  }

  exportExcel(): void {
    console.log('Exportando datos de feedback docente a Excel...');
    alert('Exportando reporte de encuestas de feedback docente a Excel');
  }

  exportPDF(): void {
    console.log('Exportando datos de feedback docente a PDF...');
    alert('Exportando reporte de encuestas de feedback docente a PDF');
  }

  // ===== Métodos del Sidebar =====
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a sección: ${section}`);
    // Aquí implementarías la navegación real usando Router
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

  // Método para obtener el número total de docentes filtrados
  getTotalDocentes(): number {
    return this.filteredDocentes.length;
  }

  // Método para obtener estadísticas de encuestas
  getEstadisticasEncuestas() {
    const total = this.filteredDocentes.length;
    const completadas = this.filteredDocentes.filter(d => d.porcentajeCompletado === 100).length;
    const enProgreso = this.filteredDocentes.filter(d => d.porcentajeCompletado > 0 && d.porcentajeCompletado < 100).length;
    const sinIniciar = this.filteredDocentes.filter(d => d.porcentajeCompletado === 0).length;
    
    // Calcular total de estudiantes y encuestas completadas
    const totalEstudiantes = this.filteredDocentes.reduce((sum, d) => sum + d.numeroEstudiantes, 0);
    const totalEncuestasCompletadas = this.filteredDocentes.reduce((sum, d) => sum + d.encuestasCompletadas, 0);
    const promedioCompletado = totalEstudiantes > 0 ? Math.round((totalEncuestasCompletadas / totalEstudiantes) * 100) : 0;

    return {
      total,
      completadas,
      enProgreso,
      sinIniciar,
      totalEstudiantes,
      totalEncuestasCompletadas,
      promedioCompletado
    };
  }

  // TrackBy function para mejorar el rendimiento de la tabla
  trackByDocenteId(index: number, docente: Docente): number {
    return docente.id;
  }

  // Método para resetear filtros
  resetFilters(): void {
    this.selectedCohorte = '';
    this.selectedSemestre = '';
    this.selectedProceso = '';
    this.applyFilters();
  }

  // Método para enviar recordatorio a estudiantes (funcionalidad futura)
  enviarRecordatorio(docente: Docente): void {
    const estudiantesPendientes = docente.numeroEstudiantes - docente.encuestasCompletadas;
    const confirmSend = confirm(
      `¿Enviar recordatorio a los ${estudiantesPendientes} estudiantes pendientes del docente ${docente.nombre}?`
    );
    
    if (confirmSend) {
      console.log(`Enviando recordatorio para docente: ${docente.nombre}`);
      alert(`Recordatorio enviado a ${estudiantesPendientes} estudiantes`);
    }
  }

  // Método para ver detalles de respuestas (funcionalidad futura)
  verDetallesRespuestas(docente: Docente): void {
    console.log(`Ver detalles de respuestas para docente: ${docente.nombre}`);
    alert(`Mostrando detalles de feedback para ${docente.nombre}`);
  }
}