import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CurrentUserService } from '../../../shared/services/current-user.service';
import { ReunionesService, SolicitudReunion } from '../../../shared/services/reuniones.service';
import {
  DocenteEvaluacionesService,
  EvaluacionEntregaDto,
  EvaluacionGrupoDto,
} from '../evaluaciones/docente-evaluaciones.service';
import { TemaDisponible, TemaService } from '../trabajolist/tema.service';

type EntregaDocente = {
  id: number;
  evaluacionId: number;
  evaluacionTitulo: string;
  esBitacora: boolean;
  bitacoraIndice: number | null;
  grupo: string;
  alumnoNombre: string;
  alumnoCorreo: string | null;
  comentario: string | null;
  fecha: Date;
  archivoNombre: string;
  archivoUrl: string | null;
  estadoRevision: 'pendiente' | 'revisada';
  nota: number | null;
};

type ResumenEstudiante = {
  nombre: string;
  carrera: string;
  proceso: string;
  proyecto: string;
  avance: number | null;
  correo: string | null;
};

type EntregasPorGrupo = {
  nombre: string;
  pendientes: EntregaDocente[];
  revisadas: EntregaDocente[];
  abierto: boolean;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './docente-dashboard.component.html',
  styleUrls: ['./docente-dashboard.component.css']
})
export class DocenteDashboardComponent implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);
  private readonly reunionesService = inject(ReunionesService);
  private readonly evaluacionesService = inject(DocenteEvaluacionesService);
  private readonly temaService = inject(TemaService);
  private readonly fb = inject(FormBuilder);

  estudiantes: ResumenEstudiante[] = [];
  estudiantesFiltrados: ResumenEstudiante[] = [];
  carrerasDisponibles: string[] = [];
  procesosDisponibles: string[] = [];

  filtros = {
    carrera: '',
    proyecto: '',
    proceso: '',
    avance: '',
  };
  cargandoEstudiantes = false;
  errorEstudiantes: string | null = null;

  private docenteId: number | null = null;
  private progresoPorCorreo = new Map<string, { total: number; revisadas: number }>();

  solicitudes: SolicitudReunion[] = [];
  solicitudesCargando = false;
  solicitudesError: string | null = null;
  solicitudesMensaje: string | null = null;
  procesandoSolicitud = false;
  seleccionada: SolicitudReunion | null = null;
  modo: 'aprobar' | 'rechazar' | null = null;
  mostrarPendientes = false;
  mostrarHistorial = false;
  historialPagina = 1;
  readonly historialPorPagina = 10;
  readonly duracionesDisponibles = [15, 30, 45, 60, 75, 90, 105, 120];

  entregasCargando = false;
  entregasError: string | null = null;
  entregasPorGrupo: EntregasPorGrupo[] = [];
  entregasRevisadas: EntregaDocente[] = [];
  grupoEntregasSeleccionado: string | null = null;

  readonly aprobarForm = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    horaInicio: ['', Validators.required],
    horaTermino: ['', Validators.required],
    modalidad: ['presencial', Validators.required],
    duracion: [30, Validators.required],
    comentario: [''],
  });

  readonly rechazoForm = this.fb.group({
    comentario: [''],
  });

  constructor() {
    this.aprobarForm.controls.duracion.valueChanges.subscribe(() => this.actualizarHoraTermino());
    this.aprobarForm.controls.horaInicio.valueChanges.subscribe(() => this.actualizarHoraTermino());
  }

  ngOnInit(): void {
    this.cargarDocente();
  }

  private cargarDocente(): void {
    const profile = this.currentUserService.getProfile();
    if (!profile?.id) {
      this.solicitudesError = 'No se pudo obtener el perfil del docente.';
      return;
    }

    this.docenteId = profile.id;
    this.cargarSolicitudes();
    this.cargarEntregas();
    this.cargarEstudiantes();
  }

  cargarSolicitudes(): void {
    if (!this.docenteId) {
      return;
    }

    this.solicitudesCargando = true;
    this.solicitudesError = null;

    this.reunionesService.listarSolicitudes({ docente: this.docenteId }).subscribe({
      next: (items) => {
        this.solicitudes = items;
        this.solicitudesCargando = false;
        this.ajustarPaginaHistorial();
      },
      error: (err) => {
        console.error('No se pudieron cargar las solicitudes de reunión del docente', err);
        this.solicitudesError = 'No se pudieron cargar las solicitudes. Intenta nuevamente.';
        this.solicitudesCargando = false;
      },
    });
  }

  cargarEntregas(): void {
    if (!this.docenteId) {
      return;
    }

    this.entregasCargando = true;
    this.entregasError = null;
    this.progresoPorCorreo.clear();

    this.evaluacionesService.listar(this.docenteId).subscribe({
      next: (evaluaciones) => {
        this.actualizarEntregas(evaluaciones);
        this.entregasCargando = false;
      },
      error: (error) => {
        console.error('No se pudieron cargar las entregas del docente', error);
        this.entregasError = 'No se pudieron cargar las entregas. Intenta nuevamente.';
        this.entregasCargando = false;
      },
    });
  }

  cargarEstudiantes(): void {
    if (!this.docenteId) {
      this.estudiantes = [];
      this.errorEstudiantes = 'No se pudo identificar al docente.';
      return;
    }

    this.cargandoEstudiantes = true;
    this.errorEstudiantes = null;

    this.temaService.getTemas({ usuarioId: this.docenteId }).subscribe({
      next: (temas) => {
        this.estudiantes = this.mapearEstudiantes(temas);
        this.actualizarOpcionesFiltros();
        this.aplicarFiltros();
        this.cargandoEstudiantes = false;
      },
      error: (err) => {
        console.error('No se pudieron cargar los estudiantes del docente', err);
        this.estudiantes = [];
        this.errorEstudiantes = 'No se pudieron cargar los estudiantes asignados.';
        this.cargandoEstudiantes = false;
      },
    });
  }

  aplicarFiltros(): void {
    const proyectoFiltro = this.filtros.proyecto.trim().toLowerCase();

    this.estudiantesFiltrados = this.estudiantes.filter((estudiante) => {
      const carreraOk = !this.filtros.carrera || estudiante.carrera === this.filtros.carrera;
      const procesoOk = !this.filtros.proceso || estudiante.proceso === this.filtros.proceso;
      const proyectoOk =
        !proyectoFiltro || estudiante.proyecto.toLowerCase().includes(proyectoFiltro);
      const avanceOk = this.coincideAvance(estudiante.avance, this.filtros.avance);

      return carreraOk && procesoOk && proyectoOk && avanceOk;
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      carrera: '',
      proyecto: '',
      proceso: '',
      avance: '',
    };
    this.aplicarFiltros();
  }

  abrirAprobacion(solicitud: SolicitudReunion): void {
    this.seleccionada = solicitud;
    this.modo = 'aprobar';
    this.solicitudesMensaje = null;
    this.solicitudesError = null;

    const duracion = this.aprobarForm.controls.duracion.value ?? 30;
    const fecha = solicitud.fechaSugerida ?? '';
    const horaInicio = solicitud.horaSugerida ?? '';
    const horaTermino = horaInicio ? this.calcularHoraTermino(horaInicio, duracion) : '';
    const modalidad = solicitud.modalidadSugerida ?? 'presencial';
    const horarioFijo = Boolean(fecha && horaInicio);

    this.aprobarForm.reset({
      fecha,
      horaInicio,
      horaTermino,
      modalidad,
      duracion,
      comentario: solicitud.disponibilidadSugerida ?? '',
    });

    this.actualizarControlesFijos(horarioFijo);
  }

  abrirRechazo(solicitud: SolicitudReunion): void {
    this.seleccionada = solicitud;
    this.modo = 'rechazar';
    this.solicitudesMensaje = null;
    this.solicitudesError = null;
    this.rechazoForm.reset({ comentario: '' });
  }

  cancelarAccion(): void {
    this.seleccionada = null;
    this.modo = null;
    this.aprobarForm.reset({
      fecha: '',
      horaInicio: '',
      horaTermino: '',
      modalidad: 'presencial',
      duracion: 30,
      comentario: '',
    });
    this.rechazoForm.reset({ comentario: '' });
    this.actualizarControlesFijos(false);
  }

  confirmarAprobacion(): void {
    const solicitud = this.seleccionada;
    if (!solicitud || this.modo !== 'aprobar' || !this.docenteId) {
      return;
    }

    if (this.aprobarForm.invalid) {
      this.aprobarForm.markAllAsTouched();
      return;
    }

    const formValue = this.aprobarForm.getRawValue();
    const modalidad = formValue.modalidad as 'presencial' | 'online';
    const comentarioNormalizado = formValue.comentario?.trim() || undefined;

    this.actualizarHoraTermino();
    const horaTermino = this.aprobarForm.controls.horaTermino.value;

    this.procesandoSolicitud = true;
    this.solicitudesError = null;
    this.solicitudesMensaje = null;

    this.reunionesService
      .aprobarSolicitud(solicitud.id, {
        docente: this.docenteId,
        fecha: formValue.fecha,
        horaInicio: formValue.horaInicio,
        horaTermino,
        modalidad,
        comentario: comentarioNormalizado,
      })
      .subscribe({
        next: () => {
          this.procesandoSolicitud = false;
          this.solicitudesMensaje = 'La reunión fue agendada correctamente.';
          this.cancelarAccion();
          this.cargarSolicitudes();
        },
        error: (err) => {
          console.error('No se pudo aprobar la solicitud de reunión', err);
          this.procesandoSolicitud = false;
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.solicitudesError = detalle;
          } else {
            this.solicitudesError = 'Ocurrió un error al agendar la reunión.';
          }
        },
      });
  }

  confirmarRechazo(): void {
    const solicitud = this.seleccionada;
    if (!solicitud || this.modo !== 'rechazar' || !this.docenteId) {
      return;
    }

    const comentario = this.rechazoForm.value.comentario?.trim() || undefined;

    this.procesandoSolicitud = true;
    this.solicitudesError = null;
    this.solicitudesMensaje = null;

    this.reunionesService
      .rechazarSolicitud(solicitud.id, { docente: this.docenteId, comentario })
      .subscribe({
        next: () => {
          this.procesandoSolicitud = false;
          this.solicitudesMensaje = 'La solicitud fue rechazada correctamente.';
          this.cancelarAccion();
          this.cargarSolicitudes();
        },
        error: (err) => {
          console.error('No se pudo rechazar la solicitud', err);
          this.procesandoSolicitud = false;
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.solicitudesError = detalle;
          } else {
            this.solicitudesError = 'No se pudo registrar el rechazo. Intenta nuevamente.';
          }
        },
      });
  }

  get solicitudesPendientes(): SolicitudReunion[] {
    return this.solicitudes.filter((item) => item.estado === 'pendiente');
  }

  get solicitudesResueltas(): SolicitudReunion[] {
    return this.solicitudes.filter((item) => item.estado !== 'pendiente');
  }

  get hayPendientes(): boolean {
    return this.solicitudesPendientes.length > 0;
  }

  get historialTotalPaginas(): number {
    if (!this.solicitudesResueltas.length) {
      return 1;
    }
    return Math.ceil(this.solicitudesResueltas.length / this.historialPorPagina);
  }

  get historialPaginado(): SolicitudReunion[] {
    const inicio = (this.historialPagina - 1) * this.historialPorPagina;
    return this.solicitudesResueltas.slice(inicio, inicio + this.historialPorPagina);
  }

  get fechaHoraFija(): boolean {
    return Boolean(this.seleccionada?.fechaSugerida && this.seleccionada?.horaSugerida);
  }

  togglePendientes(): void {
    this.mostrarPendientes = !this.mostrarPendientes;
    if (!this.mostrarPendientes) {
      this.cancelarAccion();
    }
  }

  toggleHistorial(): void {
    this.mostrarHistorial = !this.mostrarHistorial;
  }

  irAPaginaHistorial(pagina: number): void {
    const paginaSegura = Math.min(Math.max(pagina, 1), this.historialTotalPaginas);
    this.historialPagina = paginaSegura;
  }

  paginaHistorialSiguiente(): void {
    this.irAPaginaHistorial(this.historialPagina + 1);
  }

  paginaHistorialAnterior(): void {
    this.irAPaginaHistorial(this.historialPagina - 1);
  }

  private ajustarPaginaHistorial(): void {
    if (this.historialPagina > this.historialTotalPaginas) {
      this.historialPagina = 1;
    }
  }

  estadoSolicitudLabel(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  }

  fechaHora(valor: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(valor);
  }

  private actualizarHoraTermino(): void {
    const horaInicio = this.aprobarForm.controls.horaInicio.value;
    const duracion = Number(this.aprobarForm.controls.duracion.value || 0);
    if (!horaInicio || !duracion) {
      return;
    }

    const horaTermino = this.calcularHoraTermino(horaInicio, duracion);
    this.aprobarForm.controls.horaTermino.setValue(horaTermino, { emitEvent: false });
  }

  private calcularHoraTermino(horaInicio: string, duracion: number): string {
    const [hora, minuto] = horaInicio.split(':').map((v) => Number(v));

    if (Number.isNaN(hora) || Number.isNaN(minuto)) {
      return horaInicio;
    }

    const totalMinutos = hora * 60 + minuto + duracion;
    const horaFin = Math.floor(totalMinutos / 60) % 24;
    const minutoFin = totalMinutos % 60;

    return `${horaFin.toString().padStart(2, '0')}:${minutoFin.toString().padStart(2, '0')}`;
  }

  private actualizarControlesFijos(fijos: boolean): void {
    const opciones = { emitEvent: false } as const;

    if (fijos) {
      this.aprobarForm.controls.fecha.disable(opciones);
      this.aprobarForm.controls.horaInicio.disable(opciones);
    } else {
      this.aprobarForm.controls.fecha.enable(opciones);
      this.aprobarForm.controls.horaInicio.enable(opciones);
    }

    this.aprobarForm.updateValueAndValidity(opciones);
  }

  private actualizarEntregas(evaluaciones: EvaluacionGrupoDto[]): void {
    const pendientes: EntregaDocente[] = [];
    const revisadas: EntregaDocente[] = [];
    const gruposMap = new Map<string, { pendientes: EntregaDocente[]; revisadas: EntregaDocente[] }>();

    for (const evaluacion of evaluaciones) {
      const grupoNombre = evaluacion.grupo?.nombre ?? evaluacion.grupo_nombre;
      for (const entrega of evaluacion.entregas ?? []) {
        const mapeada = this.mapEntregaDocente(entrega, evaluacion, grupoNombre);
        const coleccion = gruposMap.get(grupoNombre) ?? { pendientes: [], revisadas: [] };

        const correo = entrega.alumno?.correo?.toLowerCase() ?? null;
        if (correo) {
          const registro = this.progresoPorCorreo.get(correo) ?? { total: 0, revisadas: 0 };
          registro.total += 1;
          if (entrega.estado_revision === 'revisada') {
            registro.revisadas += 1;
          }
          this.progresoPorCorreo.set(correo, registro);
        }

        if (entrega.estado_revision === 'revisada') {
          revisadas.push(mapeada);
          coleccion.revisadas.push(mapeada);
        } else {
          pendientes.push(mapeada);
          coleccion.pendientes.push(mapeada);
        }

        gruposMap.set(grupoNombre, coleccion);
      }
    }

    const ordenar = (a: EntregaDocente, b: EntregaDocente) => b.fecha.getTime() - a.fecha.getTime();

    pendientes.sort(ordenar);
    revisadas.sort(ordenar);

    this.entregasRevisadas = revisadas;

    const nombreActivo =
      this.grupoEntregasSeleccionado && gruposMap.has(this.grupoEntregasSeleccionado)
        ? this.grupoEntregasSeleccionado
        : null;

    this.grupoEntregasSeleccionado = nombreActivo;
    this.entregasPorGrupo = Array.from(gruposMap.entries())
      .map(([nombre, coleccion]) => ({
        nombre,
        pendientes: [...coleccion.pendientes].sort(ordenar),
        revisadas: [...coleccion.revisadas].sort(ordenar),
        abierto: nombreActivo ? nombre === nombreActivo : false,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    this.actualizarAvanceEstudiantes();
  }

  private mapearEstudiantes(temas: TemaDisponible[]): ResumenEstudiante[] {
    const estudiantes: ResumenEstudiante[] = [];

    for (const tema of temas) {
      const proyecto = tema.titulo || 'Proyecto sin título';
      const carreraTema = tema.carrera || '—';
      const proceso = this.normalizarProceso(tema.rama);

      for (const inscripcion of tema.inscripcionesActivas ?? []) {
        if (!inscripcion.nombre) {
          continue;
        }

        const correoNormalizado = inscripcion.correo ? inscripcion.correo.toLowerCase() : null;
        estudiantes.push({
          nombre: inscripcion.nombre,
          carrera: inscripcion.carrera || carreraTema,
          proceso,
          proyecto,
          avance: this.calcularAvanceDesdeCorreo(correoNormalizado),
          correo: inscripcion.correo ?? null,
        });
      }
    }

    return estudiantes;
  }

  private normalizarProceso(rama: string | null | undefined): string {
    if (!rama) {
      return 'Trabajo de Título I';
    }

    const ramaLimpia = rama.trim();
    if (!ramaLimpia) {
      return 'Trabajo de Título I';
    }

    const ramaMayus = ramaLimpia.toUpperCase();
    if (ramaMayus.includes('II')) {
      return 'Trabajo de Título II';
    }

    return 'Trabajo de Título I';
  }

  private calcularAvanceDesdeCorreo(correo: string | null): number | null {
    if (!correo) {
      return null;
    }

    const progreso = this.progresoPorCorreo.get(correo.toLowerCase());
    if (!progreso || progreso.total === 0) {
      return null;
    }

    return Math.round((progreso.revisadas / progreso.total) * 100);
  }

  private actualizarAvanceEstudiantes(): void {
    this.estudiantes = this.estudiantes.map((estudiante) => ({
      ...estudiante,
      avance: this.calcularAvanceDesdeCorreo(estudiante.correo),
    }));
    this.actualizarOpcionesFiltros();
    this.aplicarFiltros();
  }

  private coincideAvance(avance: number | null, filtro: string): boolean {
    if (!filtro) {
      return true;
    }

    if (avance == null) {
      return false;
    }

    const [desde, hasta] = filtro.split('-').map((v) => Number(v));
    return avance >= desde && avance <= hasta;
  }

  private actualizarOpcionesFiltros(): void {
    const carreras = new Set<string>();
    const procesos = new Set<string>();

    for (const estudiante of this.estudiantes) {
      if (estudiante.carrera) {
        carreras.add(estudiante.carrera);
      }
      if (estudiante.proceso) {
        procesos.add(estudiante.proceso);
      }
    }

    this.carrerasDisponibles = Array.from(carreras).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
    this.procesosDisponibles = Array.from(procesos).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }

  private mapEntregaDocente(
    entrega: EvaluacionEntregaDto,
    evaluacion: EvaluacionGrupoDto,
    grupoNombre: string,
  ): EntregaDocente {
    const fecha = this.parseFecha(entrega.creado_en);
    return {
      id: entrega.id,
      evaluacionId: evaluacion.id,
      evaluacionTitulo: evaluacion.titulo,
      esBitacora: entrega.es_bitacora,
      bitacoraIndice: entrega.bitacora_indice ?? null,
      grupo: grupoNombre,
      alumnoNombre: entrega.alumno?.nombre ?? 'Alumno sin registro',
      alumnoCorreo: entrega.alumno?.correo ?? null,
      comentario: entrega.comentario,
      fecha: fecha ?? new Date(entrega.creado_en),
      archivoNombre: entrega.archivo_nombre,
      archivoUrl: entrega.archivo_url,
      estadoRevision: entrega.estado_revision,
      nota: entrega.nota,
    };
  }

  seleccionarGrupoEntregas(nombre: string): void {
    const yaSeleccionado = this.grupoEntregasSeleccionado === nombre;

    this.grupoEntregasSeleccionado = yaSeleccionado ? null : nombre;
    this.entregasPorGrupo = this.entregasPorGrupo.map((grupo) => ({
      ...grupo,
      abierto: yaSeleccionado ? false : grupo.nombre === nombre,
    }));
  }

  descargarEntrega(entrega: EntregaDocente): void {
    if (!entrega.archivoUrl || typeof window === 'undefined') {
      return;
    }
    window.open(entrega.archivoUrl, '_blank');
  }

  exportarNotasCsv(): void {
    if (!this.entregasRevisadas.length || typeof window === 'undefined') {
      return;
    }

    const encabezados = [
      'Grupo',
      'Evaluación',
      'Alumno',
      'Correo',
      'Fecha de entrega',
      'Nota',
      'Comentario',
      'Estado',
    ];

    const filas = this.entregasRevisadas.map((entrega) => [
      entrega.grupo,
      entrega.evaluacionTitulo,
      entrega.alumnoNombre,
      entrega.alumnoCorreo ?? '',
      this.formatearFechaCsv(entrega.fecha),
      entrega.nota != null ? String(entrega.nota) : '',
      entrega.comentario ?? '',
      entrega.estadoRevision,
    ]);

    const csv = [encabezados, ...filas]
      .map((fila) => fila.map((valor) => this.sanitizarCsv(valor)).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = `notas_grupos_${this.obtenerSufijoArchivo()}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private sanitizarCsv(valor: string | number | null | undefined): string {
    const texto = valor ?? '';
    const textoPlano = String(texto);

    if (/([";\n])/u.test(textoPlano)) {
      return `"${textoPlano.replace(/"/gu, '""')}"`;
    }

    return textoPlano;
  }

  private formatearFechaCsv(fecha: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(fecha);
  }

  private obtenerSufijoArchivo(): string {
    const ahora = new Date();
    const fecha = `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}`;
    const hora = `${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}`;
    return `${fecha}_${hora}`;
  }

  private parseFecha(valor: string | null | undefined): Date | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
}