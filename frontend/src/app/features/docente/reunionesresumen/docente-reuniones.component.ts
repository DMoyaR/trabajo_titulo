import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import {
  ReunionesService,
  SolicitudReunion,
  Reunion,
  TrazabilidadEvento,
} from '../../../shared/services/reuniones.service';

type ModoAccion = 'aprobar' | 'rechazar' | null;

@Component({
  selector: 'docente-reuniones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './docente-reuniones.component.html',
  styleUrls: ['./docente-reuniones.component.css'],
})
export class DocenteReunionesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly solicitudes = signal<SolicitudReunion[]>([]);
  readonly reuniones = signal<Reunion[]>([]);

  readonly cargandoSolicitudes = signal(false);
  readonly cargandoReuniones = signal(false);
  readonly procesandoSolicitud = signal(false);
  readonly procesandoCierre = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);

  readonly seleccionada = signal<SolicitudReunion | null>(null);
  readonly modo = signal<ModoAccion>(null);
  readonly reunionEnCierre = signal<Reunion | null>(null);

  readonly solicitudesPendientes = computed(() =>
    this.solicitudes().filter((solicitud) => solicitud.estado === 'pendiente'),
  );
  readonly solicitudesResueltas = computed(() =>
    this.solicitudes().filter((solicitud) => solicitud.estado !== 'pendiente'),
  );
  readonly reunionesVigentes = computed(() =>
    this.reuniones().filter((reunion) => reunion.estado === 'aprobada'),
  );
  readonly reunionesCerradas = computed(() =>
    this.reuniones().filter((reunion) => reunion.estado !== 'aprobada'),
  );

  readonly aprobarForm = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    horaInicio: ['', Validators.required],
    horaTermino: ['', Validators.required],
    modalidad: ['presencial', Validators.required],
    comentario: [''],
  });

  readonly rechazoForm = this.fb.group({
    comentario: [''],
  });

  readonly cierreForm = this.fb.nonNullable.group({
    estado: ['finalizada', Validators.required],
    comentario: [''],
  });

  private docenteId: number | null = null;

  constructor(
    private readonly reunionesService: ReunionesService,
    private readonly currentUserService: CurrentUserService,
  ) {}

  ngOnInit(): void {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id) {
      this.error.set('No fue posible identificar al docente actual.');
      return;
    }

    this.docenteId = perfil.id;
    this.cargarSolicitudes();
    this.cargarReuniones();
  }

  abrirAprobacion(solicitud: SolicitudReunion): void {
    this.seleccionada.set(solicitud);
    this.modo.set('aprobar');
    this.mensaje.set(null);
    this.error.set(null);
    this.aprobarForm.reset({
      fecha: '',
      horaInicio: '',
      horaTermino: '',
      modalidad: 'presencial',
      comentario: solicitud.disponibilidadSugerida ?? '',
    });
  }

  abrirRechazo(solicitud: SolicitudReunion): void {
    this.seleccionada.set(solicitud);
    this.modo.set('rechazar');
    this.mensaje.set(null);
    this.error.set(null);
    this.rechazoForm.reset({ comentario: '' });
  }

  cancelarAccion(): void {
    this.seleccionada.set(null);
    this.modo.set(null);
    this.aprobarForm.reset({
      fecha: '',
      horaInicio: '',
      horaTermino: '',
      modalidad: 'presencial',
      comentario: '',
    });
    this.rechazoForm.reset({ comentario: '' });
  }

  confirmarAprobacion(): void {
    const solicitud = this.seleccionada();
    if (!solicitud || this.modo() !== 'aprobar' || !this.docenteId) {
      return;
    }

    if (this.aprobarForm.invalid) {
      this.aprobarForm.markAllAsTouched();
      return;
    }

    const formValue = this.aprobarForm.getRawValue();
    const modalidad = formValue.modalidad as 'presencial' | 'online';
    const comentarioNormalizado = formValue.comentario?.trim() || undefined;

    this.procesandoSolicitud.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    this.reunionesService
      .aprobarSolicitud(solicitud.id, {
        docente: this.docenteId,
        fecha: formValue.fecha,
        horaInicio: formValue.horaInicio,
        horaTermino: formValue.horaTermino,
        modalidad,
        comentario: comentarioNormalizado,
      })
      .subscribe({
        next: () => {
          this.procesandoSolicitud.set(false);
          this.mensaje.set('La reunión fue agendada exitosamente.');
          this.cancelarAccion();
          this.cargarSolicitudes();
          this.cargarReuniones();
        },
        error: (err) => {
          console.error('No se pudo aprobar la solicitud de reunión', err);
          this.procesandoSolicitud.set(false);
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.error.set(detalle);
          } else {
            this.error.set('Ocurrió un error al agendar la reunión.');
          }
        },
      });
  }

  confirmarRechazo(): void {
    const solicitud = this.seleccionada();
    if (!solicitud || this.modo() !== 'rechazar' || !this.docenteId) {
      return;
    }

    const comentario = this.rechazoForm.value.comentario?.trim() || undefined;

    this.procesandoSolicitud.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    this.reunionesService
      .rechazarSolicitud(solicitud.id, { docente: this.docenteId, comentario })
      .subscribe({
        next: () => {
          this.procesandoSolicitud.set(false);
          this.mensaje.set('La solicitud fue rechazada correctamente.');
          this.cancelarAccion();
          this.cargarSolicitudes();
        },
        error: (err) => {
          console.error('No se pudo rechazar la solicitud', err);
          this.procesandoSolicitud.set(false);
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.error.set(detalle);
          } else {
            this.error.set('No se pudo registrar el rechazo. Intenta nuevamente.');
          }
        },
      });
  }

  abrirCierre(reunion: Reunion): void {
    this.reunionEnCierre.set(reunion);
    this.cierreForm.reset({ estado: 'finalizada', comentario: '' });
    this.mensaje.set(null);
    this.error.set(null);
  }

  cancelarCierre(): void {
    this.reunionEnCierre.set(null);
    this.cierreForm.reset({ estado: 'finalizada', comentario: '' });
  }

  confirmarCierre(): void {
    const reunion = this.reunionEnCierre();
    if (!reunion || !this.docenteId) {
      return;
    }

    if (this.cierreForm.invalid) {
      this.cierreForm.markAllAsTouched();
      return;
    }

    const cierreFormValue = this.cierreForm.getRawValue();
    const estadoFinal = cierreFormValue.estado as 'finalizada' | 'no_realizada';
    const comentarioNormalizado = cierreFormValue.comentario?.trim() || undefined;

    this.procesandoCierre.set(true);
    this.error.set(null);

    this.reunionesService
      .cerrarReunion(reunion.id, {
        docente: this.docenteId,
        estado: estadoFinal,
        comentario: comentarioNormalizado,
      })
      .subscribe({
        next: () => {
          this.procesandoCierre.set(false);
          this.mensaje.set('Se actualizó el estado de la reunión.');
          this.cancelarCierre();
          this.cargarReuniones();
          this.cargarSolicitudes();
        },
        error: (err) => {
          console.error('No se pudo cerrar la reunión', err);
          this.procesandoCierre.set(false);
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.error.set(detalle);
          } else {
            this.error.set('No se pudo actualizar el estado de la reunión.');
          }
        },
      });
  }

  puedeCerrar(reunion: Reunion): boolean {
    return reunion.estado === 'aprobada';
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
        return this.formatearEstadoGenerico(estado);
    }
  }

  estadoReunionLabel(estado: string): string {
    switch (estado) {
      case 'aprobada':
        return 'Programada';
      case 'finalizada':
        return 'Finalizada';
      case 'no_realizada':
        return 'No realizada';
      case 'reprogramada':
        return 'Reprogramada';
      default:
        return this.formatearEstadoGenerico(estado);
    }
  }

  modalidadLabel(modalidad: string): string {
    if (modalidad === 'presencial') {
      return 'Presencial';
    }
    if (modalidad === 'online') {
      return 'Online';
    }
    return this.formatearEstadoGenerico(modalidad);
  }

  fechaCorta(valor: string | Date): string {
    const fecha = this.toDate(valor);
    if (!fecha) {
      return '';
    }
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(fecha);
  }

  fechaHora(valor: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(valor);
  }

  horaCorta(valor: string): string {
    if (!valor) {
      return '';
    }
    return valor.slice(0, 5);
  }

  descripcionEvento(evento: TrazabilidadEvento): string {
    const partes: string[] = [];

    if (evento.estadoNuevo) {
      partes.push(this.formatearEstadoGenerico(evento.estadoNuevo));
    } else {
      partes.push(this.formatearTipoEvento(evento.tipo));
    }

    if (evento.usuario?.nombre) {
      partes.push(`Por ${evento.usuario.nombre}`);
    }

    if (evento.comentario) {
      partes.push(`Comentario: ${evento.comentario}`);
    }

    return partes.join(' • ');
  }

  private cargarSolicitudes(): void {
    if (!this.docenteId) {
      return;
    }

    this.cargandoSolicitudes.set(true);
    this.error.set(null);

    this.reunionesService.listarSolicitudes({ docente: this.docenteId }).subscribe({
      next: (items) => {
        this.solicitudes.set(items);
        this.cargandoSolicitudes.set(false);
      },
      error: (err) => {
        console.error('No se pudieron cargar las solicitudes de reunión del docente', err);
        this.error.set('No se pudieron cargar las solicitudes. Intenta nuevamente.');
        this.cargandoSolicitudes.set(false);
      },
    });
  }

  private cargarReuniones(): void {
    if (!this.docenteId) {
      return;
    }

    this.cargandoReuniones.set(true);
    this.error.set(null);

    this.reunionesService.listarReuniones({ docente: this.docenteId }).subscribe({
      next: (items) => {
        this.reuniones.set(items);
        this.cargandoReuniones.set(false);
      },
      error: (err) => {
        console.error('No se pudieron cargar las reuniones del docente', err);
        this.error.set('No se pudieron cargar las reuniones programadas.');
        this.cargandoReuniones.set(false);
      },
    });
  }

  private formatearEstadoGenerico(valor: string): string {
    if (!valor) {
      return '';
    }
    return valor
      .split('_')
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(' ');
  }

  private formatearTipoEvento(tipo: string): string {
    switch (tipo) {
      case 'creacion_solicitud':
        return 'Solicitud creada';
      case 'aprobada_desde_solicitud':
        return 'Solicitud aprobada';
      case 'rechazo':
        return 'Solicitud rechazada';
      case 'agendada_directamente':
        return 'Reunión agendada';
      case 'cierre_final':
        return 'Cierre de reunión';
      default:
        return this.formatearEstadoGenerico(tipo);
    }
  }

  private toDate(valor: string | Date): Date | null {
    if (valor instanceof Date) {
      return valor;
    }
    if (!valor) {
      return null;
    }
    const normalizado = valor.includes('T') ? valor : `${valor}T00:00:00`;
    const fecha = new Date(normalizado);
    if (Number.isNaN(fecha.getTime())) {
      return null;
    }
    return fecha;
  }
}