import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import { TemaService, TemaDisponible, TemaInscripcionActiva } from '../../docente/trabajolist/tema.service';
import { AlumnoEntregasService } from '../entrega/alumno-entrega.service';

type Nivel = 'i' | 'ii';
type EstadoEntrega = 'aprobado' | 'enRevision' | 'pendiente';

type ResumenNivel = {
  avance: number;
  aprobadas: number;
  totales: number;
  proximoHito: string;
  ultimoFeedback: string;
  profesorGuia: string;
};

type EntregaAlumno = {
  id: string;
  nombre: string;
  descripcion: string;
  fecha: string;
  fechaOrden: string;
  estado: EstadoEntrega;
  badge: string;
  proximoPaso?: string;
  alerta?: string;
  expanded?: boolean;
};

type EntregaDestacada = EntregaAlumno & {
  estadoEtiqueta: string;
  encabezado: string;
};

type Restriccion = {
  titulo: string;
  descripcion: string;
};

type EvaluacionGrupo = {
  titulo: string;
  nota: number | null;
};

const CARRERAS_SIN_TRABAJO_TITULO = new Set(
  [
    'Bachillerato en Ciencias de la Ingeniería',
    'Dibujante Proyectista',
  ].map(nombre => nombre.toLowerCase()),
);

const CARRERAS_SOLO_NIVEL_I = new Set(
  [
    'Ingeniería Civil Biomédica',
    'Ingeniería Civil Electrónica',
    'Ingeniería Civil en Mecánica',
    'Ingeniería en Geomensura',
    'Ingeniería en Informática',
    'Ingeniería Civil Industrial',
    'Ingeniería Industrial',
  ].map(nombre => nombre.toLowerCase()),
);

const CARRERAS_NIVEL_I_Y_II = new Set(
  [
    'Ingeniería Civil en Ciencia de Datos',
    'Ingeniería Civil en Computación mención Informática',
  ].map(nombre => nombre.toLowerCase()),
);

@Component({
  selector: 'alumno-trabajo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './alumno-trabajo.component.html',
  styleUrls: ['./alumno-trabajo.component.css'],
})
export class AlumnoTrabajoComponent implements OnInit {
  readonly nivelesDisponibles = signal<Nivel[]>(['i', 'ii']);
  readonly nivelSeleccionado = signal<Nivel>('i');

  readonly temaAsignado = signal<TemaDisponible | null>(null);
  readonly temaAsignadoCargando = signal(false);
  readonly temaAsignadoError = signal<string | null>(null);

  readonly estadoTexto: Record<EstadoEntrega, string> = {
    aprobado: 'Aprobado',
    enRevision: 'En revisión',
    pendiente: 'Pendiente',
  };

  readonly entregas = signal<Record<Nivel, EntregaAlumno[]>>({
    i: [
      {
        id: 'i-1',
        nombre: 'Avance Final TT1',
        descripcion:
          'Entrega pendiente del informe final para el cierre completo de Trabajo de Título I.',
        fecha: 'Fecha límite: 22 dic 2025 · 23:59',
        fechaOrden: '2025-12-22T23:59:00',
        estado: 'pendiente',
        badge: 'Avance final',
        proximoPaso: 'Revisar instrucciones y adjuntar el informe final',
      },
      {
        id: 'i-2',
        nombre: 'Avance 2',
        descripcion: 'Entrega de avance pendiente en Aula Virtual.',
        fecha: 'Fecha límite: 15 dic 2025 · 23:59',
        fechaOrden: '2025-12-15T23:59:00',
        estado: 'pendiente',
        badge: 'Avance',
        proximoPaso: 'Subir avances y evidencias de progreso',
        alerta: 'Queda menos de una semana para el cierre',
      },
      {
        id: 'i-3',
        nombre: 'Avance 3',
        descripcion: 'Entrega de avance intermedio pendiente de revisión docente.',
        fecha: 'Fecha límite: 15 dic 2025 · 23:59',
        fechaOrden: '2025-12-15T23:59:00',
        estado: 'pendiente',
        badge: 'Avance',
        proximoPaso: 'Ajustar según observaciones previas',
      },
      {
        id: 'i-4',
        nombre: 'Anteproyecto TT1',
        descripcion: 'Calificado. Revisa el informe corregido y las observaciones del docente.',
        fecha: 'Calificado el 02 nov 2025',
        fechaOrden: '2025-11-02T00:00:00',
        estado: 'aprobado',
        badge: 'Calificada',
        proximoPaso: 'Aplicar retroalimentación al avance final',
      },
    ],
    ii: [
      {
        id: 'ii-1',
        nombre: 'Documento final · Borrador',
        descripcion: 'Primer borrador enviado. El revisor entregará feedback detallado.',
        fecha: 'Entregado 05 abr 2024',
        fechaOrden: '2024-04-05T00:00:00',
        estado: 'enRevision',
        badge: 'Documento',
        proximoPaso: 'Incorporar correcciones de redacción',
        alerta: 'Revisión editorial',
      },
      {
        id: 'ii-2',
        nombre: 'Defensa simulada',
        descripcion: 'Preparar presentación y guion de 15 minutos.',
        fecha: 'Programar para la semana del 29 abr 2024',
        fechaOrden: '2024-04-29T00:00:00',
        estado: 'pendiente',
        badge: 'Presentación',
        proximoPaso: 'Confirmar disponibilidad con el profesor guía',
      },
      {
        id: 'ii-3',
        nombre: 'Bitácora Integrada',
        descripcion: 'Bitácora aprobada con comentarios positivos sobre la validación.',
        fecha: 'Entregada 28 mar 2024',
        fechaOrden: '2024-03-28T00:00:00',
        estado: 'aprobado',
        badge: 'Bitácora',
        proximoPaso: 'Actualizar métricas posteriores a la defensa simulada',
      },
    ],
  });

