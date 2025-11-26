import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CurrentUserService } from '../../../shared/services/current-user.service';
import { ReunionesService, SolicitudReunion } from '../../../shared/services/reuniones.service';

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
  private readonly fb = inject(FormBuilder);

  rows = [
    { 
      estudiante: 'Ana López', 
      carrera: 'Ingeniería en Sistemas', 
      tipo: 'Tesis', 
      estado: 'Entregado',
      statusIcon: '✓',
      avance: 85 
    },
    { 
      estudiante: 'Carlos Díaz', 
      carrera: 'Administración', 
      tipo: 'Prácticas', 
      estado: 'Pendiente',
      statusIcon: '⚠',
      avance: 40 
    },
    { 
      estudiante: 'Valeria Molina', 
      carrera: 'Ingeniería Industrial', 
      tipo: 'Proyecto', 
      estado: 'En-plazo',
      statusIcon: '→',
      avance: 60 
    },
    { 
      estudiante: 'David Reyes', 
      carrera: 'Ingeniería en Sistemas', 
      tipo: 'Tesis', 
      estado: 'En-plazo',
      statusIcon: '→',
      avance: 75 
    },
    { 
      estudiante: 'María González', 
      carrera: 'Administración', 
      tipo: 'Prácticas', 
      estado: 'Entregado',
      statusIcon: '✓',
      avance: 100 
    }
  ];

  obs: string = '';
  obs2: string = '';

  private docenteId: number | null = null;

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
}