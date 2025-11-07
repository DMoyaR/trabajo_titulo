import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { TemaService, TemaDisponible as TemaAPI, CrearTemaPayload, TemaInscripcionActiva } from '../trabajolist/tema.service';
import {
  PropuestaService,
  Propuesta,
  ActualizarPropuestaPayload,
} from '../../../shared/services/propuesta.service';
import { CurrentUserService } from '../../../shared/services/current-user.service';

type Rama = 'Empresa' | 'Desarrollo de software' | 'Investigación' | 'Artículo' | 'I+D' | 'Otro';

type TemaCreator = {
  nombre: string;
  rol: string;
  carrera: string | null;
};

type TemaDisponible = {
  id?: number;
  titulo: string;
  objetivo: string;
  descripcion: string;
  rama: string;
  cupos: number;
  cuposDisponibles: number;
  requisitos: string;
  fecha: Date | null;
  creadoPor: TemaCreator | null;
  docenteACargo: TemaCreator | null;
  docenteResponsableId: number | null;
  inscripcionesActivas: TemaInscripcionActiva[];
};

type TemaDetalleInscripcion = {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  rut: string | null;
  telefono: string | null;
  reservadoEn: Date;
};

type TemaDetalleDocente = {
  id: number;
  titulo: string;
  descripcion: string;
  carrera: string;
  cupos: number;
  cuposDisponibles: number;
  requisitos: string[];
  creadoPor: TemaCreator | null;
  docenteACargo: TemaCreator | null;
  docenteResponsableId: number | null;
  inscripciones: TemaDetalleInscripcion[];
  creadoEn: Date | null;
};

@Component({
  selector: 'docente-temas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './docente-temas.component.html',
  styleUrls: ['./docente-temas.component.css'],
})
export class DocenteTemasComponent implements OnInit {
  readonly ramas: Rama[] = ['Empresa', 'Desarrollo de software', 'Investigación', 'Artículo', 'I+D', 'Otro'];

  temas: TemaDisponible[] = [];
  temasCargando = false;
  temasError: string | null = null;

  showModalTema = false;
  enviarTema = false;
  enviarTemaError: string | null = null;

  nuevoTema: Partial<TemaDisponible> = {
    titulo: '',
    objetivo: '',
    descripcion: '',
    rama: '',
    cupos: 1,
    requisitos: '',
    docenteACargo: null,
    docenteResponsableId: null,
    inscripcionesActivas: [],
  };

  showDetalleTema = false;
  temaDetalle: TemaDetalleDocente | null = null;
  temaDetalleCargando = false;
  temaDetalleError: string | null = null;

  showPropuestasModal = false;
  propuestaSeleccionada: Propuesta | null = null;
  comentarioDecision = '';
  cuposAutorizados: number | null = null;
  comentarioError: string | null = null;
  propuestas: Propuesta[] = [];
  propuestasCargando = false;
  propuestasError: string | null = null;
  private propuestasCargadas = false;
  decisionEnCurso = false;

  constructor(
    private readonly temaService: TemaService,
    private readonly propuestaService: PropuestaService,
    private readonly currentUserService: CurrentUserService,
  ) {}

  ngOnInit(): void {
    this.cargarTemas();
  }

  abrirModalTema() {
    this.showModalTema = true;
    this.enviarTemaError = null;
  }

  cerrarModalTema() {
    if (this.enviarTema) {
      return;
    }
    this.showModalTema = false;
    this.nuevoTema = {
      titulo: '',
      objetivo: '',
      descripcion: '',
      rama: '',
      cupos: 1,
      requisitos: '',
      docenteACargo: null,
      docenteResponsableId: null,
      inscripcionesActivas: [],
    };
    this.enviarTema = false;
    this.enviarTemaError = null;
  }

