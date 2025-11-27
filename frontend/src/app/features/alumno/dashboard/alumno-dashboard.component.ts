import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import { TemaService, TemaDisponible, TemaInscripcionActiva } from '../../docente/trabajolist/tema.service';
import { ReunionesService, Reunion, SolicitudReunion } from '../../../shared/services/reuniones.service';

@Component({
  selector: 'alumno-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterLink],
  templateUrl: './alumno-dashboard.component.html',
  styleUrls: ['./alumno-dashboard.component.css'],
})
export class AlumnoDashboardComponent implements OnInit {
  readonly nombreUsuario = signal('');
  readonly temaAsignado = signal<TemaDisponible | null>(null);
  readonly temaAsignadoCargando = signal(false);
  readonly temaAsignadoError = signal<string | null>(null);

  readonly practicaEntrega = signal<PracticaEntrega | null>(null);
  readonly practicaEstadoCargando = signal(false);
  readonly practicaEstadoError = signal<string | null>(null);
  readonly practicaEstado = computed<PracticaEstado>(() => {
    const entrega = this.practicaEntrega();
    if (!entrega) {
      return {
        label: 'Pendiente',
        detalle: 'Aún no envías tu informe de práctica.',
        clase: 'warning',
      };
    }

    const nota = (entrega.nota ?? '').trim();
    if (nota) {
      return {
        label: 'Aprobado',
        detalle: `Nota: ${nota}`,
        clase: 'success',
      };
    }

    return {
      label: 'En revisión',
      detalle: 'Tu informe está siendo revisado por el coordinador.',
      clase: 'info',
    };
  });

  entregas = signal([
    { nombre: 'Informe de avance #2', estado: 'Aprobado', fecha: '15 de abril' },
  ]);

  readonly temaAsignadoIntegrantes = computed<TemaInscripcionActiva[]>(() => {
    const tema = this.temaAsignado();
    if (!tema) {
      return [];
    }
    return [...(tema.inscripcionesActivas ?? [])];
  });

  readonly profesorAsignado = computed(() => {
    const tema = this.temaAsignado();
    if (!tema) {
      return null;
    }
    return tema.docenteACargo ?? tema.creadoPor ?? null;
  });

  readonly puedeGestionarCupos = computed(() => {
    const tema = this.temaAsignado();
    if (!tema) {
      return false;
    }
    const perfil = this.currentUserService.getProfile();
    const alumnoId = perfil?.id ?? null;
    if (!alumnoId) {
      return false;
    }
    const esResponsable = (tema.inscripcionesActivas ?? []).some(
      (inscripcion) => inscripcion.id === alumnoId && inscripcion.esResponsable,
    );
    return esResponsable && (tema.cupos ?? 1) > 1;
  });

  readonly solicitudes = signal<SolicitudReunion[]>([]);
  readonly reuniones = signal<Reunion[]>([]);
  readonly reunionesCargando = signal(false);
  readonly reunionesError = signal<string | null>(null);

  readonly solicitudesPendientes = computed(() =>
    this.solicitudes().filter((solicitud) => solicitud.estado === 'pendiente'),
  );

  readonly solicitudesResueltas = computed(() =>
    this.solicitudes().filter((solicitud) => solicitud.estado !== 'pendiente'),
  );

