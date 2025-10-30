import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Nivel = 'i' | 'ii';

type EstadoEntrega = 'aprobado' | 'enRevision' | 'pendiente';

interface EntregaAlumno {
  id: string;
  nombre: string;
  descripcion: string;
  fecha: string;
  estado: EstadoEntrega;
  badge: string;
  proximoPaso?: string;
  alerta?: string;
}

interface EntregaDestacada extends EntregaAlumno {
  estadoEtiqueta: string;
  encabezado: string;
}

interface ResumenNivel {
  avance: number;
  aprobadas: number;
  totales: number;
  proximoHito: string;
  ultimoFeedback: string;
  profesorGuia: string;
}

@Component({
  selector: 'alumno-trabajo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './alumno-trabajo.component.html',
  styleUrls: ['./alumno-trabajo.component.css']
})
export class AlumnoTrabajoComponent {
  tab = signal<Nivel>('i');

  // Información de seguimiento por nivel
  entregas = signal<Record<Nivel, EntregaAlumno[]>>({
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

  resumen = signal<Record<Nivel, ResumenNivel>>({
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

  estadoTexto: Record<EstadoEntrega, string> = {
    aprobado: 'Aprobado',
    enRevision: 'En revisión',
    pendiente: 'Pendiente',
  };

  nivelActual = computed<Nivel>(() => this.tab());

  resumenNivel = computed<ResumenNivel>(() => {
    const nivel = this.nivelActual();
    return this.resumen()[nivel];
  });

  entregasPorNivel = computed<EntregaAlumno[]>(() => {
    const nivel = this.nivelActual();
    return this.entregas()[nivel];
  });

  entregaDestacada = computed<EntregaDestacada | null>(() => {
    const entregas = this.entregasPorNivel();
    if (!entregas.length) {
      return null;
    }

    const pendiente = entregas.find((entrega) => entrega.estado === 'pendiente');
    const seleccionada = pendiente ?? entregas[entregas.length - 1];
    const encabezado = pendiente ? 'Entrega pendiente' : 'Actividad más reciente';

    return {
      ...seleccionada,
      estadoEtiqueta: this.estadoTexto[seleccionada.estado],
      encabezado,
    };
  });

  nivelTitulo = computed(() => {
    const nivel = this.nivelActual();
    return nivel === 'i' ? 'T. Título I' : 'T. Título II';
  });
}