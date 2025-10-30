import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TemaService, TemaDisponible } from '../../docente/trabajolist/tema.service';
import { DocentesService, Docente } from '../../../shared/services/docentes.service';
import { PropuestaService, Propuesta } from '../../../shared/services/propuesta.service';
import { CurrentUserService } from '../../../shared/services/current-user.service';

type RamaCarrera =
  | 'Desarrollo de Software' | 'Sistemas de Información'
  | 'Inteligencia de Negocios' | 'Ciencia de Datos'
  | 'Redes y Seguridad' | 'Otra';

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

interface Profesor {
    id: number;
  nombre: string;
  carrera: string | null;
  telefono: string | null;
  ramas: RamaCarrera[] | null;
}



@Component({
  selector: 'alumno-trabajo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './alumno-trabajo.component.html',
  styleUrls: ['./alumno-trabajo.component.css']
})
export class AlumnoTrabajoComponent {
  // Data existente
  tab = signal<'i' | 'ii' | 'temas'>('i');

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

  nivelActual = computed<Nivel | null>(() => {
    const value = this.tab();
    return value === 'temas' ? null : value;
  });

  resumenNivel = computed<ResumenNivel | null>(() => {
    const nivel = this.nivelActual();
    return nivel ? this.resumen()[nivel] : null;
  });

  entregasPorNivel = computed<EntregaAlumno[]>(() => {
    const nivel = this.nivelActual();
    return nivel ? this.entregas()[nivel] : [];
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
    if (!nivel) return '';
    return nivel === 'i' ? 'T. Título I' : 'T. Título II';
  });

  temas = signal<TemaDisponible[]>([]);
  temasCargando = signal(false);
  temasError = signal<string | null>(null);
  private temasCargados = false;
  reservaMensaje = signal<string | null>(null);
  reservaError = signal<string | null>(null);
  temaSeleccionado = signal<TemaDisponible | null>(null);
  reservandoTemaId = signal<number | null>(null);
  
  propuestas = signal<Propuesta[]>([]);
  propuestasCargando = signal(false);
  propuestasError = signal<string | null>(null);
  private propuestasCargadas = false;

  propuestasAceptadas = computed(() => {
    return this.propuestas()
      .filter((p) => p.estado === 'aceptada')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  });

  propuestaAceptadaDestacada = computed(() => {
    const aceptadas = this.propuestasAceptadas();
    return aceptadas.length ? aceptadas[0] : null;
  });

  estadoPropuestaTexto: Record<Propuesta['estado'], string> = {
    pendiente: 'Pendiente',
    aceptada: 'Aceptada',
    rechazada: 'Rechazada',
  };

  estadoPropuestaClase(estado: Propuesta['estado']): string {
    if (estado === 'aceptada') {
      return 'aceptada';
    }
    if (estado === 'rechazada') {
      return 'rechazada';
    }
    return 'pendiente';
  }


  // Estado modal
  showPostulacion = signal(false);

  // Catálogos
  ramas: RamaCarrera[] = [
    'Desarrollo de Software','Sistemas de Información','Inteligencia de Negocios',
    'Ciencia de Datos','Redes y Seguridad','Otra'
  ];

  profesores = signal<Profesor[]>([]);
  profesoresCargando = signal(false);
  profesoresError = signal<string | null>(null);

  postulacionForm: FormGroup;