  guardarTema() {
    if (!this.nuevoTema.titulo || !this.nuevoTema.descripcion || !this.nuevoTema.rama) {
      return;
    }

    const requisitosArray = (this.nuevoTema.requisitos ?? '')
      .toString()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: CrearTemaPayload = {
      titulo: (this.nuevoTema.titulo ?? '').trim(),
      carrera: (this.nuevoTema.rama ?? '').trim(),
      descripcion: (this.nuevoTema.descripcion ?? '').trim(),
      requisitos: requisitosArray,
      cupos: Number(this.nuevoTema.cupos ?? 1),
      inscripcionesActivas: [],
    };

    const perfil = this.currentUserService.getProfile();
    if (perfil?.id) {
      payload.created_by = perfil.id;
    }

    const autorActual = perfil
      ? {
          nombre: perfil.nombre,
          rol: perfil.rol,
          carrera: perfil.carrera ?? null,
        }
      : null;

    this.enviarTema = true;
    this.enviarTemaError = null;

    this.temaService
      .crearTema(payload)
      .pipe(finalize(() => (this.enviarTema = false)))
      .subscribe({
        next: (temaCreado: TemaAPI) => {
          const temaUI: TemaDisponible = {
            id: temaCreado.id,
            titulo: temaCreado.titulo,
            objetivo: temaCreado.requisitos?.[0] ?? temaCreado.descripcion,
            descripcion: temaCreado.descripcion,
            rama: temaCreado.carrera,
            cupos: temaCreado.cupos,
            cuposDisponibles: temaCreado.cuposDisponibles,
            requisitos: (temaCreado.requisitos?.join(', ') ?? ''),
            fecha: temaCreado.created_at ? new Date(temaCreado.created_at) : new Date(),
            creadoPor: temaCreado.creadoPor ?? autorActual ?? null,
            docenteACargo: temaCreado.docenteACargo ?? (autorActual?.rol === 'docente' ? autorActual : null),
            docenteResponsableId: temaCreado.docente_responsable ?? (perfil?.id ?? null),
            inscripcionesActivas: temaCreado.inscripcionesActivas ?? [],
          };
          this.temas = [temaUI, ...this.temas];
          this.cerrarModalTema();
        },
        error: () => {
          this.enviarTemaError = 'No se pudo guardar el tema. Inténtalo nuevamente.';
        },
      });
  }

