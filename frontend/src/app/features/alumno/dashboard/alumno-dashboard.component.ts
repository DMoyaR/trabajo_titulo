import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import { TemaService, TemaDisponible, TemaInscripcionActiva } from '../../docente/trabajolist/tema.service';

@Component({
  selector: 'alumno-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './alumno-dashboard.component.html',
  styleUrls: ['./alumno-dashboard.component.css']
})
export class AlumnoDashboardComponent {
  readonly nombreUsuario = signal('');
  readonly temaAsignado = signal<TemaDisponible | null>(null);
  readonly temaAsignadoCargando = signal(false);
  readonly temaAsignadoError = signal<string | null>(null);

  entregas = signal([
    { nombre: 'Informe de avance #2', estado: 'Aprobado', fecha: '15 de abril' }
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

  constructor(
    private readonly currentUserService: CurrentUserService,
    private readonly temaService: TemaService,
  ) {
    const perfil = this.currentUserService.getProfile();
    this.nombreUsuario.set(this.obtenerPrimerNombre(perfil?.nombre ?? ''));
    this.cargarTemaAsignado();
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
          const reservado = temas.find(tema => tema.tieneCupoPropio) ?? null;
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
    private obtenerPrimerNombre(nombreCompleto: string): string {
    return nombreCompleto.trim().split(' ').filter(Boolean)[0] ?? '';
  }
}