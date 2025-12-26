// FRONTEND DE ESTUDIANTES - TypeScript Component
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces
interface Estudiante {
  id: number; // Cambiado: ahora es requerido
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  carrera: string;
  carreraId: number; // Cambiado: ahora es requerido
  estado: 'activo' | 'en-proceso' | 'graduado' | 'retirado';
  telefono?: string;
  fechaIngreso: string;
}

interface Carrera {
  id: number;
  nombre: string;
  codigo: string;
}

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiantes.component.html',
  styleUrls: ['./estudiantes.component.css']
})
export class CoordinacionEstudiantesComponent implements OnInit {

  // Datos
  estudiantes: Estudiante[] = [];
  carreras: Carrera[] = [
    { id: 1, nombre: 'Ingeniería en Informática', codigo: 'ICI' },
    { id: 2, nombre: 'Ingeniería Civil Industrial', codigo: 'ICT' },
    { id: 3, nombre: 'Ingeniería en Telecomunicaciones', codigo: 'ITE' },
    { id: 4, nombre: 'Ingeniería Eléctrica', codigo: 'IEL' },
    { id: 5, nombre: 'Ingeniería Mecánica', codigo: 'IME' }
  ];

  // Estados de carga
  isLoading = false;
  isSaving = false;

  // Filtros y búsqueda
  searchTerm = '';
  selectedCarrera = '';
  selectedEstado = '';
  filteredEstudiantes: Estudiante[] = [];

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Ordenamiento
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Modal
  showModal = false;
  isEditing = false;
  selectedEstudiantes: number[] = [];
  currentEstudiante: Partial<Estudiante> = {};

  // Datos de ejemplo (reemplazar con llamadas al backend)
  private mockEstudiantes: Estudiante[] = [
    {
      id: 1,
      nombre: 'Juan Carlos',
      apellido: 'Pérez González',
      rut: '12.345.678-9',
      email: 'juan.perez@utem.cl',
      carrera: 'Ingeniería en Informática',
      carreraId: 1,
      estado: 'activo',
      telefono: '+56 9 1234 5678',
      fechaIngreso: '2020-03-15'
    },
    {
      id: 2,
      nombre: 'María José',
      apellido: 'González Silva',
      rut: '98.765.432-1',
      email: 'maria.gonzalez@utem.cl',
      carrera: 'Ingeniería Civil Industrial',
      carreraId: 2,
      estado: 'en-proceso',
      telefono: '+56 9 9876 5432',
      fechaIngreso: '2019-08-20'
    },
    {
      id: 3,
      nombre: 'Pedro Antonio',
      apellido: 'López Martínez',
      rut: '11.222.333-4',
      email: 'pedro.lopez@utem.cl',
      carrera: 'Ingeniería en Telecomunicaciones',
      carreraId: 3,
      estado: 'graduado',
      telefono: '+56 9 5555 6666',
      fechaIngreso: '2018-03-10'
    },
    {
      id: 4,
      nombre: 'Ana María',
      apellido: 'Rodríguez Torres',
      rut: '55.666.777-8',
      email: 'ana.rodriguez@utem.cl',
      carrera: 'Ingeniería Eléctrica',
      carreraId: 4,
      estado: 'activo',
      telefono: '+56 9 7777 8888',
      fechaIngreso: '2021-08-15'
    },
    {
      id: 5,
      nombre: 'Carlos Eduardo',
      apellido: 'Sánchez Morales',
      rut: '33.444.555-6',
      email: 'carlos.sanchez@utem.cl',
      carrera: 'Ingeniería Mecánica',
      carreraId: 5,
      estado: 'retirado',
      telefono: '+56 9 3333 4444',
      fechaIngreso: '2020-03-05'
    }
  ];
  // Inicialización del componente
  ngOnInit(): void {
    this.loadEstudiantes();
  }

  // ===== CARGA DE DATOS =====
  
  async loadEstudiantes(): Promise<void> {
    this.isLoading = true;
    try {
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.httpClient.get<Estudiante[]>('/api/estudiantes').toPromise();
      // this.estudiantes = response || [];
      
      // Simulación de carga con datos mock
      await this.delay(1000);
      this.estudiantes = [...this.mockEstudiantes];
      this.applyFilters();
      
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
      this.estudiantes = [];
    } finally {
      this.isLoading = false;
    }
  }

