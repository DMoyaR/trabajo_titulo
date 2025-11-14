import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import {
  ReunionesService,
  SolicitudReunion,
  Reunion,
  TrazabilidadEvento,
} from '../../../shared/services/reuniones.service';

@Component({
  selector: 'alumno-reuniones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alumno-reuniones.component.html',
  styleUrls: ['./alumno-reuniones.component.css'],
})
export class AlumnoReunionesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly solicitudForm = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(500)]],
    disponibilidadSugerida: [''],
  });

  readonly solicitudes = signal<SolicitudReunion[]>([]);
  readonly reuniones = signal<Reunion[]>([]);

  readonly cargandoSolicitudes = signal(false);
  readonly cargandoReuniones = signal(false);
  readonly enviandoSolicitud = signal(false);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly solicitudesPendientes = computed(() =>
    this.solicitudes().filter((solicitud) => solicitud.estado === 'pendiente'),
  );
  readonly solicitudesResueltas = computed(() =>
    this.solicitudes().filter((solicitud) => solicitud.estado !== 'pendiente'),
  );

  private alumnoId: number | null = null;

  constructor(
    private readonly reunionesService: ReunionesService,
    private readonly currentUserService: CurrentUserService,
  ) {}

  ngOnInit(): void {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id) {
      this.error.set('No fue posible identificar al alumno actual.');
      return;
    }

    this.alumnoId = perfil.id;
    this.cargarSolicitudes();
    this.cargarReuniones();
  }

  enviarSolicitud(): void {
    if (!this.alumnoId) {
      this.error.set('No fue posible identificar al alumno actual.');
      return;
    }

    if (this.solicitudForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      return;
    }

    const { motivo, disponibilidadSugerida } = this.solicitudForm.getRawValue();
    const motivoNormalizado = motivo.trim();
    if (!motivoNormalizado) {
      this.solicitudForm.controls.motivo.setErrors({ required: true });
      return;
    }

    this.enviandoSolicitud.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    this.reunionesService
      .crearSolicitud({
        alumno: this.alumnoId,
        motivo: motivoNormalizado,
        disponibilidadSugerida: disponibilidadSugerida?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.solicitudForm.reset({ motivo: '', disponibilidadSugerida: '' });
          this.enviandoSolicitud.set(false);
          this.mensaje.set('Tu solicitud fue enviada al docente guía.');
          this.cargarSolicitudes();
        },
        error: (err) => {
          console.error('No se pudo crear la solicitud de reunión', err);
          this.enviandoSolicitud.set(false);
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.error.set(detalle);
          } else {
            this.error.set('No se pudo enviar tu solicitud. Intenta nuevamente.');
          }
        },
      });
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
    if (!this.alumnoId) {
      return;
    }

    this.cargandoSolicitudes.set(true);
    this.error.set(null);

    this.reunionesService.listarSolicitudes({ alumno: this.alumnoId }).subscribe({
      next: (items) => {
        this.solicitudes.set(items);
        this.cargandoSolicitudes.set(false);
      },
      error: (err) => {
        console.error('No se pudieron cargar las solicitudes de reunión', err);
        this.error.set('No se pudieron cargar tus solicitudes. Intenta nuevamente.');
        this.cargandoSolicitudes.set(false);
      },
    });
  }

  private cargarReuniones(): void {
    if (!this.alumnoId) {
      return;
    }

    this.cargandoReuniones.set(true);

    this.reunionesService.listarReuniones({ alumno: this.alumnoId }).subscribe({
      next: (items) => {
        this.reuniones.set(items);
        this.cargandoReuniones.set(false);
      },
      error: (err) => {
        console.error('No se pudieron cargar las reuniones del alumno', err);
        this.error.set('No se pudieron cargar tus reuniones. Intenta nuevamente.');
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
