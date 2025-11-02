import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { TemaService, TemaDisponible } from '../../docente/trabajolist/tema.service';
import { PropuestaService, Propuesta } from '../../../shared/services/propuesta.service';
import { DocentesService, Docente } from '../../../shared/services/docentes.service';
import { CurrentUserService } from '../../../shared/services/current-user.service';

export type RamaCarrera =
  | 'Desarrollo de Software' | 'Sistemas de Información'
  | 'Inteligencia de Negocios' | 'Ciencia de Datos'
  | 'Redes y Seguridad' | 'Otra';

type Tab = 'temas' | 'propuestas';

interface Profesor {
  id: number;
  nombre: string;
  carrera: string | null;
  telefono: string | null;
  ramas: RamaCarrera[] | null;
}

@Component({
  selector: 'alumno-temas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alumno-temas.component.html',
  styleUrls: ['./alumno-temas.component.css'],
})
export class AlumnoTemasComponent {
  readonly tab = signal<Tab>('temas');

  readonly temas = signal<TemaDisponible[]>([]);
  readonly temasCargando = signal(false);
  readonly temasError = signal<string | null>(null);
  private temasCargados = false;

  readonly propuestas = signal<Propuesta[]>([]);
  readonly propuestasCargando = signal(false);
  readonly propuestasError = signal<string | null>(null);
  private propuestasCargadas = false;

  readonly reservaMensaje = signal<string | null>(null);
  readonly reservaError = signal<string | null>(null);
  readonly reservandoTemaId = signal<number | null>(null);
  readonly temaPorConfirmar = signal<TemaDisponible | null>(null);

  readonly showPostulacion = signal(false);

  readonly ramas: RamaCarrera[] = [
    'Desarrollo de Software',
    'Sistemas de Información',
    'Inteligencia de Negocios',
    'Ciencia de Datos',
    'Redes y Seguridad',
    'Otra',
  ];

  readonly profesores = signal<Profesor[]>([]);
  readonly profesoresCargando = signal(false);
  readonly profesoresError = signal<string | null>(null);

  readonly enviandoPropuesta = signal(false);
  readonly postulacionError = signal<string | null>(null);

  readonly postulacionForm: FormGroup;

  readonly profesoresFiltrados = computed(() => {
    const rama = this.postulacionForm.get('rama')?.value as RamaCarrera | '';
    const lista = this.profesores();
    if (!rama) {
      return lista;
    }
    return lista.filter((p) => !p.ramas?.length || p.ramas.includes(rama));
  });

  readonly propuestasAceptadas = computed(() =>
    this.propuestas()
      .filter((p) => p.estado === 'aceptada')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  );

  readonly propuestasPendientes = computed(() =>
    this.propuestas()
      .filter((p) => p.estado === 'pendiente')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  );

  readonly propuestaDestacada = computed(() => {
    const aceptada = this.propuestasAceptadas()[0];
    if (aceptada) {
      return aceptada;
    }
    const pendiente = this.propuestasPendientes()[0];
    return pendiente ?? null;
  });

  readonly propuestasEnHistorial = computed(() => {
    const destacada = this.propuestaDestacada();
    return this.propuestas()
      .filter((propuesta) => !destacada || propuesta.id !== destacada.id)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  });

  readonly estadoPropuestaTexto: Record<Propuesta['estado'], string> = {
    pendiente: 'Pendiente',
    aceptada: 'Aceptada',
    rechazada: 'Rechazada',
  };

  constructor(
    private readonly fb: FormBuilder,
    private readonly temaService: TemaService,
    private readonly propuestaService: PropuestaService,
    private readonly docentesService: DocentesService,
    private readonly currentUserService: CurrentUserService,
  ) {
    this.postulacionForm = this.fb.group(
      {
        titulo: ['', [Validators.required, Validators.maxLength(160)]],
        objetivo: ['', [Validators.required, Validators.maxLength(300)]],
        descripcion: ['', [Validators.required, Validators.maxLength(1200)]],
        rama: ['', Validators.required],
        prof1: ['', Validators.required],
        prof2: [''],
        prof3: [''],
      },
      { validators: this.profesoresDistintosValidator },
    );

    effect(() => {
      const currentTab = this.tab();
      if (currentTab === 'temas') {
        this.reservaMensaje.set(null);
        this.reservaError.set(null);
        this.intentarCargarTemas();
      }

      if (currentTab === 'temas' || currentTab === 'propuestas') {
        this.intentarCargarPropuestas();
      }
    });

    effect(() => {
      const shouldDisable = this.profesoresCargando() || !this.profesores().length;
      this.actualizarEstadoControlesProfesores(shouldDisable);
    });
  }

  get profesoresDuplicados() {
    return this.postulacionForm.errors?.['profesoresDuplicados'];
  }

  chipClasePropuesta(estado: Propuesta['estado']): string {
    if (estado === 'aceptada') {
      return 'success';
    }
    if (estado === 'pendiente') {
      return 'pending';
    }
    return 'ghost';
  }