  // ===== FILTROS Y BÚSQUEDA =====

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.estudiantes];

    // Filtro de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(est => 
        `${est.nombre} ${est.apellido}`.toLowerCase().includes(term) ||
        est.rut.toLowerCase().includes(term) ||
        est.email.toLowerCase().includes(term) ||
        est.carrera.toLowerCase().includes(term)
      );
    }

    // Filtro por carrera
    if (this.selectedCarrera) {
      filtered = filtered.filter(est => est.carreraId?.toString() === this.selectedCarrera);
    }

    // Filtro por estado
    if (this.selectedEstado) {
      filtered = filtered.filter(est => est.estado === this.selectedEstado);
    }

    this.filteredEstudiantes = filtered;
    this.totalPages = Math.ceil(this.filteredEstudiantes.length / this.pageSize);
    
    // Ajustar página actual si es necesario
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCarrera = '';
    this.selectedEstado = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  // ===== ORDENAMIENTO =====

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredEstudiantes.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'nombre':
          aValue = `${a.nombre} ${a.apellido}`.toLowerCase();
          bValue = `${b.nombre} ${b.apellido}`.toLowerCase();
          break;
        case 'rut':
          aValue = a.rut;
          bValue = b.rut;
          break;
        case 'carrera':
          aValue = a.carrera.toLowerCase();
          bValue = b.carrera.toLowerCase();
          break;
        case 'estado':
          aValue = a.estado;
          bValue = b.estado;
          break;
        default:
          aValue = a[field as keyof Estudiante];
          bValue = b[field as keyof Estudiante];
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // ===== PAGINACIÓN =====

  get paginatedEstudiantes(): Estudiante[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredEstudiantes.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    // Ajustar si no hay suficientes páginas al final
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEstudiantes.length);
  }

  // ===== MODAL Y CRUD =====

  openAddModal(): void {
    this.isEditing = false;
    this.currentEstudiante = {
      estado: 'activo',
      fechaIngreso: new Date().toISOString().split('T')[0]
    };
    this.showModal = true;
  }

  editEstudiante(estudiante: Estudiante): void {
    this.isEditing = true;
    this.currentEstudiante = { ...estudiante };
    this.showModal = true;
  }

  async saveEstudiante(): Promise<void> {
    if (!this.currentEstudiante.nombre || !this.currentEstudiante.apellido || 
        !this.currentEstudiante.rut || !this.currentEstudiante.email) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    this.isSaving = true;
    
    try {
      if (this.isEditing) {
        // TODO: Actualizar en backend
        // await this.httpClient.put(`/api/estudiantes/${this.currentEstudiante.id}`, this.currentEstudiante).toPromise();
        
        const index = this.estudiantes.findIndex(e => e.id === this.currentEstudiante.id);
        if (index !== -1) {
          // Buscar nombre de carrera
          const carrera = this.carreras.find(c => c.id === this.currentEstudiante.carreraId);
          this.estudiantes[index] = {
            ...this.currentEstudiante as Estudiante,
            carrera: carrera?.nombre || ''
          };
        }
        
      } else {
        // TODO: Crear en backend
        // const newEstudiante = await this.httpClient.post<Estudiante>('/api/estudiantes', this.currentEstudiante).toPromise();
        
        const carrera = this.carreras.find(c => c.id === this.currentEstudiante.carreraId);
        const newEstudiante: Estudiante = {
          ...this.currentEstudiante as Estudiante,
          id: Math.max(...this.estudiantes.map(e => e.id || 0)) + 1,
          carrera: carrera?.nombre || ''
        };
        this.estudiantes.push(newEstudiante);
      }
      
      this.applyFilters();
      this.closeModal();
      
    } catch (error) {
      console.error('Error al guardar estudiante:', error);
      alert('Error al guardar estudiante');
    } finally {
      this.isSaving = false;
    }
  }

  async deleteEstudiante(estudiante: Estudiante): Promise<void> {
    const confirmed = confirm(`¿Está seguro de eliminar al estudiante ${estudiante.nombre} ${estudiante.apellido}?`);
    if (!confirmed) return;

    try {
      // TODO: Eliminar en backend
      // await this.httpClient.delete(`/api/estudiantes/${estudiante.id}`).toPromise();
      
      this.estudiantes = this.estudiantes.filter(e => e.id !== estudiante.id);
      this.applyFilters();
      
    } catch (error) {
      console.error('Error al eliminar estudiante:', error);
      alert('Error al eliminar estudiante');
    }
  }

  viewEstudiante(estudiante: Estudiante): void {
    console.log('Ver detalles de:', estudiante);
    // TODO: Implementar vista de detalles o navegar a página específica
  }

  closeModal(): void {
    this.showModal = false;
    this.currentEstudiante = {};
  }

  // ===== UTILIDADES =====

  getInitials(nombre: string): string {
    return nombre
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getEstadoText(estado: string): string {
    const estados = {
      'activo': 'Activo',
      'en-proceso': 'En Proceso',
      'graduado': 'Graduado',
      'retirado': 'Retirado'
    };
    return estados[estado as keyof typeof estados] || estado;
  }

  async exportData(): Promise<void> {
    try {
      // TODO: Implementar exportación real
      console.log('Exportando datos de estudiantes...');
      alert('Funcionalidad de exportación en desarrollo');
    } catch (error) {
      console.error('Error al exportar:', error);
    }
  }

  async refreshData(): Promise<void> {
    await this.loadEstudiantes();
  }

  // ===== TRACKING =====

  trackByEstudianteId(index: number, estudiante: Estudiante): number {
    return estudiante.id;
  }

  // ===== HELPERS =====

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}