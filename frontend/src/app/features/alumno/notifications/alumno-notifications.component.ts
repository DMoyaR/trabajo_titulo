import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { NotificacionesService, Notificacion } from '../../../shared/services/notificaciones.service';
import { CurrentUserService } from '../../../shared/services/current-user.service';

@Component({
  selector: 'alumno-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-notifications.component.html',
  styleUrls: ['./alumno-notifications.component.css']
})
export class AlumnoNotificationsComponent {
  notificaciones = signal<Notificacion[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  totalNoLeidas = computed(() => this.notificaciones().filter((n) => !n.leida).length);

  constructor(
    private notificacionesService: NotificacionesService,
    private currentUserService: CurrentUserService,
  ) {
    this.cargarNotificaciones();
  }

  iconoPara(tipo: string): string {
    if (tipo === 'propuesta') {
      return '📘';
    }
    if (tipo === 'reunion') {
      return '📅';
    }
    return '🔔';
  }

  marcarNotificacion(notificacion: Notificacion) {
    if (notificacion.leida) {
      return;
    }

    this.notificacionesService.marcarLeida(notificacion.id).subscribe({
      next: (actualizada) => {
        this.notificaciones.set(
          this.notificaciones().map((n) => (n.id === actualizada.id ? actualizada : n))
        );
        this.error.set(null);
      },
      error: (err) => {
        console.error('No se pudo marcar la notificación como leída', err);
        this.error.set('No se pudo actualizar la notificación seleccionada.');
      },
    });
  }

  marcarTodas() {
    const pendientes = this.notificaciones().filter((n) => !n.leida);
    if (!pendientes.length) {
      return;
    }

    this.cargando.set(true);
    forkJoin(pendientes.map((n) => this.notificacionesService.marcarLeida(n.id))).subscribe({
      next: (actualizadas) => {
        const actualizadasPorId = new Map(actualizadas.map((n) => [n.id, n] as const));
        this.notificaciones.set(
          this.notificaciones().map((n) => actualizadasPorId.get(n.id) ?? n)
        );
        this.error.set(null);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('No se pudieron marcar todas las notificaciones', err);
        this.error.set('Ocurrió un error al marcar todas las notificaciones.');
        this.cargando.set(false);
      },
    });
  }

  private cargarNotificaciones() {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id) {
      this.error.set('No fue posible identificar al alumno actual.');
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
        console.error('No se pudieron cargar las notificaciones del alumno', err);
        this.error.set('No se pudieron cargar tus notificaciones. Intenta nuevamente.');
        this.cargando.set(false);
      },
    });
  }
}