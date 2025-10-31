import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { TemaService, TemaDisponible as TemaAPI, CrearTemaPayload, TemaInscripcionActiva } from './tema.service';
import { PropuestaService, Propuesta } from '../../../shared/services/propuesta.service';
import { CurrentUserService } from '../../../shared/services/current-user.service';

type Tab = 'titulo1' | 'titulo2' | 'temas';
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

/** Tema usado en la UI. Incluye id para poder eliminar en backend */
interface TemaCreator {
  nombre: string;
  rol: string;
  carrera: string | null;
}

interface TemaDisponible {
  id?: number;
  titulo: string;
  objetivo: string;        // En backend no existe; lo derivamos de requisitos[0] o join
  descripcion: string;
  rama: string;            // Mapea a "carrera" del backend
  cupos: number;
  cuposDisponibles: number;
  requisitos: string;
  fecha: Date;             // Mapea a created_at
  creadoPor: TemaCreator | null;
  inscripcionesActivas: TemaInscripcionActiva[];
}

interface TemaDetalleInscripcion {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  rut: string | null;
  telefono: string | null;
  reservadoEn: Date;
}

interface TemaDetalleDocente {
  id: number;
  titulo: string;
  descripcion: string;
  carrera: string;
  cupos: number;
  cuposDisponibles: number;
  requisitos: string[];
  creadoPor: TemaCreator | null;
  inscripciones: TemaDetalleInscripcion[];
  creadoEn: Date | null;
}

