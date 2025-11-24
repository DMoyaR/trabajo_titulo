import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Tab = 'titulo1' | 'titulo2';
type EstadoGrupo = 'pendiente' | 'en_revision' | 'aprobado' | 'finalizado';
type EstadoEntrega = 'pendiente' | 'evaluado';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import { TemaDisponible, TemaService } from './tema.service';
import {
  DocenteEvaluacionesService,
  EvaluacionEntregaDto,
  EvaluacionGrupoDto,
} from '../evaluaciones/docente-evaluaciones.service';

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
  ordenFecha?: number;
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

  docenteId: number | null = null;

  grupoSeleccionado: Grupo | null = null;
  entregas: Entrega[] = [];
  entregasPorGrupo = new Map<string, Entrega[]>();
  cargandoEntregas = false;
  errorEntregas: string | null = null;

  tiposEntrega = ['Todos'];
  filtroTipo = 'Todos';
  filtroBusqueda = '';

  showEvalModal = false;
  entregaEnRevision: Entrega | null = null;
  notaInput: number | null = null;
  comentariosInput = '';

  constructor(
    private readonly temaService: TemaService,
    private readonly currentUserService: CurrentUserService,
    private readonly evaluacionesService: DocenteEvaluacionesService,
  ) {}

  ngOnInit(): void {
    const perfil = this.currentUserService.getProfile();
    this.docenteId = perfil?.id ?? null;

    this.cargarGrupos();

    if (this.docenteId) {
      this.cargarEntregas(this.docenteId);
    }
  }

  private cargarGrupos(): void {
    if (!this.docenteId) {
      this.gruposTitulo1 = [];
      this.gruposTitulo2 = [];
      this.errorGrupos = 'No se encontró información del docente.';
      return;
    }

    this.cargandoGrupos = true;
    this.errorGrupos = null;

    this.temaService.getTemas({ usuarioId: this.docenteId }).subscribe({
      next: temas => {
        const gruposTitulo1: Grupo[] = [];
        const gruposTitulo2: Grupo[] = [];

        temas
          .filter(tema => this.esTemaDelDocente(tema, this.docenteId!))
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

  private cargarEntregas(docenteId: number): void {
    this.cargandoEntregas = true;
    this.errorEntregas = null;

    this.evaluacionesService.listar(docenteId).subscribe({
      next: evaluaciones => {
        this.entregasPorGrupo = this.mapearEntregasPorGrupo(evaluaciones);
        this.actualizarEntregasSeleccionadas();
        this.cargandoEntregas = false;
      },
      error: err => {
        console.error('No fue posible cargar las entregas de los alumnos', err);
        this.errorEntregas = 'No pudimos obtener las entregas registradas.';
        this.entregasPorGrupo = new Map();
        this.entregas = [];
        this.actualizarTiposEntrega();
        this.cargandoEntregas = false;
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

    this.actualizarEntregasSeleccionadas();
  }

  volverAListaGrupos() {
    this.grupoSeleccionado = null;
    this.entregas = [];
    this.actualizarTiposEntrega();
  }

  get entregasFiltradas(): Entrega[] {
    const texto = this.filtroBusqueda.trim().toLowerCase();
    return this.entregas.filter((entrega) => {
      const coincideTipo = this.filtroTipo === 'Todos' || entrega.tipo === this.filtroTipo;
      const coincideBusqueda =
        !texto ||
        entrega.titulo.toLowerCase().includes(texto) ||
        (entrega.tipo ?? '').toLowerCase().includes(texto);
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
        fechaEntrega: this.formatearFecha(new Date()),
        ordenFecha: Date.now(),
        nota: this.notaInput,
        comentarios: this.comentariosInput || 'Sin comentarios adicionales.',
      };

      if (this.grupoSeleccionado) {
        this.entregasPorGrupo.set(this.grupoSeleccionado.id, [...this.entregas]);
      }
    }

    this.cerrarEvalModal();
  }

  toggleResumen(entrega: Entrega) {
    entrega.expanded = !entrega.expanded;
  }

  private actualizarEntregasSeleccionadas(): void {
    if (!this.grupoSeleccionado) {
      this.entregas = [];
      this.actualizarTiposEntrega();
      return;
    }

    const entregasGrupo = this.entregasPorGrupo.get(this.grupoSeleccionado.id) ?? [];
    this.entregas = [...entregasGrupo];
    this.actualizarTiposEntrega();
  }

  private actualizarTiposEntrega(): void {
    const tipos = new Set<string>();
    this.entregas.forEach((entrega) => {
      const tipo = entrega.tipo?.trim();
      if (tipo) {
        tipos.add(tipo);
      }
    });

    this.tiposEntrega = [
      'Todos',
      ...Array.from(tipos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
    ];

    if (!this.tiposEntrega.includes(this.filtroTipo)) {
      this.filtroTipo = 'Todos';
    }
  }

  private mapearEntregasPorGrupo(
    evaluaciones: EvaluacionGrupoDto[],
  ): Map<string, Entrega[]> {
    const mapa = new Map<string, Entrega[]>();

    evaluaciones.forEach((evaluacion) => {
      const clave = this.claveGrupo(evaluacion.tema ?? evaluacion.grupo?.id ?? null);
      if (!clave) {
        return;
      }

      const entregasActuales = mapa.get(clave) ?? [];
      const nuevas = (evaluacion.entregas ?? []).map((entrega) =>
        this.mapEntrega(entrega, evaluacion),
      );

      const combinadas = [...entregasActuales, ...nuevas].sort(
        (a, b) => (b.ordenFecha ?? 0) - (a.ordenFecha ?? 0),
      );

      mapa.set(clave, combinadas);
    });

    return mapa;
  }

  private mapEntrega(entrega: EvaluacionEntregaDto, evaluacion: EvaluacionGrupoDto): Entrega {
    const fechaEntrega = this.parseFecha(entrega.creado_en);
    const fechaLimite = this.parseFecha(evaluacion.fecha ?? null);
    const ordenFecha = fechaEntrega?.getTime() ?? fechaLimite?.getTime() ?? 0;

    return {
      id: String(entrega.id),
      titulo: entrega.titulo || evaluacion.titulo || 'Entrega',
      tipo: evaluacion.titulo || 'Evaluación',
      estado: entrega.estado_revision === 'revisada' ? 'evaluado' : 'pendiente',
      fechaLimite: fechaLimite ? this.formatearFecha(fechaLimite) : undefined,
      fechaEntrega: fechaEntrega ? this.formatearFecha(fechaEntrega) : undefined,
      nota: entrega.nota ?? undefined,
      comentarios: entrega.comentario ?? evaluacion.comentario ?? undefined,
      ordenFecha,
    };
  }

  private claveGrupo(temaId: number | null | undefined): string | null {
    if (temaId == null) {
      return null;
    }
    return `tema-${temaId}`;
  }

  private parseFecha(valor: string | null | undefined): Date | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}