  estadoPropuestaClase(estado: Propuesta['estado']): string {
    if (estado === 'aceptada') {
      return 'aceptada';
    }
    if (estado === 'rechazada') {
      return 'rechazada';
    }
    return 'pendiente';
  }

  etiquetaPropuestaDestacada(propuesta: Propuesta): string {
    if (propuesta.estado === 'aceptada') {
      return 'Propuesta aceptada';
    }
    if (propuesta.estado === 'pendiente') {
      return 'Propuesta pendiente';
    }
    return 'Propuesta';
  }

  togglePostulacion(open: boolean) {
    this.showPostulacion.set(open);
    if (open) {
      this.cargarProfesores();
      return;
    }

    this.postulacionForm.reset();
    this.postulacionError.set(null);
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

  temaSeleccionado(): TemaDisponible | null {
    return this.temaPorConfirmar();
  }

  abrirConfirmacionTema(tema: TemaDisponible) {
    if (!this.puedePedirTema(tema)) {
      return;
    }

    this.reservaError.set(null);
    this.reservaMensaje.set(null);
    this.temaPorConfirmar.set(tema);
  }

  cerrarConfirmacionTema() {
    if (this.reservandoTemaId()) {
      return;
    }

    this.temaPorConfirmar.set(null);
  }

  confirmarReservaTema() {
    const tema = this.temaPorConfirmar();
    if (!tema) {
      return;
    }

    this.pedirTema(tema);
  }

  hasError(ctrl: string, err: string) {
    const c = this.postulacionForm.get(ctrl);
    return !!(c && c.touched && c.hasError(err));
  }

  private pedirTema(tema: TemaDisponible) {
    const alumnoId = this.obtenerAlumnoIdActual();
    if (!alumnoId || !tema.id) {
      this.reservaError.set('No se pudo identificar al alumno actual.');
      this.reservaMensaje.set(null);
      return;
    }

    this.reservandoTemaId.set(tema.id);
    this.temaService.pedirTema(tema.id, alumnoId).subscribe({
      next: (actualizado) => {
        this.temas.set(
          this.temas().map((t) => (t.id === actualizado.id ? actualizado : t)),
        );
        this.reservaMensaje.set('Tu reserva fue registrada correctamente.');
        this.reservaError.set(null);
        this.temaPorConfirmar.set(null);
        this.reservandoTemaId.set(null);
      },
      error: (err) => {
        console.error('Error al reservar tema', err);
        this.reservaError.set('No fue posible reservar el tema. Intenta nuevamente.');
        this.reservaMensaje.set(null);
        this.reservandoTemaId.set(null);
      },
    });
  }

  private intentarCargarTemas() {
    if (this.temasCargados || this.temasCargando()) {
      return;
    }

    this.temasCargando.set(true);
    this.temasError.set(null);

    const alumnoId = this.obtenerAlumnoIdActual();
    const opciones = alumnoId != null ? { usuarioId: alumnoId, alumnoId } : undefined;

    this.temaService.getTemas(opciones).subscribe({
      next: (temas) => {
        this.temas.set(temas);
        this.temasCargados = true;
        this.temasCargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar temas disponibles', err);
        this.temasError.set('No fue posible cargar los temas disponibles. Intenta nuevamente más tarde.');
        this.temasCargando.set(false);
      },
    });
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

  submitPostulacion() {
    if (this.postulacionForm.invalid) {
      this.postulacionForm.markAllAsTouched();
      return;
    }

    const titulo = this.postulacionForm.value.titulo.trim();
    const objetivo = this.postulacionForm.value.objetivo.trim();
    const descripcion = this.postulacionForm.value.descripcion.trim();
    const rama = this.postulacionForm.value.rama as RamaCarrera;

    const preferenciasValores = [
      this.postulacionForm.value.prof1,
      this.postulacionForm.value.prof2,
      this.postulacionForm.value.prof3,
    ].filter((v): v is string | number => v !== null && v !== '');

    const preferencias = preferenciasValores.map((id) => Number(id));
    const perfil = this.currentUserService.getProfile();

    this.enviandoPropuesta.set(true);
    this.postulacionError.set(null);

    this.propuestaService
      .crearPropuesta({
        alumnoId: perfil?.id ?? null,
        titulo,
        objetivo,
        descripcion,
        rama,
        preferenciasDocentes: preferencias,
        docenteId: preferencias.length ? preferencias[0] : null,
      })
      .subscribe({
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
        },
      });
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
      },
    });
  }

  private profesoresDistintosValidator = (group: FormGroup) => {
    const p1 = group.get('prof1')?.value;
    const p2 = group.get('prof2')?.value;
    const p3 = group.get('prof3')?.value;
    const arr = [p1, p2, p3].filter(Boolean);
    return new Set(arr).size !== arr.length ? { profesoresDuplicados: true } : null;
  };

  private obtenerAlumnoIdActual(): number | null {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id || perfil.rol !== 'alumno') {
      return null;
    }
    return perfil.id;
  }
}
