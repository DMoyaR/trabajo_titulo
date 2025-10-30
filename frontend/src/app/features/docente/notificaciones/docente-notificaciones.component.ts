import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { NotificacionesService, Notificacion } from '../../../shared/services/notificaciones.service';
import { CurrentUserService } from '../../../shared/services/current-user.service';

@Component({
  selector: 'docente-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-notificaciones.component.html',
  styleUrls: ['./docente-notificaciones.component.css'],
})
export class DocenteNotificacionesComponent {
  private readonly notificaciones = signal<Notificacion[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly solicitudes = computed(() => this.notificaciones());

  readonly totalPendientes = computed(() =>
    this.notificaciones().filter((notificacion) => !notificacion.leida).length,
  );

  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly currentUserService: CurrentUserService,
  ) {
    this.cargarNotificaciones();
  }

  formatoFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(fecha);
  }

  marcarComoLeida(notificacion: Notificacion): void {
    if (notificacion.leida) {
      return;
    }

    this.notificacionesService.marcarLeida(notificacion.id).subscribe({
      next: (actualizada) => {
        this.notificaciones.set(
          this.notificaciones().map((n) => (n.id === actualizada.id ? actualizada : n)),
        );
        this.error.set(null);
      },
      error: (err) => {
        console.error('No se pudo marcar la notificación como leída', err);
        this.error.set('No se pudo actualizar la notificación seleccionada.');
      },
    });
  }

  marcarTodas(): void {
    const pendientes = this.notificaciones().filter((notificacion) => !notificacion.leida);
    if (!pendientes.length) {
      return;
    }

    this.cargando.set(true);
    forkJoin(pendientes.map((notificacion) => this.notificacionesService.marcarLeida(notificacion.id))).subscribe({
      next: (actualizadas) => {
        const porId = new Map(actualizadas.map((item) => [item.id, item] as const));
        this.notificaciones.set(
          this.notificaciones().map((notificacion) => porId.get(notificacion.id) ?? notificacion),
        );
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('No se pudieron marcar las notificaciones', err);
        this.error.set('Ocurrió un error al marcar las solicitudes como revisadas.');
        this.cargando.set(false);
      },
    });
  }

  private cargarNotificaciones(): void {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id) {
      this.error.set('No fue posible identificar al docente actual.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.notificacionesService.listarPorUsuario(perfil.id).subscribe({
      next: (items) => {
        this.notificaciones.set(items);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('No se pudieron cargar las notificaciones del docente', err);
        this.error.set('No se pudieron cargar las notificaciones. Intenta nuevamente.');
        this.cargando.set(false);
      },
    });
  }

}