@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent implements OnInit {
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
  toggleResumen(e: Entrega) { e.expanded = !e.expanded; }

  // ===== Temas (conectado a backend)
  ramas = ['Empresa', 'Desarrollo de software', 'Investigación', 'Artículo', 'I+D', 'Otro'];

  temas: TemaDisponible[] = [];
  temasCargando = false;
  temasError: string | null = null;

  showModalTema = false;
  enviarTema = false;
  enviarTemaError: string | null = null;

  nuevoTema: Partial<TemaDisponible> = {
    titulo: '', objetivo: '', descripcion: '', rama: '', cupos: 1, requisitos: '', inscripcionesActivas: []
  };

  showDetalleTema = false;
  temaDetalle: TemaDetalleDocente | null = null;
  temaDetalleCargando = false;
  temaDetalleError: string | null = null;

   constructor(
    private temaService: TemaService,
    private propuestaService: PropuestaService,
    private currentUserService: CurrentUserService,
  ) {}

  ngOnInit(): void {
    // Carga inicial de temas desde el backend
    this.cargarTemas();
  }

  private cargarTemas(): void {
    this.temasCargando = true;
    this.temasError = null;

    const perfil = this.currentUserService.getProfile();
    const opciones = perfil?.id != null ? { usuarioId: perfil.id } : undefined;

    this.temaService.getTemas(opciones)
      .pipe(finalize(() => (this.temasCargando = false)))
      .subscribe({
        next: (temasApi: TemaAPI[]) => {
          // Mapeo de API -> UI
          this.temas = temasApi.map(t => ({
            id: t.id,
            titulo: t.titulo,
            objetivo: (t.requisitos?.[0] ?? (t.requisitos?.join(', ') ?? '')),
            descripcion: t.descripcion,
            rama: t.carrera,
            cupos: t.cupos,
            cuposDisponibles: t.cuposDisponibles,
            requisitos: (t.requisitos?.join(', ') ?? ''),
            fecha: t.created_at ? new Date(t.created_at) : new Date(),
            creadoPor: t.creadoPor ?? null,
            inscripcionesActivas: t.inscripcionesActivas ?? [],
          }));
        },
        error: () => {
          this.temasError = 'No fue posible cargar los temas disponibles.';
        }
      });
  }

  abrirModalTema() {
    this.showModalTema = true;
    this.enviarTemaError = null;
  }
  cerrarModalTema() {
    this.showModalTema = false;
    this.nuevoTema = { titulo: '', objetivo: '', descripcion: '', rama: '', cupos: 1, requisitos: '', inscripcionesActivas: [] };
    this.enviarTema = false;
    this.enviarTemaError = null;
  }

  guardarTema() {
    // Validaciones mínimas (UI actual usa ngModel)
    if (!this.nuevoTema.titulo || !this.nuevoTema.descripcion || !this.nuevoTema.rama) return;

    const requisitosArray =
      (this.nuevoTema.requisitos ?? '')
        .toString()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const payload: CrearTemaPayload = {
      titulo: (this.nuevoTema.titulo ?? '').trim(),
      carrera: (this.nuevoTema.rama ?? '').trim(),
      descripcion: (this.nuevoTema.descripcion ?? '').trim(),
      requisitos: requisitosArray,
      cupos: Number(this.nuevoTema.cupos ?? 1),
      inscripcionesActivas: [],
      // created_by: (opcional) si tu backend lo necesita
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

    this.temaService.crearTema(payload)
      .pipe(finalize(() => (this.enviarTema = false)))
      .subscribe({
        next: (temaCreado: TemaAPI) => {
          // Mapeo API -> UI para insertar al inicio manteniendo tu tabla actual
          const autorRespuesta = temaCreado.creadoPor ?? null;
          const temaUI: TemaDisponible = {
            id: temaCreado.id,
            titulo: temaCreado.titulo,
            objetivo: (temaCreado.requisitos?.[0] ?? (temaCreado.requisitos?.join(', ') ?? '')),
            descripcion: temaCreado.descripcion,
            rama: temaCreado.carrera,
            cupos: temaCreado.cupos,
            cuposDisponibles: temaCreado.cuposDisponibles,
            requisitos: (temaCreado.requisitos?.join(', ') ?? ''),
            fecha: temaCreado.created_at ? new Date(temaCreado.created_at) : new Date(),
            creadoPor: autorRespuesta ?? autorActual ?? null,
            inscripcionesActivas: temaCreado.inscripcionesActivas ?? [],
          };
          this.temas = [temaUI, ...this.temas];
          this.cerrarModalTema();
        },
        error: () => {
          this.enviarTemaError = 'No se pudo guardar el tema. Inténtalo nuevamente.';
        }
      });
  }

  eliminarTema(tema: TemaDisponible) {
    if (!tema.id) {
      // Si por alguna razón vino sin id, lo quitamos localmente
      this.temas = this.temas.filter(t => t !== tema);
      return;
    }

    const confirmado = confirm(`¿Está seguro de eliminar el tema "${tema.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    this.temaService.eliminarTema(tema.id).subscribe({
      next: () => {
        this.temas = this.temas.filter(t => t.id !== tema.id);
      },
      error: () => {
        alert('No se pudo eliminar el tema. Inténtalo nuevamente.');
      }
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
      inscripciones: [],
      creadoEn: tema.fecha ?? null,
    };

    const perfil = this.currentUserService.getProfile();
    const opciones = perfil?.id != null ? { usuarioId: perfil.id } : undefined;

    this.temaService.obtenerTema(tema.id, opciones).subscribe({
      next: temaApi => {
        this.temaDetalle = {
          id: temaApi.id,
          titulo: temaApi.titulo,
          descripcion: temaApi.descripcion,
          carrera: temaApi.carrera,
          cupos: temaApi.cupos,
          cuposDisponibles: temaApi.cuposDisponibles,
          requisitos: temaApi.requisitos ?? [],
          creadoPor: temaApi.creadoPor ?? null,
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
      }
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

  // ===== Propuestas (conectado a backend)
  showPropuestasModal = false;
  propuestaSeleccionada: Propuesta | null = null;
  comentarioDecision = '';
  propuestas: Propuesta[] = [];
  propuestasCargando = false;
  propuestasError: string | null = null;
  propuestasCargadas = false;
  decisionEnCurso = false;

  togglePropuestasModal(v: boolean) {
    this.showPropuestasModal = v;
     if (v) {
      this.cargarPropuestas();
    } else {
      this.propuestaSeleccionada = null;
      this.comentarioDecision = '';
      this.decisionEnCurso = false;
    }
  }

  seleccionarPropuesta(p: Propuesta) {
    this.propuestaSeleccionada = p;
     this.comentarioDecision = p.comentarioDecision ?? '';
  }
  aceptarPropuesta() {
    this.resolverPropuesta('aceptada');
  }

  rechazarPropuesta() {
   this.resolverPropuesta('rechazada');
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

  private resolverPropuesta(estado: 'aceptada' | 'rechazada') {
    if (!this.propuestaSeleccionada) {
      return;
    }

    const comentario = this.comentarioDecision.trim();
    if (!comentario) {
      return;
    }
    const docenteId = this.obtenerDocenteIdActual();
    if (!docenteId) {
      this.propuestasError = 'No se pudo determinar el docente actual.';
      return;
    }

    this.decisionEnCurso = true;
    this.propuestaService
      .actualizarPropuesta(this.propuestaSeleccionada.id, {
        estado,
        comentarioDecision: comentario,
        docenteId,
      })
      .pipe(finalize(() => (this.decisionEnCurso = false)))
      .subscribe({
        next: (actualizada) => {
          this.propuestas = this.propuestas.map((p) =>
            p.id === actualizada.id ? actualizada : p
          );
          this.togglePropuestasModal(false);
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