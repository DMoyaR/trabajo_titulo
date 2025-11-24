import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Tab = 'titulo1' | 'titulo2';
type EstadoGrupo = 'pendiente' | 'en_revision' | 'aprobado' | 'finalizado';
type EstadoEntrega = 'pendiente' | 'evaluado';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import { TemaDisponible, TemaService } from './tema.service';

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
export class DocenteTrabajoListComponent implements OnInit {
  tab: Tab = 'titulo1';

  gruposTitulo1: Grupo[] = [];
  gruposTitulo2: Grupo[] = [];
  cargandoGrupos = false;
  errorGrupos: string | null = null;

  grupoSeleccionado: Grupo | null = null;
  entregas: Entrega[] = [];

  tiposEntrega = ['Todos', 'Plan de trabajo', 'Bitácora', 'Reunión', 'Informe'];
  filtroTipo = 'Todos';
  filtroBusqueda = '';

  showEvalModal = false;
  entregaEnRevision: Entrega | null = null;
  notaInput: number | null = null;
  comentariosInput = '';

  constructor(
    private readonly temaService: TemaService,
    private readonly currentUserService: CurrentUserService,
  ) {}

  ngOnInit(): void {
    this.cargarGrupos();
  }

  private cargarGrupos(): void {
    const perfil = this.currentUserService.getProfile();
    const docenteId = perfil?.id ?? null;

    if (!docenteId) {
      this.gruposTitulo1 = [];
      this.gruposTitulo2 = [];
      this.errorGrupos = 'No se encontró información del docente.';
      return;
    }

    this.cargandoGrupos = true;
    this.errorGrupos = null;

    this.temaService.getTemas({ usuarioId: docenteId }).subscribe({
      next: temas => {
        const gruposTitulo1: Grupo[] = [];
        const gruposTitulo2: Grupo[] = [];

        temas
          .filter(tema => this.esTemaDelDocente(tema, docenteId))
          .forEach(tema => {
            const integrantes = (tema.inscripcionesActivas ?? [])
              .map(inscripcion => inscripcion.nombre)
              .filter((nombre): nombre is string => !!nombre && !!nombre.trim());

            if (!integrantes.length) {
              return;
            }

            const grupo: Grupo = {
              id: `tema-${tema.id}`,
              nombre: tema.titulo,
              integrantes,
              estado: this.estadoGrupoDesdeTema(tema),
            };

            const nivel = this.determinarNivelTema(tema);
            if (nivel === 'titulo2') {
              gruposTitulo2.push(grupo);
            } else {
              gruposTitulo1.push(grupo);
            }
          });

        this.gruposTitulo1 = gruposTitulo1;
        this.gruposTitulo2 = gruposTitulo2;
        this.cargandoGrupos = false;
      },
      error: err => {
        console.error('No fue posible cargar los grupos del docente', err);
        this.errorGrupos = 'No fue posible cargar los grupos asignados.';
        this.gruposTitulo1 = [];
        this.gruposTitulo2 = [];
        this.cargandoGrupos = false;
      },
    });
  }

  private esTemaDelDocente(tema: TemaDisponible, docenteId: number): boolean {
    return tema.docente_responsable === docenteId || tema.created_by === docenteId;
  }

  private determinarNivelTema(tema: TemaDisponible): Tab {
    const referencia = `${tema.rama ?? ''} ${tema.descripcion ?? ''}`.toLowerCase();
    if (referencia.includes('título ii') || referencia.includes('titulo ii') || referencia.includes('tt2') || referencia.includes('título 2')) {
      return 'titulo2';
    }
    return 'titulo1';
  }

  private estadoGrupoDesdeTema(tema: TemaDisponible): EstadoGrupo {
    if (tema.cuposDisponibles <= 0) {
      return 'aprobado';
    }
    if ((tema.inscripcionesActivas ?? []).length > 0) {
      return 'en_revision';
    }
    return 'pendiente';
  }

  get gruposActuales(): Grupo[] {
    return this.tab === 'titulo1' ? this.gruposTitulo1 : this.gruposTitulo2;
  }

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