  readonly evaluaciones = signal<Record<Nivel, EvaluacionGrupo[]>>({
    i: [],
    ii: [
      { titulo: 'Documento final · Borrador', nota: 5.5 },
      { titulo: 'Defensa simulada', nota: 5.9 },
      { titulo: 'Bitácora Integrada', nota: 6.1 },
    ],
  });

  readonly evaluacionesCargando = signal(false);
  readonly evaluacionesError = signal<string | null>(null);

  readonly resumen = signal<Record<Nivel, ResumenNivel>>({
    i: {
      avance: 48,
      aprobadas: 1,
      totales: 4,
      proximoHito: 'Avance Final TT1 (22 dic 2025, 23:59)',
      ultimoFeedback: 'Observaciones del Anteproyecto publicadas el 02 nov 2025',
      profesorGuia: 'Prof. Mauro Castillo',
    },
    ii: {
      avance: 32,
      aprobadas: 1,
      totales: 4,
      proximoHito: 'Entrega de presentación para defensa simulada',
      ultimoFeedback: 'Comentarios de estilo pendientes desde el 12 abr',
      profesorGuia: 'Prof. Ana Díaz',
    },
  });

  readonly nivelActual = computed<Nivel | null>(() => {
    const seleccionado = this.nivelSeleccionado();
    return this.tieneNivel(seleccionado) ? seleccionado : null;
  });

  readonly resumenNivel = computed<ResumenNivel | null>(() => {
    const nivel = this.nivelActual();
    return nivel ? this.resumen()[nivel] : null;
  });

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

  readonly entregasPorNivel = computed<EntregaAlumno[]>(() => {
    const nivel = this.nivelActual();
    if (!nivel) {
      return [];
    }

    return this.ordenarEntregas(this.entregas()[nivel]);
  });

  readonly evaluacionesPorNivel = computed<EvaluacionGrupo[]>(() => {
    const nivel = this.nivelActual();
    if (!nivel) {
      return [];
    }

    const evaluaciones = this.evaluaciones()[nivel];
    const entregas = this.entregasPorNivel();

    return this.ordenarEvaluaciones(evaluaciones, entregas);
  });

  readonly promedioEvaluaciones = computed<string | null>(() => {
    const notas = this.evaluacionesPorNivel()
      .map(evaluacion => evaluacion.nota)
      .filter((nota): nota is number => nota !== null);

    if (!notas.length) {
      return null;
    }

    const promedio = notas.reduce((suma, nota) => suma + nota, 0) / notas.length;
    return promedio.toFixed(2);
  });

  readonly entregaDestacada = computed<EntregaDestacada | null>(() => {
    const items = this.entregasPorNivel();
    if (!items.length) {
      return null;
    }

    const pendiente = items.find(entrega => entrega.estado === 'pendiente');
    const seleccionada = pendiente ?? items[items.length - 1];
    const encabezado = pendiente ? 'Entrega pendiente' : 'Actividad más reciente';

    return {
      ...seleccionada,
      estadoEtiqueta: this.estadoTexto[seleccionada.estado],
      encabezado,
    };
  });

  readonly nivelTitulo = computed(() => {
    const nivel = this.nivelActual();
    if (!nivel) {
      return '';
    }
    return nivel === 'i' ? 'T. Título I' : 'T. Título II';
  });

  constructor(
    private readonly currentUserService: CurrentUserService,
    private readonly temaService: TemaService,
    private readonly entregasService: AlumnoEntregasService,
  ) {
    this.configurarNivelesDisponibles();
    this.cargarTemaAsignado();
  }

  ngOnInit(): void {
    this.cargarEvaluaciones();
  }

  tieneNivel(nivel: Nivel): boolean {
    return this.nivelesDisponibles().includes(nivel);
  }

