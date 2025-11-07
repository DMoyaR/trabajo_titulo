import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Tab = 'titulo1' | 'titulo2';
type EstadoGrupo = 'pendiente' | 'en_revision' | 'aprobado' | 'finalizado';
type EstadoEntrega = 'pendiente' | 'evaluado';

type Grupo = {
  id: string;
  nombre: string;
  integrantes: string[];
  estado: EstadoGrupo;
};

type Entrega = {
  id: string;
  titulo: string;
  tipo: string;
  estado: EstadoEntrega;
  fechaLimite?: string;
  fechaEntrega?: string;
  nota?: number;
  comentarios?: string;
  expanded?: boolean;
};

@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent {
  tab: Tab = 'titulo1';

  gruposTitulo1: Grupo[] = [
    { id: 'g1', nombre: 'Grupo 1', integrantes: ['Peña', 'Muñoz'], estado: 'aprobado' },
    { id: 'g2', nombre: 'Grupo 2', integrantes: ['Jiménez', 'Quezada'], estado: 'en_revision' },
  ];

  gruposTitulo2: Grupo[] = [
    { id: 'g3', nombre: 'Grupo 3', integrantes: ['Pérez', 'González'], estado: 'pendiente' },
    { id: 'g4', nombre: 'Grupo 4', integrantes: ['Morales', 'Rojas'], estado: 'finalizado' },
  ];

  grupoSeleccionado: Grupo | null = null;
  entregas: Entrega[] = [];

  tiposEntrega = ['Todos', 'Plan de trabajo', 'Bitácora', 'Reunión', 'Informe'];
  filtroTipo = 'Todos';
  filtroBusqueda = '';

  showEvalModal = false;
  entregaEnRevision: Entrega | null = null;
  notaInput: number | null = null;
  comentariosInput = '';

  estadoTexto(estado: EstadoGrupo): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_revision':
        return 'En revisión';
      case 'aprobado':
        return 'Aprobado';
      case 'finalizado':
        return 'Finalizado';
      default:
        return estado;
    }
  }

  estadoClase(estado: EstadoGrupo): string {
    switch (estado) {
      case 'pendiente':
        return 'chip-pend';
      case 'en_revision':
        return 'chip-rev';
      case 'aprobado':
        return 'chip-ok';
      case 'finalizado':
        return 'chip-done';
      default:
        return '';
    }
  }

  verGrupo(grupo: Grupo) {
    this.grupoSeleccionado = grupo;
    this.filtroTipo = 'Todos';
    this.filtroBusqueda = '';

    this.entregas = [
      {
        id: 'e1',
        titulo: 'Hito 1 · Plan de trabajo',
        tipo: 'Plan de trabajo',
        estado: 'evaluado',
        fechaEntrega: '08 abr 2024',
        nota: 6.5,
        comentarios: 'Buen alcance y cronograma claro. Ajustar sección de riesgos.',
      },
      {
        id: 'e2',
        titulo: 'Bitácora Semanal #5',
        tipo: 'Bitácora',
        estado: 'pendiente',
        fechaLimite: '02 may 2024',
      },
      {
        id: 'e3',
        titulo: 'Reunión de seguimiento',
        tipo: 'Reunión',
        estado: 'pendiente',
        fechaLimite: '25 abr 2024',
      },
      {
        id: 'e4',
        titulo: 'Informe intermedio',
        tipo: 'Informe',
        estado: 'evaluado',
        fechaEntrega: '10 may 2024',
        nota: 6.0,
        comentarios: 'Buen análisis, profundizar en el marco comparativo.',
      },
    ];
  }

  volverAListaGrupos() {
    this.grupoSeleccionado = null;
    this.entregas = [];
  }

  get entregasFiltradas(): Entrega[] {
    const texto = this.filtroBusqueda.trim().toLowerCase();
    return this.entregas.filter((entrega) => {
      const coincideTipo = this.filtroTipo === 'Todos' || entrega.tipo === this.filtroTipo;
      const coincideBusqueda =
        !texto ||
        entrega.titulo.toLowerCase().includes(texto) ||
        entrega.tipo.toLowerCase().includes(texto);
      return coincideTipo && coincideBusqueda;
    });
  }

  get hasPendientes(): boolean {
    return this.entregasFiltradas.some((entrega) => entrega.estado === 'pendiente');
  }

  get hasEvaluadas(): boolean {
    return this.entregasFiltradas.some((entrega) => entrega.estado === 'evaluado');
  }

  revisarEntrega(entrega: Entrega) {
    this.entregaEnRevision = entrega;
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
    if (!this.entregaEnRevision || this.notaInput == null) {
      return;
    }

    const indice = this.entregas.findIndex((entrega) => entrega.id === this.entregaEnRevision!.id);
    if (indice >= 0) {
      this.entregas[indice] = {
        ...this.entregaEnRevision,
        estado: 'evaluado',
        fechaEntrega: new Date().toLocaleDateString('es-CL', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        nota: this.notaInput,
        comentarios: this.comentariosInput || 'Sin comentarios adicionales.',
      };
    }

    this.cerrarEvalModal();
  }

  toggleResumen(entrega: Entrega) {
    entrega.expanded = !entrega.expanded;
  }
}