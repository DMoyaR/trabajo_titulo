import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import { TemaService, TemaDisponible, TemaInscripcionActiva } from '../../docente/trabajolist/tema.service';

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
export class AlumnoTrabajoComponent {
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
        nombre: 'Hito 1 · Plan de trabajo',
        descripcion: 'Aprobado. El plan quedó registrado en el repositorio el 10 de abril.',
        fecha: 'Entregado 08 abr 2024',
        estado: 'aprobado',
        badge: 'Plan de trabajo',
        proximoPaso: 'Bitácora semanal (20 abr)',
      },
      {
        id: 'i-2',
        nombre: 'Bitácora Semanal #5',
        descripcion: 'En revisión por tu profesor guía. Responder comentarios pendientes.',
        fecha: 'Enviada 15 abr 2024',
        estado: 'enRevision',
        badge: 'Bitácora',
        proximoPaso: 'Ajustar actividades comprometidas',
        alerta: 'Observaciones recibidas',
      },
      {
        id: 'i-3',
        nombre: 'Reunión de seguimiento',
        descripcion: 'Agenda una reunión de 30 minutos para revisar el avance de la semana.',
        fecha: 'Coordinar antes del 25 abr 2024',
        estado: 'pendiente',
        badge: 'Reunión',
        proximoPaso: 'Proponer 3 horarios disponibles',
      },
    ],
    ii: [
      {
        id: 'ii-1',
        nombre: 'Documento final · Borrador',
        descripcion: 'Primer borrador enviado. El revisor entregará feedback detallado.',
        fecha: 'Entregado 05 abr 2024',
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
        estado: 'pendiente',
        badge: 'Presentación',
        proximoPaso: 'Confirmar disponibilidad con el profesor guía',
      },
      {
        id: 'ii-3',
        nombre: 'Bitácora Integrada',
        descripcion: 'Bitácora aprobada con comentarios positivos sobre la validación.',
        fecha: 'Entregada 28 mar 2024',
        estado: 'aprobado',
        badge: 'Bitácora',
        proximoPaso: 'Actualizar métricas posteriores a la defensa simulada',
      },
    ],
  });

  readonly evaluaciones = signal<Record<Nivel, EvaluacionGrupo[]>>({
    i: [
      { titulo: 'Plan de trabajo', nota: 6.3 },
      { titulo: 'Bitácora Semanal #5', nota: 5.8 },
      { titulo: 'Reunión de seguimiento', nota: 6.0 },
    ],
    ii: [
      { titulo: 'Documento final · Borrador', nota: 5.5 },
      { titulo: 'Defensa simulada', nota: 5.9 },
      { titulo: 'Bitácora Integrada', nota: 6.1 },
    ],
  });

  readonly resumen = signal<Record<Nivel, ResumenNivel>>({
    i: {
      avance: 65,
      aprobadas: 3,
      totales: 5,
      proximoHito: 'Bitácora Semanal #6 (20 abr)',
      ultimoFeedback: 'Retroalimentación general recibida el 15 abr',
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

  readonly restricciones = signal<Restriccion[]>([
    {
      titulo: 'Una postulación activa por alumno',
      descripcion:
        'Si ya tienes una postulación en estado pendiente, en revisión, aceptada o rechazada con observaciones no podrás crear otra hasta que se cierre la actual.',
    },
    {
      titulo: 'Sin edición de postulación tras el envío',
      descripcion:
        'Una vez enviada la postulación queda bloqueada. Solo vuelve a estar editable si el docente la marca como “observada”.',
    },
    {
      titulo: 'Contenido filtrado por carrera',
      descripcion:
        'Solo verás docentes, propuestas y temáticas asociadas a tu carrera (career_id/codigo_carrera) para asegurar la pertinencia del proceso.',
    },
    {
      titulo: 'Entregas solo en etapas habilitadas',
      descripcion:
        'Cada entrega se habilita únicamente si la etapa está activa y dentro de las fechas publicadas por la coordinación.',
    },
    {
      titulo: 'Entregas bloqueadas tras confirmar',
      descripcion:
        'Al confirmar una entrega el archivo queda protegido; el botón de edición se oculta para mantener la integridad documental.',
    },
    {
      titulo: 'Evaluaciones docentes cuando están publicadas',
      descripcion:
        'Los comentarios y resultados del docente solo se muestran cuando visible == true, tras la publicación de la retroalimentación.',
    },
    {
      titulo: 'Agendamiento condicionado a profesor guía',
      descripcion:
        'Solo puedes agendar reuniones si cuentas con profesor guía asignado y el calendario se encuentra publicado (docente_asignado y calendario_publicado).',
    },
    {
      titulo: 'Validación de archivos al subir',
      descripcion:
        'El sistema acepta únicamente archivos .pdf, .docx o .zip con un máximo de 25 MB, validado tanto en frontend como en backend.',
    },
    {
      titulo: 'Formularios completos',
      descripcion:
        'Las solicitudes y entregas se pueden enviar únicamente si todos los campos obligatorios están completos; no se permiten formularios incompletos.',
    },
    {
      titulo: 'Certificados tras finalizar el proceso',
      descripcion:
        'El certificado de aprobación se habilita solo si status_proceso == "finalizado" y evaluacion_final == "aprobada".',
    },
    {
      titulo: 'Descarga de actas validada',
      descripcion:
        'Las actas pueden descargarse únicamente cuando cuentan con la firma del docente (acta_firmada) y la validación de la coordinación.',
    },
    {
      titulo: 'Integrantes fijos tras postular',
      descripcion:
        'Al enviar la postulación queda bloqueada la edición del grupo de trabajo para mantener consistencia en el registro de integrantes.',
    },
    {
      titulo: 'Acceso restringido a otros grupos',
      descripcion:
        'No es posible visualizar documentos o procesos de otros estudiantes; el aislamiento se asegura por grupo_id desde el backend.',
    },
    {
      titulo: 'Documentos internos protegidos',
      descripcion:
        'Las rúbricas internas, observaciones privadas y otros documentos de revisión docente o de coordinación no están disponibles para los estudiantes.',
    },
  ]);

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
    return nivel ? this.entregas()[nivel] : [];
  });

  readonly evaluacionesPorNivel = computed<EvaluacionGrupo[]>(() => {
    const nivel = this.nivelActual();
    return nivel ? this.evaluaciones()[nivel] : [];
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
  ) {
    this.configurarNivelesDisponibles();
    this.cargarTemaAsignado();
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
}