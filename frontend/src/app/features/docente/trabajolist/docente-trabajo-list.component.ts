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
  fechaLimite: string | null;
  fechaEntrega: string | null;
  nota: number | null;
  comentarios: string | null;
  archivoNombre: string | null;
  archivoUrl: string | null;
  archivoTipo: string | null;
  alumnoNombre: string | null;
  alumnoCorreo: string | null;
  esBitacora?: boolean;
  bitacoraIndice?: number | null;
  rubricaNombre: string | null;
  rubricaUrl: string | null;
  rubricaTipo: string | null;
  informeNombre: string | null;
  informeUrl: string | null;
  informeTipo: string | null;
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

  filtroCategoria: 'Todos' | 'Evaluaciones' | 'Bitácoras' = 'Todos';
  filtroBusqueda = '';

  showEvalModal = false;
  entregaEnRevision: Entrega | null = null;
  guardandoEvaluacion = false;
  errorEvaluacion: string | null = null;
  notaInput: number | null = null;
  comentariosInput = '';
  rubricaArchivo: File | null = null;
  informeArchivo: File | null = null;

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
    this.filtroCategoria = 'Todos';
    this.filtroBusqueda = '';

    this.actualizarEntregasSeleccionadas();
  }

  volverAListaGrupos() {
    this.grupoSeleccionado = null;
    this.entregas = [];
  }

  get entregasFiltradas(): Entrega[] {
    const texto = this.filtroBusqueda.trim().toLowerCase();
    return this.entregas.filter((entrega) => {
      const coincideCategoria =
        this.filtroCategoria === 'Todos' ||
        (this.filtroCategoria === 'Bitácoras' ? entrega.esBitacora : !entrega.esBitacora);
      const coincideBusqueda =
        !texto ||
        entrega.titulo.toLowerCase().includes(texto) ||
        (entrega.tipo ?? '').toLowerCase().includes(texto);
      return coincideCategoria && coincideBusqueda;
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
    this.notaInput = entrega.esBitacora ? null : entrega.nota;
    this.comentariosInput = '';
    this.rubricaArchivo = null;
    this.informeArchivo = null;
    this.showEvalModal = true;
  }

  cerrarEvalModal() {
    this.showEvalModal = false;
    this.entregaEnRevision = null;
    this.guardandoEvaluacion = false;
    this.errorEvaluacion = null;
    this.notaInput = null;
    this.comentariosInput = '';
    this.rubricaArchivo = null;
    this.informeArchivo = null;
  }

  guardarEvaluacion() {
    if (!this.entregaEnRevision || this.guardandoEvaluacion) {
      return;
    }

    const esBitacora = Boolean(this.entregaEnRevision.esBitacora);
    if (!esBitacora) {
      const notaNormalizada = this.normalizarNota(this.notaInput);

      if (notaNormalizada == null) {
        this.errorEvaluacion = 'La nota debe estar entre 1.0 y 7.0';
        return;
      }

      this.notaInput = notaNormalizada;
    } else {
      this.notaInput = null;
    }


    const entregaEnRevision = this.entregaEnRevision;

    this.guardandoEvaluacion = true;
    this.errorEvaluacion = null;

    const rubricaAdjunta = esBitacora ? null : this.adjuntoDesdeArchivo(this.rubricaArchivo);
    const informeAdjunto = esBitacora ? null : this.adjuntoDesdeArchivo(this.informeArchivo);

    this.evaluacionesService
      .actualizarEntrega(
        Number(entregaEnRevision.id),
        {
          nota: this.notaInput,
          comentario: this.comentariosInput || 'Sin comentarios adicionales.',
          estado_revision: 'revisada',
        },
        esBitacora ? undefined : { rubrica: this.rubricaArchivo, informe: this.informeArchivo },
      )
      .subscribe({
        next: (entregaActualizada) => {
          const fechaEntrega =
            this.parseFecha(entregaActualizada.actualizado_en) ||
            this.parseFecha(entregaActualizada.creado_en) ||
            new Date();

          const indice = this.entregas.findIndex(
            (entrega) => entrega.id === entregaEnRevision.id,
          );

          if (indice >= 0) {
            this.entregas[indice] = {
              ...entregaEnRevision,
              estado: 'evaluado',
              fechaEntrega: this.formatearFecha(fechaEntrega),
              ordenFecha: fechaEntrega.getTime(),
              nota: entregaActualizada.nota ?? this.notaInput,
              comentarios:
                entregaActualizada.comentario || 'Sin comentarios adicionales.',
              rubricaNombre:
                entregaActualizada.rubrica_docente_nombre || rubricaAdjunta?.nombre || null,
              rubricaUrl:
                entregaActualizada.rubrica_docente_url || rubricaAdjunta?.url || null,
              rubricaTipo:
                entregaActualizada.rubrica_docente_tipo || rubricaAdjunta?.tipo || null,
              informeNombre:
                entregaActualizada.informe_corregido_nombre || informeAdjunto?.nombre || null,
              informeUrl:
                entregaActualizada.informe_corregido_url || informeAdjunto?.url || null,
              informeTipo:
                entregaActualizada.informe_corregido_tipo || informeAdjunto?.tipo || null,
            };

            if (this.grupoSeleccionado) {
              this.entregasPorGrupo.set(this.grupoSeleccionado.id, [...this.entregas]);
            }
          }

          this.cerrarEvalModal();
          this.guardandoEvaluacion = false;
        },
        error: (err) => {
          console.error('No fue posible guardar la evaluación de la entrega', err);
          this.errorEvaluacion =
            'No pudimos guardar la evaluación. Revisa tu conexión e intenta nuevamente.';
          this.guardandoEvaluacion = false;
        },
      });
  }

  toggleResumen(entrega: Entrega) {
    entrega.expanded = !entrega.expanded;
  }

  private normalizarNota(nota: number | null): number | null {
    if (nota == null || Number.isNaN(nota)) {
      return null;
    }

    const tieneMasDeUnDecimal = !Number.isInteger(nota * 10);

    if (tieneMasDeUnDecimal) {
      return null;
    }

    const notaRedondeada = Math.round(nota * 10) / 10;

    if (notaRedondeada < 1 || notaRedondeada > 7) {
      return null;
    }

    return notaRedondeada;
  }



  private actualizarEntregasSeleccionadas(): void {
    if (!this.grupoSeleccionado) {
      this.entregas = [];
      return;
    }

    const entregasGrupo = this.entregasPorGrupo.get(this.grupoSeleccionado.id) ?? [];
    this.entregas = [...entregasGrupo];
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

  onRubricaSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.rubricaArchivo = input?.files?.[0] ?? null;
  }

  onInformeSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.informeArchivo = input?.files?.[0] ?? null;
  }

  private adjuntoDesdeArchivo(archivo: File | null):
    | { nombre: string; url: string; tipo: string }
    | null {
    if (!archivo) {
      return null;
    }

    return {
      nombre: archivo.name,
      url: URL.createObjectURL(archivo),
      tipo: archivo.type || 'Archivo',
    };
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
      fechaLimite: fechaLimite ? this.formatearFecha(fechaLimite) : null,
      fechaEntrega: fechaEntrega ? this.formatearFecha(fechaEntrega) : null,
      nota: entrega.nota ?? null,
      comentarios: entrega.comentario ?? evaluacion.comentario ?? null,
      archivoNombre: entrega.archivo_nombre || null,
      archivoUrl: entrega.archivo_url || null,
      archivoTipo: entrega.archivo_tipo || null,
      alumnoNombre: entrega.alumno?.nombre || null,
      alumnoCorreo: entrega.alumno?.correo || null,
      esBitacora: Boolean(entrega.es_bitacora),
      bitacoraIndice: entrega.bitacora_indice ?? null,
      rubricaNombre: entrega.rubrica_docente_nombre || null,
      rubricaUrl: entrega.rubrica_docente_url || null,
      rubricaTipo: entrega.rubrica_docente_tipo || null,
      informeNombre: entrega.informe_corregido_nombre || null,
      informeUrl: entrega.informe_corregido_url || null,
      informeTipo: entrega.informe_corregido_tipo || null,
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