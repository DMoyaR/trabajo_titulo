import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Tab = 'titulo1' | 'titulo2';
type EstadoGrupo = 'pendiente' | 'en_revision' | 'aprobado' | 'finalizado';
type EstadoEntrega = 'pendiente' | 'evaluado';

/** ====== MODELOS DE LA VISTA (UI) ====== */
interface Grupo {
  id: string;
  nombre: string;
  integrantes: string[];
  estado: EstadoGrupo;
}

interface Entrega {
  id: string;
  titulo: string;
  tipo: string;            // "Plan de trabajo" | "Bitácora" | "Reunión" | "Informe"
  estado: EstadoEntrega;   // pendiente | evaluado
  fechaLimite?: string;
  fechaEntrega?: string;
  nota?: number;
  comentarios?: string;
  expanded?: boolean;
}

@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent {
  // ===== pestañas
  tab: Tab = 'titulo1';

  // ===== grupos (mock UI)
  gruposTitulo1: Grupo[] = [
    { id: 'g1', nombre: 'Grupo 1', integrantes: ['Peña', 'Muñoz'], estado: 'aprobado' },
    { id: 'g2', nombre: 'Grupo 2', integrantes: ['Jiménez', 'Quezada'], estado: 'en_revision' },
  ];

  gruposTitulo2: Grupo[] = [
    { id: 'g3', nombre: 'Grupo 3', integrantes: ['Pérez', 'González'], estado: 'pendiente' },
    { id: 'g4', nombre: 'Grupo 4', integrantes: ['Morales', 'Rojas'], estado: 'finalizado' },
  ];

  estadoTexto(e: EstadoGrupo): string {
    switch (e) {
      case 'pendiente': return 'Pendiente';
      case 'en_revision': return 'En revisión';
      case 'aprobado': return 'Aprobado';
      case 'finalizado': return 'Finalizado';
      default: return e;
    }
  }

  estadoClase(e: EstadoGrupo): string {
    switch (e) {
      case 'pendiente': return 'chip-pend';
      case 'en_revision': return 'chip-rev';
      case 'aprobado': return 'chip-ok';
      case 'finalizado': return 'chip-done';
      default: return '';
    }
  }

  // ===== panel de entregas (mock UI)
  grupoSeleccionado: Grupo | null = null;
  entregas: Entrega[] = [];

  // filtros
  tiposEntrega = ['Todos', 'Plan de trabajo', 'Bitácora', 'Reunión', 'Informe'];
  filtroTipo: string = 'Todos';
  filtroBusqueda: string = '';

  verGrupo(grupo: Grupo) {
    this.grupoSeleccionado = grupo;
    this.filtroTipo = 'Todos';
    this.filtroBusqueda = '';

    // Mock: reemplazar por servicio real si más adelante conectas entregas
    this.entregas = [
      { id: 'e1', titulo: 'Hito 1 · Plan de trabajo', tipo: 'Plan de trabajo', estado: 'evaluado', fechaEntrega: '08 abr 2024', nota: 6.5, comentarios: 'Buen alcance y cronograma claro. Ajustar sección de riesgos.' },
      { id: 'e2', titulo: 'Bitácora Semanal #5',      tipo: 'Bitácora',      estado: 'pendiente', fechaLimite: '02 may 2024' },
      { id: 'e3', titulo: 'Reunión de seguimiento',   tipo: 'Reunión',       estado: 'pendiente', fechaLimite: '25 abr 2024' },
      { id: 'e4', titulo: 'Informe intermedio',       tipo: 'Informe',       estado: 'evaluado',  fechaEntrega: '10 may 2024', nota: 6.0, comentarios: 'Buen análisis, profundizar en el marco comparativo.' },
    ];
  }

  volverAListaGrupos() {
    this.grupoSeleccionado = null;
    this.entregas = [];
  }

  get entregasFiltradas(): Entrega[] {
    const q = this.filtroBusqueda.trim().toLowerCase();
    return this.entregas.filter(e => {
      const matchTipo = this.filtroTipo === 'Todos' || e.tipo === this.filtroTipo;
      const matchTexto = !q || e.titulo.toLowerCase().includes(q) || e.tipo.toLowerCase().includes(q);
      return matchTipo && matchTexto;
    });
  }

  // helpers para el template (evitar funciones flecha en HTML)
  get hasPendientes(): boolean {
    return this.entregasFiltradas.some(e => e.estado === 'pendiente');
  }

  get hasEvaluadas(): boolean {
    return this.entregasFiltradas.some(e => e.estado === 'evaluado');
  }

  // ===== evaluación (modal)
  showEvalModal = false;
  entregaEnRevision: Entrega | null = null;
  notaInput: number | null = null;
  comentariosInput = '';

  revisarEntrega(e: Entrega) {
    this.entregaEnRevision = e;
    this.notaInput = null;
    this.comentariosInput = '';
    this.showEvalModal = true;
  }

  cerrarEvalModal() {
    this.showEvalModal = false;
    this.entregaEnRevision = null;
    this.notaInput = null;
    this.comentariosInput = '';
  }

  guardarEvaluacion() {
    if (!this.entregaEnRevision || this.notaInput == null) return;
    const idx = this.entregas.findIndex(x => x.id === this.entregaEnRevision!.id);
    if (idx >= 0) {
      this.entregas[idx] = {
        ...this.entregaEnRevision,
        estado: 'evaluado',
        fechaEntrega: new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
        nota: this.notaInput,
        comentarios: this.comentariosInput || 'Sin comentarios adicionales.',
      };
    }
    this.cerrarEvalModal();
  }

  toggleResumen(e: Entrega) { 
    e.expanded = !e.expanded; 
  }
}