  eliminarTema(tema: TemaDisponible) {
    if (!tema.id) {
      this.temas = this.temas.filter((t) => t !== tema);
      return;
    }

    const confirmado = confirm(`¿Está seguro de eliminar el tema "${tema.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) {
      return;
    }

    this.temaService.eliminarTema(tema.id).subscribe({
      next: () => {
        this.temas = this.temas.filter((t) => t.id !== tema.id);
      },
      error: () => {
        alert('No se pudo eliminar el tema. Inténtalo nuevamente.');
      },
    });
  }

  verDetalleTema(tema: TemaDisponible) {
    if (!tema.id) {
      return;
    }

    this.showDetalleTema = true;
    this.temaDetalleError = null;
    this.temaDetalleCargando = true;
    this.temaDetalle = {
      id: tema.id,
      titulo: tema.titulo,
      descripcion: tema.descripcion,
      carrera: tema.rama,
      cupos: tema.cupos,
      cuposDisponibles: tema.cuposDisponibles,
      requisitos: [],
      creadoPor: tema.creadoPor,
      docenteACargo: tema.docenteACargo,
      docenteResponsableId: tema.docenteResponsableId ?? null,
      inscripciones: [],
      creadoEn: tema.fecha ?? null,
    };

    const perfil = this.currentUserService.getProfile();
    const opciones = perfil?.id != null ? { usuarioId: perfil.id } : undefined;

    this.temaService.obtenerTema(tema.id, opciones).subscribe({
      next: (temaApi) => {
        this.temaDetalle = {
          id: temaApi.id,
          titulo: temaApi.titulo,
          descripcion: temaApi.descripcion,
          carrera: temaApi.carrera,
          cupos: temaApi.cupos,
          cuposDisponibles: temaApi.cuposDisponibles,
          requisitos: temaApi.requisitos ?? [],
          creadoPor: temaApi.creadoPor ?? null,
          docenteACargo: temaApi.docenteACargo ?? null,
          docenteResponsableId: temaApi.docente_responsable ?? null,
          inscripciones: (temaApi.inscripcionesActivas ?? []).map((ins): TemaDetalleInscripcion => ({
            id: ins.id,
            nombre: ins.nombre,
            correo: ins.correo,
            carrera: ins.carrera,
            rut: ins.rut,
            telefono: ins.telefono,
            reservadoEn: new Date(ins.reservadoEn),
          })),
          creadoEn: temaApi.created_at ? new Date(temaApi.created_at) : null,
        };
        this.temaDetalleCargando = false;
      },
      error: () => {
        this.temaDetalleError = 'No se pudo cargar el detalle del tema.';
        this.temaDetalleCargando = false;
      },
    });
  }

  cerrarDetalleTema() {
    if (this.temaDetalleCargando) {
      return;
    }
    this.showDetalleTema = false;
    this.temaDetalle = null;
    this.temaDetalleError = null;
  }

  togglePropuestasModal(v: boolean) {
    this.showPropuestasModal = v;
    if (v) {
      this.cargarPropuestas();
    } else {
      this.propuestaSeleccionada = null;
      this.comentarioDecision = '';
      this.comentarioError = null;
      this.cuposAutorizados = null;
      this.decisionEnCurso = false;
    }
  }

  seleccionarPropuesta(p: Propuesta) {
    this.propuestaSeleccionada = p;
    this.comentarioDecision = p.comentarioDecision ?? '';
    this.comentarioError = null;
    this.cuposAutorizados = p.cuposMaximoAutorizado ?? p.cuposRequeridos;
  }

  onComentarioChange(value: string) {
    this.comentarioDecision = value;
    if (value.trim()) {
      this.comentarioError = null;
    }
  }


  solicitarAjuste() {
    if (!this.propuestaSeleccionada) {
      return;
    }

    const cupos = this.obtenerCuposAutorizados();
    if (cupos == null) {
      this.propuestasError = 'Indica el nuevo máximo de cupos permitido.';
      return;
    }

    if (cupos >= this.propuestaSeleccionada.cuposRequeridos) {
      this.propuestasError = 'El máximo permitido debe ser menor a lo solicitado.';
      return;
    }

    const comentario = this.comentarioDecision.trim();
    if (!comentario) {
      this.propuestasError = 'Describe por qué solicitas el ajuste de cupos.';
      return;
    }

    this.enviarAccion({
      accion: 'solicitar_ajuste',
      cuposAutorizados: cupos,
      comentarioDecision: comentario,
    });
  }

  aprobarDefinitivo() {
    if (!this.propuestaSeleccionada) {
      return;
    }

    const comentario = this.comentarioDecision.trim();

    if (!comentario) {
      this.comentarioError = 'Debes ingresar un comentario para aprobar la propuesta.';
      return;
    }

    this.comentarioError = null;

    this.enviarAccion({
      accion: 'aprobar_final',
      comentarioDecision: comentario,
    });
  }

  rechazarPropuesta() {
    const comentario = this.comentarioDecision.trim();
    if (!this.propuestaSeleccionada) {
      return;
    }

    if (!comentario) {
      this.comentarioError = 'Debes ingresar un comentario para rechazar la propuesta.';
      return;
    }

    this.comentarioError = null;

    this.enviarAccion({
      accion: 'rechazar',
      comentarioDecision: comentario,
    });
  }

  

  estadoChipClase(estado: Propuesta['estado']): string {
    switch (estado) {
      case 'aceptada':
        return 'chip-ok';
      case 'rechazada':
        return 'chip-bad';
      case 'pendiente_ajuste':
        return 'chip-warn';
      case 'pendiente_aprobacion':
        return 'chip-info';
      default:
        return 'chip-warn';
    }
  }

  estadoChipTexto(estado: Propuesta['estado']): string {
    switch (estado) {
      case 'aceptada':
        return 'Aceptada';
      case 'rechazada':
        return 'Rechazada';
      case 'pendiente_ajuste':
        return 'Pendiente ajuste';
      case 'pendiente_aprobacion':
        return 'Pendiente aprobación';
      default:
        return 'Pendiente';
    }
  }

  private cargarTemas() {
    this.temasCargando = true;
    this.temasError = null;

    const perfil = this.currentUserService.getProfile();
    const opciones = perfil?.id != null ? { usuarioId: perfil.id } : undefined;

    this.temaService
      .getTemas(opciones)
      .pipe(finalize(() => (this.temasCargando = false)))
      .subscribe({
        next: (temasApi: TemaAPI[]) => {
          this.temas = temasApi.map((t) => ({
            id: t.id,
            titulo: t.titulo,
            objetivo: t.requisitos?.[0] ?? t.descripcion,
            descripcion: t.descripcion,
            rama: t.carrera,
            cupos: t.cupos,
            cuposDisponibles: t.cuposDisponibles,
            requisitos: (t.requisitos?.join(', ') ?? ''),
            fecha: t.created_at ? new Date(t.created_at) : new Date(),
            creadoPor: t.creadoPor ?? null,
            docenteACargo: t.docenteACargo ?? null,
            docenteResponsableId: t.docente_responsable ?? null,
            inscripcionesActivas: t.inscripcionesActivas ?? [],
          }));
        },
        error: () => {
          this.temasError = 'No fue posible cargar los temas disponibles.';
        },
      });
  }

  private cargarPropuestas(force = false) {
    if (this.propuestasCargando || (this.propuestasCargadas && !force)) {
      return;
    }

    const docenteId = this.obtenerDocenteIdActual();
    if (!docenteId) {
      this.propuestasError = 'No se pudo determinar el docente actual.';
      this.propuestas = [];
      this.propuestasCargadas = true;
      return;
    }

    this.propuestasCargando = true;
    this.propuestasError = null;

    this.propuestaService
      .listarPorDocente(docenteId)
      .pipe(finalize(() => (this.propuestasCargando = false)))
      .subscribe({
        next: (propuestas) => {
          this.propuestas = propuestas;
          this.propuestasCargadas = true;
        },
        error: () => {
          this.propuestasError = 'No fue posible cargar las propuestas.';
        },
      });
  }

  private obtenerCuposAutorizados(): number | null {
    if (this.cuposAutorizados == null || Number.isNaN(this.cuposAutorizados)) {
      return null;
    }
    const valor = Number(this.cuposAutorizados);
    if (valor < 1) {
      return null;
    }
    return Math.floor(valor);
  }

  private enviarAccion(payload: Omit<ActualizarPropuestaPayload, 'docenteId'>) {
    if (!this.propuestaSeleccionada) {
      return;
    }

    const docenteId = this.obtenerDocenteIdActual();
    if (!docenteId) {
      this.propuestasError = 'No se pudo determinar el docente actual.';
      return;
    }

    this.decisionEnCurso = true;
    this.propuestasError = null;

    this.propuestaService
      .actualizarPropuesta(this.propuestaSeleccionada.id, {
        ...payload,
        docenteId,
      })
      .pipe(finalize(() => (this.decisionEnCurso = false)))
      .subscribe({
        next: (actualizada) => {
          this.propuestas = this.propuestas.map((p) => (p.id === actualizada.id ? actualizada : p));
          this.propuestaSeleccionada = actualizada;
          this.comentarioDecision = actualizada.comentarioDecision ?? '';
          this.cuposAutorizados = actualizada.cuposMaximoAutorizado ?? actualizada.cuposRequeridos;
          if (payload.accion === 'solicitar_ajuste') {
            this.togglePropuestasModal(false);
            return;
          }
          if (
            actualizada.estado === 'aceptada' ||
            actualizada.estado === 'rechazada' ||
            actualizada.estado === 'pendiente_ajuste'
          ) {
            this.togglePropuestasModal(false);
          }
        },
        error: () => {
          this.propuestasError = 'No fue posible actualizar la propuesta.';
        },
      });
  }

  private obtenerDocenteIdActual(): number | null {
    const perfil = this.currentUserService.getProfile();
    return perfil?.id ?? null;
  }
}