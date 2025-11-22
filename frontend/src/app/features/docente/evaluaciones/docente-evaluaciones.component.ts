import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import {
  DocenteEvaluacionesService,
  EvaluacionGrupoDto,
  EvaluacionEntregaDto,
  GrupoActivoDto,
} from './docente-evaluaciones.service';

type GrupoEvaluaciones = {
  nombre: string;
  evaluaciones: {
    titulo: string;
    comentario: string | null;
    rubricaNombre: string | null;
    rubricaUrl: string | null;
    fecha: string | null;
    estado: string;
  }[];
};

type EntregaDocente = {
  id: number;
  evaluacionId: number;
  evaluacionTitulo: string;
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

  evaluaciones = signal<EvaluacionGrupoDto[]>([]);
  grupos = signal<GrupoEvaluaciones[]>([]);
  cargando = signal(true);
  enviando = signal(false);
  error = signal<string | null>(null);
  gruposActivos = signal<GrupoActivoDto[]>([]);
  cargandoGruposActivos = signal(false);
  errorGruposActivos = signal<string | null>(null);

  entregasPendientes = signal<EntregaDocente[]>([]);
  entregasRevisadas = signal<EntregaDocente[]>([]);

  grupoSeleccionadoId = signal<number | null>(null);
  evaluacionTitulo = signal('');
  evaluacionFecha = signal('');
  evaluacionComentario = signal('');
  evaluacionRubrica = signal<File | null>(null);

  private rubricaInput?: HTMLInputElement | null;

  estadoCalculado = computed(() =>
    this.calcularEstadoPorFecha(this.evaluacionFecha().trim() || null)
  );

  async ngOnInit(): Promise<void> {
    const profile = this.currentUserService.getProfile();
    this.docenteId = profile?.id ?? null;

    await Promise.all([this.cargarGruposActivos(), this.cargarEvaluaciones()]);
  }

  onRubricaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const archivo = input?.files?.[0] ?? null;
    this.rubricaInput = input;
    this.evaluacionRubrica.set(archivo);
  }

  private limpiarRubrica(): void {
    this.evaluacionRubrica.set(null);
    if (this.rubricaInput) {
      this.rubricaInput.value = '';
    }
  }

  async agregarEvaluacion(event: Event): Promise<void> {
    event.preventDefault();

    if (this.enviando()) {
      return;
    }

    const grupoId = this.grupoSeleccionadoId();
    const titulo = this.evaluacionTitulo().trim();
    const fecha = this.evaluacionFecha().trim();
    const comentario = this.evaluacionComentario().trim();
    const rubrica = this.evaluacionRubrica();

    if (!grupoId || !titulo || !comentario) {
      return;
    }

    const payload = {
      tema: grupoId,
      titulo,
      comentario,
      fecha: fecha ? fecha : null,
      docente: this.docenteId,
      rubrica,
    };

    this.enviando.set(true);
    this.error.set(null);

    try {
      const evaluacion = await firstValueFrom(
        this.evaluacionesService.crear(payload)
      );
      this.actualizarGruposConEvaluacion(evaluacion);
      this.evaluaciones.set([...this.evaluaciones(), evaluacion]);
      this.actualizarEntregas(this.evaluaciones());
      this.grupoSeleccionadoId.set(null);
      this.evaluacionTitulo.set('');
      this.evaluacionFecha.set('');
      this.evaluacionComentario.set('');
      this.limpiarRubrica();
    } catch (error) {
      console.error('No se pudo registrar la evaluación del grupo', error);
      this.error.set(
        'No pudimos guardar la evaluación. Intenta nuevamente en unos momentos.'
      );
    } finally {
      this.enviando.set(false);
    }
  }

  async enviarEvaluacionMasiva(): Promise<void> {
    if (this.enviando()) {
      return;
    }

    const titulo = this.evaluacionTitulo().trim();
    const fecha = this.evaluacionFecha().trim();
    const comentario = this.evaluacionComentario().trim();
    const rubrica = this.evaluacionRubrica();
    const gruposActivos = this.gruposActivos();

    if (!titulo || !comentario || !gruposActivos.length) {
      return;
    }

    const payloads = gruposActivos.map((grupo) => ({
      tema: grupo.id,
      titulo,
      comentario,
      fecha: fecha ? fecha : null,
      docente: this.docenteId,
      rubrica,
    }));

    this.enviando.set(true);
    this.error.set(null);

    try {
      const resultados = await Promise.allSettled(
        payloads.map((payload) =>
          firstValueFrom(this.evaluacionesService.crear(payload))
        )
      );

      const exitosas = resultados
        .filter(
          (resultado): resultado is PromiseFulfilledResult<EvaluacionGrupoDto> =>
            resultado.status === 'fulfilled'
        )
        .map((resultado) => resultado.value);

      const hayFallos = resultados.some(
        (resultado) => resultado.status === 'rejected'
      );

      if (!exitosas.length) {
        this.error.set(
          'No pudimos registrar las evaluaciones masivas. Intenta nuevamente.'
        );
        return;
      }

      const evaluacionesActualizadas = [
        ...this.evaluaciones(),
        ...exitosas,
      ];

      this.evaluaciones.set(evaluacionesActualizadas);
      this.grupos.set(this.agruparEvaluaciones(evaluacionesActualizadas));
      this.actualizarEntregas(evaluacionesActualizadas);

      this.grupoSeleccionadoId.set(null);
      this.evaluacionTitulo.set('');
      this.evaluacionFecha.set('');
      this.evaluacionComentario.set('');
      this.limpiarRubrica();

      if (hayFallos) {
        this.error.set(
          'Algunas evaluaciones no se pudieron registrar. Revisa e intenta nuevamente.'
        );
      }
    } catch (error) {
      console.error('No se pudo registrar la evaluación de forma masiva', error);
      this.error.set(
        'No pudimos registrar todas las evaluaciones. Intenta nuevamente en unos momentos.'
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
      this.evaluaciones.set(evaluaciones);
      this.grupos.set(this.agruparEvaluaciones(evaluaciones));
      this.actualizarEntregas(evaluaciones);
    } catch (error) {
      console.error('No se pudieron cargar las evaluaciones del docente', error);
      this.error.set(
        'No pudimos cargar las evaluaciones registradas. Intenta nuevamente más tarde.'
      );
      this.evaluaciones.set([]);
      this.grupos.set([]);
      this.entregasPendientes.set([]);
      this.entregasRevisadas.set([]);
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
        comentario: evaluacion.comentario,
        rubricaNombre: evaluacion.rubrica_nombre ?? 'Rúbrica',
        rubricaUrl: evaluacion.rubrica_url,
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
      comentario: evaluacion.comentario,
      rubricaNombre: evaluacion.rubrica_nombre ?? 'Rúbrica',
      rubricaUrl: evaluacion.rubrica_url,
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

  private actualizarEntregas(evaluaciones: EvaluacionGrupoDto[]): void {
    const pendientes: EntregaDocente[] = [];
    const revisadas: EntregaDocente[] = [];

    for (const evaluacion of evaluaciones) {
      const grupoNombre = evaluacion.grupo?.nombre ?? evaluacion.grupo_nombre;
      for (const entrega of evaluacion.entregas ?? []) {
        const mapeada = this.mapEntregaDocente(entrega, evaluacion, grupoNombre);
        if (entrega.estado_revision === 'revisada') {
          revisadas.push(mapeada);
        } else {
          pendientes.push(mapeada);
        }
      }
    }

    pendientes.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    revisadas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    this.entregasPendientes.set(pendientes);
    this.entregasRevisadas.set(revisadas);
  }

  private mapEntregaDocente(
    entrega: EvaluacionEntregaDto,
    evaluacion: EvaluacionGrupoDto,
    grupoNombre: string
  ): EntregaDocente {
    const fecha = this.parseFecha(entrega.creado_en);
    return {
      id: entrega.id,
      evaluacionId: evaluacion.id,
      evaluacionTitulo: evaluacion.titulo,
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

  descargarEntrega(entrega: EntregaDocente): void {
    if (!entrega.archivoUrl) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    window.open(entrega.archivoUrl, '_blank');
  }

  descargarRubrica(url: string | null): void {
    if (!url) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    window.open(url, '_blank');
  }

  private parseFecha(valor: string | null | undefined): Date | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
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