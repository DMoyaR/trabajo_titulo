import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import {
  DocenteEvaluacionesService,
  EvaluacionGrupoDto,
  GrupoActivoDto,
} from './docente-evaluaciones.service';

type GrupoEvaluaciones = {
  nombre: string;
  evaluaciones: {
    titulo: string;
    fecha: string | null;
    estado: string;
  }[];
};

@Component({
  selector: 'app-evaluaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-evaluaciones.component.html',
  styleUrls: ['./docente-evaluaciones.component.css'],
})
export class DocenteEvaluacionesComponent implements OnInit {
  private readonly evaluacionesService = inject(DocenteEvaluacionesService);
  private readonly currentUserService = inject(CurrentUserService);

  private docenteId: number | null = null;

  readonly estados = ['Pendiente', 'En progreso', 'Evaluada'];

  grupos = signal<GrupoEvaluaciones[]>([]);
  cargando = signal(true);
  enviando = signal(false);
  error = signal<string | null>(null);
  gruposActivos = signal<GrupoActivoDto[]>([]);
  cargandoGruposActivos = signal(false);
  errorGruposActivos = signal<string | null>(null);

  grupoSeleccionadoId = signal<number | null>(null);
  evaluacionTitulo = signal('');
  evaluacionFecha = signal('');

  estadoCalculado = computed(() =>
    this.calcularEstadoPorFecha(this.evaluacionFecha().trim() || null)
  );

  async ngOnInit(): Promise<void> {
    const profile = this.currentUserService.getProfile();
    this.docenteId = profile?.id ?? null;

    await Promise.all([this.cargarGruposActivos(), this.cargarEvaluaciones()]);
  }

  async agregarEvaluacion(event: Event): Promise<void> {
    event.preventDefault();

    if (this.enviando()) {
      return;
    }

    const grupoId = this.grupoSeleccionadoId();
    const titulo = this.evaluacionTitulo().trim();
    const fecha = this.evaluacionFecha().trim();

    if (!grupoId || !titulo) {
      return;
    }

    const payload = {
      tema: grupoId,
      titulo,
      fecha: fecha ? fecha : null,
      docente: this.docenteId,
    };

    this.enviando.set(true);
    this.error.set(null);

    try {
      const evaluacion = await firstValueFrom(
        this.evaluacionesService.crear(payload)
      );
      this.actualizarGruposConEvaluacion(evaluacion);
      this.grupoSeleccionadoId.set(null);
      this.evaluacionTitulo.set('');
      this.evaluacionFecha.set('');
    } catch (error) {
      console.error('No se pudo registrar la evaluación del grupo', error);
      this.error.set(
        'No pudimos guardar la evaluación. Intenta nuevamente en unos momentos.'
      );
    } finally {
      this.enviando.set(false);
    }
  }

  private async cargarEvaluaciones(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const evaluaciones = await firstValueFrom(
        this.evaluacionesService.listar(this.docenteId)
      );
      this.grupos.set(this.agruparEvaluaciones(evaluaciones));
    } catch (error) {
      console.error('No se pudieron cargar las evaluaciones del docente', error);
      this.error.set(
        'No pudimos cargar las evaluaciones registradas. Intenta nuevamente más tarde.'
      );
      this.grupos.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarGruposActivos(): Promise<void> {
    this.cargandoGruposActivos.set(true);
    this.errorGruposActivos.set(null);

    try {
      const grupos = await firstValueFrom(
        this.evaluacionesService.listarGruposActivos(this.docenteId)
      );
      this.gruposActivos.set(
        [...grupos].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        )
      );
    } catch (error) {
      console.error('No se pudieron cargar los grupos activos del docente', error);
      this.errorGruposActivos.set(
        'No pudimos cargar los grupos activos. Intenta nuevamente más tarde.'
      );
      this.gruposActivos.set([]);
    } finally {
      this.cargandoGruposActivos.set(false);
    }
  }

  private agruparEvaluaciones(
    evaluaciones: EvaluacionGrupoDto[]
  ): GrupoEvaluaciones[] {
    const mapa = new Map<string, GrupoEvaluaciones['evaluaciones']>();

    for (const evaluacion of evaluaciones) {
      const nombreGrupo = evaluacion.grupo?.nombre ?? evaluacion.grupo_nombre;
      const lista = mapa.get(nombreGrupo) ?? [];
      lista.push({
        titulo: evaluacion.titulo,
        fecha: evaluacion.fecha,
        estado: evaluacion.estado,
      });
      mapa.set(nombreGrupo, lista);
    }

    return Array.from(mapa.entries())
      .map(([nombre, lista]) => ({
        nombre,
        evaluaciones: [...lista].sort((a, b) => this.ordenarEvaluaciones(a, b)),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  private actualizarGruposConEvaluacion(evaluacion: EvaluacionGrupoDto): void {
    const gruposActuales = this.grupos();
    const nuevaEvaluacion = {
      titulo: evaluacion.titulo,
      fecha: evaluacion.fecha,
      estado: evaluacion.estado,
    };

    const indiceGrupo = gruposActuales.findIndex(
      (grupo) =>
        grupo.nombre.toLowerCase() ===
        (evaluacion.grupo?.nombre ?? evaluacion.grupo_nombre).toLowerCase()
    );

    if (indiceGrupo >= 0) {
      const grupo = gruposActuales[indiceGrupo];
      const evaluaciones = [...grupo.evaluaciones, nuevaEvaluacion].sort((a, b) =>
        this.ordenarEvaluaciones(a, b)
      );
      this.grupos.set([
        ...gruposActuales.slice(0, indiceGrupo),
        { ...grupo, evaluaciones },
        ...gruposActuales.slice(indiceGrupo + 1),
      ]);
      return;
    }

    const nuevosGrupos = [
      ...gruposActuales,
      {
        nombre: evaluacion.grupo?.nombre ?? evaluacion.grupo_nombre,
        evaluaciones: [nuevaEvaluacion],
      },
    ].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    this.grupos.set(nuevosGrupos);
  }

  calcularEstadoPorFecha(fecha: string | null): string {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return this.estados[0];
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [year, month, day] = fecha.split('-').map(Number);
    const fechaEvaluacion = new Date(year, (month ?? 1) - 1, day ?? 1);
    fechaEvaluacion.setHours(0, 0, 0, 0);

    if (Number.isNaN(fechaEvaluacion.getTime())) {
      return this.estados[0];
    }

    if (fechaEvaluacion.getTime() === hoy.getTime()) {
      return 'En progreso';
    }

    if (fechaEvaluacion.getTime() < hoy.getTime()) {
      return 'Evaluada';
    }

    return 'Pendiente';
  }

  private ordenarEvaluaciones(
    a: GrupoEvaluaciones['evaluaciones'][number],
    b: GrupoEvaluaciones['evaluaciones'][number]
  ): number {
    if (a.fecha && b.fecha) {
      if (a.fecha === b.fecha) {
        return a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
      }
      return b.fecha.localeCompare(a.fecha);
    }

    if (a.fecha) {
      return -1;
    }

    if (b.fecha) {
      return 1;
    }

    return a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
  }

  onSeleccionGrupo(event: Event): void {
    const value = String((event.target as HTMLSelectElement)?.value ?? '').trim();
    this.grupoSeleccionadoId.set(value ? Number(value) : null);
  }
}