  enviandoPropuesta = signal(false);
  postulacionError = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private temaService: TemaService,
    private propuestaService: PropuestaService,
    private docentesService: DocentesService,
    private currentUserService: CurrentUserService,
  ) {
    this.postulacionForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(160)]],
      objetivo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', [Validators.required, Validators.maxLength(1200)]],
      rama: ['', Validators.required],
      prof1: ['', Validators.required],
      prof2: [''],
      prof3: ['']
    }, { validators: this.profesoresDistintosValidator });

    effect(() => {
      if (this.tab() === 'temas') {
        this.reservaMensaje.set(null);
        this.reservaError.set(null);
        this.intentarCargarTemas();
        this.intentarCargarPropuestas();
      }
    });

    effect(() => {
      const shouldDisable = this.profesoresCargando() || !this.profesores().length;
      this.actualizarEstadoControlesProfesores(shouldDisable);
    });
  }

  // Getter para usar en template y evitar TS4111
  get profesoresDuplicados() {
    return this.postulacionForm.errors?.['profesoresDuplicados'];
  }

  // Filtra profesores por rama seleccionada
  profesoresFiltrados = computed(() => {
    const rama = this.postulacionForm.get('rama')?.value as RamaCarrera | '';
    const lista = this.profesores();
    if (!rama) return lista;
    return lista.filter(p => !p.ramas?.length || p.ramas.includes(rama as RamaCarrera));
  });

  togglePostulacion(open: boolean) {
    this.showPostulacion.set(open);
    if (open) {
      this.cargarProfesores();
    } else {
      this.postulacionForm.reset();
      this.postulacionError.set(null);
    }
  }

  private actualizarEstadoControlesProfesores(desactivar: boolean) {
    const controles = ['prof1', 'prof2', 'prof3'];
    controles.forEach((nombre) => {
      const control = this.postulacionForm.get(nombre);
      if (!control) {
        return;
      }

      if (desactivar) {
        if (control.enabled) {
          control.disable({ emitEvent: false });
        }
        return;
      }

      if (control.disabled) {
        control.enable({ emitEvent: false });
      }
    });
  }

  private intentarCargarTemas() {
    if (this.temasCargados || this.temasCargando()) {
      return;
    }
    this.temasCargando.set(true);
    this.temasError.set(null);
    const alumnoId = this.obtenerAlumnoIdActual();
    this.temaService.getTemas(alumnoId ?? undefined).subscribe({
      next: temas => {
        this.temas.set(temas);
        this.temasCargados = true;
        this.temasCargando.set(false);
      },
      error: err => {
        console.error('Error al cargar temas disponibles', err);
        this.temasError.set('No fue posible cargar los temas disponibles. Intenta nuevamente más tarde.');
        this.temasCargando.set(false);
      },
    });
  }

  puedePedirTema(tema: TemaDisponible): boolean {
    return tema.cuposDisponibles > 0 && !tema.tieneCupoPropio;
  }

  etiquetaPedirTema(tema: TemaDisponible): string {
    if (tema.tieneCupoPropio) {
      return 'Cupo reservado';
    }
    if (tema.cuposDisponibles === 0) {
      return 'Sin cupos';
    }
    if (this.reservandoTemaId() === tema.id) {
      return 'Reservando…';
    }
    return 'Pedir tema';
  }

  abrirConfirmacionTema(tema: TemaDisponible) {
    if (!this.puedePedirTema(tema)) {
      return;
    }

    this.reservaError.set(null);
    this.temaSeleccionado.set(tema);
  }

  cerrarConfirmacionTema() {
    const seleccionado = this.temaSeleccionado();
    if (seleccionado && this.reservandoTemaId() === seleccionado.id) {
      return;
    }

    this.temaSeleccionado.set(null);
  }

  confirmarReservaTema() {
    const tema = this.temaSeleccionado();
    if (!tema) {
      return;
    }

    this.pedirTema(tema);
  }

  pedirTema(tema: TemaDisponible) {
    const alumnoId = this.obtenerAlumnoIdActual();
    if (!alumnoId || !tema.id) {
      this.reservaError.set('No se pudo identificar al alumno actual.');
      this.reservaMensaje.set(null);
      return;
    }

    if (!this.puedePedirTema(tema)) {
      return;
    }

    this.reservaMensaje.set(null);
    this.reservandoTemaId.set(tema.id);
    this.reservaError.set(null);

    this.temaService.pedirTema(tema.id, alumnoId).subscribe({
      next: (actualizado) => {
        this.actualizarTemaEnLista(actualizado);
        this.reservaMensaje.set('Cupo reservado correctamente.');
        this.reservaError.set(null);
        this.reservandoTemaId.set(null);
        this.temaSeleccionado.set(null);
      },
      error: (err) => {
        const detail = err?.error?.detail ?? 'No fue posible reservar el tema. Intenta nuevamente.';
        this.reservaError.set(detail);
        this.reservaMensaje.set(null);
        this.reservandoTemaId.set(null);
      }
    });
  }

  private actualizarTemaEnLista(actualizado: TemaDisponible) {
    this.temas.update((lista) =>
      lista.map((tema) => (tema.id === actualizado.id ? actualizado : tema))
    );
  }

  private obtenerAlumnoIdActual(): number | null {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id || perfil.rol !== 'alumno') {
      return null;
    }
    return perfil.id;
  }

 private intentarCargarPropuestas() {
    if (this.propuestasCargadas || this.propuestasCargando()) {
      return;
    }

    const perfil = this.currentUserService.getProfile();
    const alumnoId = perfil?.id ?? null;
    if (!alumnoId) {
      this.propuestasCargadas = true;
      this.propuestas.set([]);
      return;
    }

    this.propuestasCargando.set(true);
    this.propuestasError.set(null);

    this.propuestaService.listarPorAlumno(alumnoId).subscribe({
      next: (propuestas) => {
        this.propuestas.set(propuestas);
        this.propuestasCargadas = true;
        this.propuestasCargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar tus propuestas', err);
        this.propuestasError.set('No fue posible cargar tus propuestas. Intenta nuevamente.');
        this.propuestasCargando.set(false);
      },
    });
  }

  private profesoresDistintosValidator = (group: FormGroup) => {
    const p1 = group.get('prof1')?.value;
    const p2 = group.get('prof2')?.value;
    const p3 = group.get('prof3')?.value;
    const arr = [p1, p2, p3].filter(Boolean);
    return (new Set(arr).size !== arr.length) ? { profesoresDuplicados: true } : null;
  };

  submitPostulacion() {
    if (this.postulacionForm.invalid) {
      this.postulacionForm.markAllAsTouched();
      return;
    }
const titulo = this.postulacionForm.value.titulo.trim();
    const objetivo = this.postulacionForm.value.objetivo.trim();
    const descripcion = this.postulacionForm.value.descripcion.trim();
    const rama = this.postulacionForm.value.rama;
    const preferenciasValores = [
      this.postulacionForm.value.prof1,
      this.postulacionForm.value.prof2,
      this.postulacionForm.value.prof3
    ].filter((v): v is string | number => v !== null && v !== '');
    const preferencias = preferenciasValores.map((id) => Number(id));
    const perfil = this.currentUserService.getProfile();

    this.enviandoPropuesta.set(true);
    this.postulacionError.set(null);

    this.propuestaService.crearPropuesta({
      alumnoId: perfil?.id ?? null,
      titulo,
      objetivo,
      descripcion,
      rama,
      preferenciasDocentes: preferencias,
      docenteId: preferencias.length ? preferencias[0] : null,
    }).subscribe({
      next: () => {
        alert('Tu postulación fue enviada para revisión.');
        this.togglePostulacion(false);
        this.enviandoPropuesta.set(false);
        this.propuestasCargadas = false;
        this.intentarCargarPropuestas();
      },
      error: (err) => {
        console.error('No fue posible enviar la propuesta', err);
        this.postulacionError.set('No fue posible enviar la postulación. Intenta nuevamente.');
        this.enviandoPropuesta.set(false);
      }
    });
  }

  hasError(ctrl: string, err: string) {
    const c = this.postulacionForm.get(ctrl);
    return !!(c && c.touched && c.hasError(err));
  }
  
  private cargarProfesores() {
    if (this.profesores().length || this.profesoresCargando()) {
      return;
    }

    const perfil = this.currentUserService.getProfile();
    const carrera = perfil?.carrera ?? undefined;

    this.profesoresCargando.set(true);
    this.profesoresError.set(null);

    this.docentesService.listar(carrera ?? undefined).subscribe({
      next: (docentes: Docente[]) => {
        const mapped: Profesor[] = docentes.map((doc) => ({
          id: doc.id,
          nombre: doc.nombre,
          carrera: doc.carrera,
          telefono: doc.telefono,
          ramas: null,
        }));
        this.profesores.set(mapped);
        this.profesoresCargando.set(false);
      },
      error: (err) => {
        console.error('No fue posible cargar los docentes', err);
        this.profesoresError.set('No fue posible cargar el listado de docentes.');
        this.profesoresCargando.set(false);
      }
    });
  }
}