  readonly historialEventos = computed(() => {
    const items: Array<{ id: string; fecha: Date; titulo: string; detalle: string; estado: string }> = [];

    this.reuniones().forEach((reunion) => {
      const fecha = new Date(`${reunion.fecha}T${reunion.horaInicio}`);
      items.push({
        id: `reunion-${reunion.id}`,
        fecha,
        titulo: reunion.proyectoNombre || 'Reunión con docente guía',
        detalle: `${this.horaCorta(reunion.horaInicio)} · ${this.modalidadLabel(reunion.modalidad)}`,
        estado: this.estadoReunionLabel(reunion.estado),
      });
    });

    this.solicitudesResueltas()
      .filter((solicitud) => solicitud.estado === 'rechazada')
      .forEach((solicitud) => {
        const fecha = solicitud.actualizadoEn || solicitud.creadoEn;
        items.push({
          id: `sol-${solicitud.id}`,
          fecha,
          titulo: solicitud.proyectoNombre || 'Solicitud de reunión',
          detalle: 'Solicitud rechazada',
          estado: this.estadoSolicitudLabel(solicitud.estado),
        });
      });

    return items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 10);
  });

  constructor(
    private readonly http: HttpClient,
    private readonly currentUserService: CurrentUserService,
    private readonly temaService: TemaService,
    private readonly reunionesService: ReunionesService,
  ) {}

  ngOnInit(): void {
    const perfil = this.currentUserService.getProfile();
    this.nombreUsuario.set(this.obtenerPrimerNombre(perfil?.nombre ?? ''));
    this.cargarTemaAsignado();
    this.cargarReuniones();
    this.cargarEstadoPractica();
  }

  private cargarTemaAsignado() {
    const perfil = this.currentUserService.getProfile();
    const alumnoId = perfil?.id ?? null;

    if (!alumnoId) {
      this.temaAsignado.set(null);
      return;
    }

    this.temaAsignadoCargando.set(true);
    this.temaAsignadoError.set(null);

    this.temaService
      .getTemas({ usuarioId: alumnoId, alumnoId })
      .subscribe({
        next: (temas) => {
          const reservado = temas.find((tema) => tema.tieneCupoPropio) ?? null;
          this.temaAsignado.set(reservado);
          this.temaAsignadoCargando.set(false);
        },
        error: (err) => {
          console.error('No fue posible cargar tu tema asignado', err);
          this.temaAsignadoError.set('No fue posible cargar la información de tu tema asignado.');
          this.temaAsignadoCargando.set(false);
        },
      });
  }

  private cargarEstadoPractica(): void {
    const perfil = this.currentUserService.getProfile();
    const alumnoId = perfil?.id ?? null;

    if (!alumnoId) {
      this.practicaEntrega.set(null);
      this.practicaEstadoCargando.set(false);
      return;
    }

    this.practicaEstadoCargando.set(true);
    this.practicaEstadoError.set(null);

    this.http
      .get<{ item: PracticaEntregaApi | null }>('/api/practicas/evaluacion/entregas/', {
        params: { alumno: String(alumnoId) },
      })
      .subscribe({
        next: (res) => {
          const item = res?.item ?? null;
          this.practicaEntrega.set(
            item
              ? {
                  id: item.id,
                  createdAt: item.created_at,
                  archivoNombre: item.archivo_nombre || 'Archivo enviado',
                  url: item.archivo_url,
                  nota: item.nota ?? null,
                }
              : null,
          );
          this.practicaEstadoError.set(null);
          this.practicaEstadoCargando.set(false);
        },
        error: (err) => {
          console.error('No fue posible cargar el estado de la práctica', err);
          this.practicaEntrega.set(null);
          this.practicaEstadoError.set('No pudimos obtener el estado de tu informe de práctica.');
          this.practicaEstadoCargando.set(false);
        },
      });
  }

  private cargarReuniones(): void {
    const perfil = this.currentUserService.getProfile();
    const alumnoId = perfil?.id ?? null;

    if (!alumnoId) {
      this.solicitudes.set([]);
      this.reuniones.set([]);
      return;
    }

    this.reunionesCargando.set(true);
    this.reunionesError.set(null);

    this.reunionesService.listarSolicitudes({ alumno: alumnoId }).subscribe({
      next: (solicitudes) => {
        this.solicitudes.set(solicitudes);
        this.reunionesService.listarReuniones({ alumno: alumnoId }).subscribe({
          next: (reuniones) => {
            this.reuniones.set(reuniones);
            this.reunionesCargando.set(false);
          },
          error: (err) => {
            console.error('No se pudieron cargar las reuniones del alumno', err);
            this.reunionesError.set('No se pudieron cargar tus reuniones.');
            this.reunionesCargando.set(false);
          },
        });
      },
      error: (err) => {
        console.error('No se pudieron cargar las solicitudes de reunión', err);
        this.reunionesError.set('No se pudieron cargar tus solicitudes.');
        this.reunionesCargando.set(false);
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
        return estado;
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
        return estado;
    }
  }

  modalidadLabel(modalidad: string): string {
    if (modalidad === 'presencial') {
      return 'Presencial';
    }
    if (modalidad === 'online') {
      return 'Online';
    }
    return modalidad;
  }

  horaCorta(valor: string): string {
    if (!valor) {
      return '';
    }
    return valor.slice(0, 5);
  }

  private obtenerPrimerNombre(nombreCompleto: string): string {
    return nombreCompleto.trim().split(' ').filter(Boolean)[0] ?? '';
  }
}

interface PracticaEntregaApi {
  id: number;
  created_at: string;
  archivo_nombre: string | null;
  archivo_url: string | null;
  nota: string | null;
}

interface PracticaEntrega {
  id: number;
  createdAt: string;
  archivoNombre: string;
  url: string | null;
  nota: string | null;
}

interface PracticaEstado {
  label: string;
  detalle: string;
  clase: 'warning' | 'info' | 'success';
}