  seleccionarNivel(nivel: Nivel) {
    if (!this.tieneNivel(nivel)) {
      return;
    }
    this.nivelSeleccionado.set(nivel);
  }

  toggleResumen(entrega: EntregaAlumno) {
    entrega.expanded = !entrega.expanded;
  }

  private ordenarEvaluaciones(
    evaluaciones: EvaluacionGrupo[],
    entregas: EntregaAlumno[],
  ): EvaluacionGrupo[] {
    const ordenEntregas = this.crearMapaOrden(entregas);

    return [...evaluaciones].sort((a, b) => {
      const indiceA = ordenEntregas.get(this.normalizarTitulo(a.titulo));
      const indiceB = ordenEntregas.get(this.normalizarTitulo(b.titulo));

      if (indiceA === undefined && indiceB === undefined) {
        return 0;
      }

      if (indiceA === undefined) {
        return 1;
      }

      if (indiceB === undefined) {
        return -1;
      }

      return indiceA - indiceB;
    });
  }

  private crearMapaOrden(entregas: EntregaAlumno[]): Map<string, number> {
    return entregas.reduce((mapa, entrega, indice) => {
      const clave = this.normalizarTitulo(entrega.nombre);
      if (!mapa.has(clave)) {
        mapa.set(clave, indice);
      }

      return mapa;
    }, new Map<string, number>());
  }

  private normalizarTitulo(titulo: string): string {
    return titulo.trim().toLowerCase();
  }

  private ordenarEntregas(entregas: EntregaAlumno[]): EntregaAlumno[] {
    const ahora = Date.now();

    return [...entregas].sort((a, b) => {
      const fechaA = new Date(a.fechaOrden).getTime();
      const fechaB = new Date(b.fechaOrden).getTime();

      const fechaAInvalida = Number.isNaN(fechaA);
      const fechaBInvalida = Number.isNaN(fechaB);

      if (fechaAInvalida && fechaBInvalida) {
        return 0;
      }

      if (fechaAInvalida) {
        return 1;
      }

      if (fechaBInvalida) {
        return -1;
      }

      const esPasadaA = fechaA < ahora;
      const esPasadaB = fechaB < ahora;

      if (esPasadaA !== esPasadaB) {
        return esPasadaA ? 1 : -1;
      }

      const distanciaA = Math.abs(fechaA - ahora);
      const distanciaB = Math.abs(fechaB - ahora);

      return distanciaA - distanciaB;
    });
  }

  private configurarNivelesDisponibles() {
    const perfil = this.currentUserService.getProfile();
    const niveles = this.determinarNivelesDisponibles(perfil?.carrera ?? null);
    this.nivelesDisponibles.set(niveles);

    if (!niveles.length) {
      return;
    }

    if (!niveles.includes(this.nivelSeleccionado())) {
      this.nivelSeleccionado.set(niveles[0]);
    }
  }

  private determinarNivelesDisponibles(carrera: string | null): Nivel[] {
    const normalizada = carrera?.trim().toLowerCase() ?? '';

    if (!normalizada) {
      return ['i', 'ii'];
    }

    if (CARRERAS_SIN_TRABAJO_TITULO.has(normalizada)) {
      return [];
    }

    if (CARRERAS_NIVEL_I_Y_II.has(normalizada)) {
      return ['i', 'ii'];
    }

    if (CARRERAS_SOLO_NIVEL_I.has(normalizada)) {
      return ['i'];
    }

    return ['i', 'ii'];
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

  private cargarEvaluaciones() {
    const perfil = this.currentUserService.getProfile();
    const alumnoId = perfil?.id ?? null;

    if (!alumnoId) {
      this.evaluacionesError.set('No pudimos identificar al alumno actual para obtener sus evaluaciones.');
      return;
    }

    this.evaluacionesCargando.set(true);
    this.evaluacionesError.set(null);

    this.entregasService.listarEvaluaciones(alumnoId).subscribe({
      next: (evaluaciones) => {
        const mapeadas = evaluaciones.map<EvaluacionGrupo>((evaluacion) => ({
          titulo: evaluacion.titulo,
          nota: evaluacion.ultima_entrega?.nota ?? null,
        }));

        this.evaluaciones.update((actual) => ({
          ...actual,
          i: mapeadas,
        }));

        this.evaluacionesCargando.set(false);
      },
      error: (error) => {
        console.error('No se pudieron cargar las evaluaciones del alumno', error);
        this.evaluacionesCargando.set(false);
        const detalle = error?.error?.detail;
        if (typeof detalle === 'string') {
          this.evaluacionesError.set(detalle);
        } else {
          this.evaluacionesError.set('No pudimos cargar tus notas. Intenta nuevamente más tarde.');
        }
      },
    });
  }
}