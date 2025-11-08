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
      titulo: 'Un solo tema activo',
      descripcion:
        'Solo puedes tener un trabajo de título activo a la vez. Si necesitas cambiar de tema debes gestionar primero la liberación del actual con la coordinación.',
    },
    {
      titulo: 'Entregas solo en etapas habilitadas',
      descripcion:
        'Las entregas pueden subirse únicamente cuando la coordinación habilita la etapa correspondiente; fuera de esas ventanas los envíos quedan bloqueados.',
    },
    {
      titulo: 'Sin edición tras confirmar',
      descripcion:
        'Una vez que confirmas una entrega el archivo queda bloqueado para resguardar la integridad documental, por lo que no podrás reemplazarlo.',
    },
    {
      titulo: 'Formularios completos',
      descripcion:
        'Todos los campos obligatorios deben estar completados para enviar solicitudes o entregas; los formularios incompletos no se pueden enviar.',
    },
    {
      titulo: 'Certificados solo al finalizar etapas',
      descripcion:
        'No se habilita la emisión de certificados hasta que finalices todas las etapas del proceso de título según tu malla.',
    },
    {
      titulo: 'Descarga tras validación',
      descripcion:
        'La descarga de certificados estará disponible únicamente después de que la coordinación valide el documento; no se generan automáticamente.',
    },
    {
      titulo: 'Documentos internos protegidos',
      descripcion:
        'Los documentos de revisión interna de docentes o coordinación, como rúbricas privadas u observaciones, no están visibles para estudiantes.',
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