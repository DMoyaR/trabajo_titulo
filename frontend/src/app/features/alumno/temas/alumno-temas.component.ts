import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

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

  readonly temaParaCupos = signal<TemaDisponible | null>(null);
  readonly gestionCuposError = signal<string | null>(null);
  readonly gestionCuposMensaje = signal<string | null>(null);
  readonly guardandoCompaneros = signal(false);

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
  readonly cuposForm: FormGroup;
  readonly ajusteForm: FormGroup;

  readonly propuestaParaAjuste = signal<Propuesta | null>(null);
  readonly showAjustePropuesta = signal(false);
  readonly ajusteError = signal<string | null>(null);
  readonly ajusteEnCurso = signal(false);
  readonly cancelarPropuestaError = signal<string | null>(null);
  readonly cancelandoPropuestaId = signal<number | null>(null);

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
      .filter((p) =>
        p.estado === 'pendiente' ||
        p.estado === 'pendiente_aprobacion'
      )
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
    pendiente_ajuste: 'Pendiente de ajuste',
    pendiente_aprobacion: 'Pendiente aprobación',
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
        cupos: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
        companeros: this.fb.array<FormControl<string>>([]),
      },
      { validators: this.profesoresDistintosValidator },
    );
    this.cuposForm = this.fb.group({
      correos: this.fb.array<FormControl<string>>([]),
    });
    this.ajusteForm = this.fb.group({
      cupos: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
      correos: this.fb.array<FormControl<string>>([]),
    });

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
    if (estado === 'pendiente' || estado === 'pendiente_aprobacion') {
      return 'pending';
    }
    if (estado === 'pendiente_ajuste') {
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
    if (propuesta.estado === 'pendiente_ajuste') {
      return 'Ajusta los cupos del grupo';
    }
    if (propuesta.estado === 'pendiente_aprobacion') {
      return 'Esperando aprobación del docente';
    }
    if (propuesta.estado === 'pendiente') {
      return 'Propuesta pendiente';
    }
    return 'Propuesta';
  }

  clasePropuestaDestacadaEstado(estado: Propuesta['estado']): string {
    if (estado === 'aceptada') {
      return 'success';
    }
    if (estado === 'pendiente' || estado === 'pendiente_aprobacion') {
      return 'pending';
    }
    if (estado === 'pendiente_ajuste') {
      return 'pending';
    }
    if (estado === 'rechazada') {
      return 'error';
    }
    return '';
  }

  togglePostulacion(open: boolean) {
    this.showPostulacion.set(open);
    if (open) {
      this.cargarProfesores();
      return;
    }

    this.resetPostulacionForm();
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

  get correosForm(): FormArray<FormControl<string>> {
    return this.cuposForm.get('correos') as FormArray<FormControl<string>>;
  }

  get correosAjuste(): FormArray<FormControl<string>> {
    return this.ajusteForm.get('correos') as FormArray<FormControl<string>>;
  }

  get companerosPostulacion(): FormArray<FormControl<string>> {
    return this.postulacionForm.get('companeros') as FormArray<FormControl<string>>;
  }

  puedeMostrarGestionCupos(tema: TemaDisponible): boolean {
    if (!tema.tieneCupoPropio || tema.cupos <= 1) {
      return false;
    }
    return this.esResponsableDelTema(tema);
  }

  private esResponsableDelTema(tema: TemaDisponible): boolean {
    const alumnoId = this.obtenerAlumnoIdActual();
    if (!alumnoId) {
      return false;
    }
    return (tema.inscripcionesActivas ?? []).some(
      (inscripcion) => inscripcion.id === alumnoId && inscripcion.esResponsable,
    );
  }

  puedeAgregarOtroCorreo(tema?: TemaDisponible | null): boolean {
    const objetivo = tema ?? this.temaParaCupos();
    if (!objetivo) {
      return false;
    }
    const max = Math.max((objetivo.cupos ?? 1) - 1, 0);
    return this.correosForm.length < max;
  }

  puedeAgregarCompaneroPostulacion(): boolean {
    const cuposControl = this.postulacionForm.get('cupos');
    const cupos = Number(cuposControl?.value ?? 1);
    const max = Math.max(cupos - 1, 0);
    return this.companerosPostulacion.length < max;
  }

  puedeAgregarCorreoAjuste(): boolean {
    const cuposControl = this.ajusteForm.get('cupos');
    const cupos = Number(cuposControl?.value ?? 1);
    const max = Math.max(cupos - 1, 0);
    return this.correosAjuste.length < max;
  }

  correoControlTieneError(index: number, error: string): boolean {
    const control = this.correosForm.at(index);
    return !!(control && control.touched && control.hasError(error));
  }

  companeroControlTieneError(index: number, error: string): boolean {
    const control = this.companerosPostulacion.at(index);
    return !!(control && control.touched && control.hasError(error));
  }

  correoAjusteTieneError(index: number, error: string): boolean {
    const control = this.correosAjuste.at(index);
    return !!(control && control.touched && control.hasError(error));
  }

  abrirGestionCupos(tema: TemaDisponible) {
    if (!this.puedeMostrarGestionCupos(tema)) {
      return;
    }

    this.temaParaCupos.set(tema);
    this.gestionCuposError.set(null);
    this.gestionCuposMensaje.set(null);
    this.construirFormularioCupos(tema);
  }

  cerrarGestionCupos() {
    if (this.guardandoCompaneros()) {
      return;
    }

    this.temaParaCupos.set(null);
  }

  agregarCampoCorreo() {
    if (!this.puedeAgregarOtroCorreo()) {
      return;
    }
    this.correosForm.push(this.crearCorreoControl(''));
  }

  agregarCompaneroPostulacion() {
    if (!this.puedeAgregarCompaneroPostulacion()) {
      return;
    }
    this.companerosPostulacion.push(this.crearCorreoControl(''));
  }

  agregarCorreoAjuste() {
    if (!this.puedeAgregarCorreoAjuste()) {
      return;
    }
    this.correosAjuste.push(this.crearCorreoControl(''));
  }

  removerCampoCorreo(index: number) {
    if (this.guardandoCompaneros()) {
      return;
    }
    this.correosForm.removeAt(index);
  }

  removerCompaneroPostulacion(index: number) {
    if (index < 0 || index >= this.companerosPostulacion.length) {
      return;
    }
    this.companerosPostulacion.removeAt(index);
  }

  removerCorreoAjuste(index: number) {
    if (this.ajusteEnCurso()) {
      return;
    }
    if (index < 0 || index >= this.correosAjuste.length) {
      return;
    }
    this.correosAjuste.removeAt(index);
  }

  abrirAjustePropuesta(propuesta: Propuesta) {
    this.propuestaParaAjuste.set(propuesta);
    this.showAjustePropuesta.set(true);
    this.ajusteError.set(null);
    this.ajusteEnCurso.set(false);

    const autorizado = propuesta.cuposMaximoAutorizado ?? propuesta.cuposRequeridos;
    const cuposIniciales = Math.min(propuesta.cuposRequeridos, autorizado || propuesta.cuposRequeridos) || 1;
    this.ajusteForm.reset({ cupos: cuposIniciales });
    this.correosAjuste.clear();

    const existentes = propuesta.correosCompaneros ?? [];
    const max = Math.max(cuposIniciales - 1, 0);
    existentes.slice(0, max).forEach((correo) => this.correosAjuste.push(this.crearCorreoControl(correo)));
    if (this.correosAjuste.length === 0 && max > 0) {
      this.correosAjuste.push(this.crearCorreoControl(''));
    }
  }

  cerrarAjustePropuesta() {
    if (this.ajusteEnCurso()) {
      return;
    }
    this.showAjustePropuesta.set(false);
    this.propuestaParaAjuste.set(null);
    this.ajusteError.set(null);
    this.correosAjuste.clear();
    this.ajusteForm.reset({ cupos: 1 });
  }

  ajustarCorreosAjustePorCupos() {
    const cupos = Number(this.ajusteForm.get('cupos')?.value ?? 1);
    const max = Math.max(cupos - 1, 0);
    while (this.correosAjuste.length > max) {
      this.correosAjuste.removeAt(this.correosAjuste.length - 1);
    }
  }

  guardarAjustePropuesta() {
    const propuesta = this.propuestaParaAjuste();
    if (!propuesta) {
      return;
    }

    this.ajusteForm.markAllAsTouched();
    const cuposControl = this.ajusteForm.get('cupos');
    const cupos = Number(cuposControl?.value ?? 1);
    if (!cuposControl || cuposControl.invalid || !Number.isFinite(cupos) || cupos < 1) {
      this.ajusteError.set('Revisa la cantidad de cupos solicitados.');
      return;
    }

    if (propuesta.cuposMaximoAutorizado && cupos > propuesta.cuposMaximoAutorizado) {
      this.ajusteError.set(`El docente autorizó como máximo ${propuesta.cuposMaximoAutorizado} integrantes.`);
      return;
    }

    let correosInvalidos = false;
    this.correosAjuste.controls.forEach((ctrl) => {
      ctrl.markAsTouched();
      if (ctrl.invalid && (ctrl.value ?? '').trim().length > 0) {
        correosInvalidos = true;
      }
    });
    if (correosInvalidos) {
      this.ajusteError.set('Revisa que los correos ingresados sean válidos.');
      return;
    }

    const perfil = this.currentUserService.getProfile();
    const correoPropio = perfil?.correo?.toLowerCase() ?? null;
    const maxCompaneros = Math.max(cupos - 1, 0);
    const seleccionados = new Map<string, string>();

    for (const control of this.correosAjuste.controls) {
      const valor = (control.value ?? '').trim();
      if (!valor) {
        continue;
      }
      const normalizado = valor.toLowerCase();
      if ((correoPropio && normalizado === correoPropio) || seleccionados.has(normalizado)) {
        continue;
      }
      seleccionados.set(normalizado, valor);
      if (seleccionados.size >= maxCompaneros) {
        break;
      }
    }

    const correos = Array.from(seleccionados.values());

    this.ajusteEnCurso.set(true);
    this.ajusteError.set(null);

    this.propuestaService
      .actualizarPropuesta(propuesta.id, {
        accion: 'confirmar_cupos',
        cuposRequeridos: cupos,
        correosCompaneros: correos,
      })
      .subscribe({
        next: (actualizada) => {
          this.propuestas.set(
            this.propuestas().map((p) => (p.id === actualizada.id ? actualizada : p)),
          );
          this.ajusteEnCurso.set(false);
          this.showAjustePropuesta.set(false);
          this.propuestaParaAjuste.set(null);
          this.ajusteForm.reset({ cupos: 1 });
        },
        error: (err) => {
          console.error('No fue posible confirmar los cupos de la propuesta', err);
          this.ajusteError.set('No fue posible confirmar los cupos. Intenta nuevamente.');
          this.ajusteEnCurso.set(false);
        },
      });
  }

  puedeAjustarPropuesta(propuesta: Propuesta): boolean {
    return propuesta.estado === 'pendiente_ajuste';
  }

  cancelarPropuesta(propuesta: Propuesta) {
    if (this.cancelandoPropuestaId() === propuesta.id) {
      return;
    }

    this.cancelarPropuestaError.set(null);
    this.cancelandoPropuestaId.set(propuesta.id);

    this.propuestaService.eliminarPropuesta(propuesta.id).subscribe({
      next: () => {
        this.propuestas.set(this.propuestas().filter((p) => p.id !== propuesta.id));
        this.cancelandoPropuestaId.set(null);
        if (this.propuestaParaAjuste()?.id === propuesta.id) {
          this.cerrarAjustePropuesta();
        }
      },
      error: (err) => {
        console.error('No fue posible cancelar la propuesta', err);
        this.cancelarPropuestaError.set(
          'No fue posible cancelar la propuesta. Intenta nuevamente.',
        );
        this.cancelandoPropuestaId.set(null);
      },
    });
  }

  maxCorreosPermitidosAjuste(): number {
    const cupos = Number(this.ajusteForm.get('cupos')?.value ?? 1);
    return Math.max(cupos - 1, 0);
  }

  guardarCompaneros() {
    const tema = this.temaParaCupos();
    if (!tema) {
      return;
    }

    const alumnoId = this.obtenerAlumnoIdActual();
    if (!alumnoId) {
      this.gestionCuposError.set('No fue posible identificar al alumno actual.');
      return;
    }

    let correosInvalidos = false;
    this.correosForm.controls.forEach((ctrl) => {
      ctrl.markAsTouched();
      if (ctrl.invalid && ctrl.value.trim().length > 0) {
        correosInvalidos = true;
      }
    });

    if (correosInvalidos) {
      this.gestionCuposError.set('Revisa que los correos ingresados sean válidos.');
      return;
    }

    const valores = this.correosForm.controls
      .map((ctrl) => ctrl.value.trim())
      .filter((valor) => valor.length > 0);

    const emailsNormalizados = new Map<string, string>();
    for (const correo of valores) {
      const normalizado = correo.toLowerCase();
      if (!emailsNormalizados.has(normalizado)) {
        emailsNormalizados.set(normalizado, correo);
      }
    }

    const correos = Array.from(emailsNormalizados.values());
    const maxCompaneros = Math.max((tema.cupos ?? 1) - 1, 0);
    if (correos.length > maxCompaneros) {
      this.gestionCuposError.set('No hay cupos suficientes para agregar a todos los compañeros.');
      return;
    }

    this.guardandoCompaneros.set(true);
    this.gestionCuposError.set(null);
    this.gestionCuposMensaje.set(null);

    this.temaService.asignarCompaneros(tema.id, alumnoId, correos).subscribe({
      next: (actualizado) => {
        this.temas.set(
          this.temas().map((t) => (t.id === actualizado.id ? actualizado : t)),
        );
        this.temaParaCupos.set(actualizado);
        this.construirFormularioCupos(actualizado);
        this.gestionCuposMensaje.set('Los cupos del tema fueron actualizados.');
        this.guardandoCompaneros.set(false);
      },
      error: (err) => {
        console.error('No fue posible actualizar los cupos', err);
        const error = err?.error;
        if (error?.errores) {
          const mensajes = Object.values(error.errores as Record<string, string>);
          this.gestionCuposError.set(mensajes.join(' '));
        } else if (error?.detail) {
          this.gestionCuposError.set(String(error.detail));
        } else {
          this.gestionCuposError.set('No fue posible actualizar los cupos. Intenta nuevamente.');
        }
        this.guardandoCompaneros.set(false);
      },
    });
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
        if (this.puedeMostrarGestionCupos(actualizado)) {
          this.abrirGestionCupos(actualizado);
        }
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

  ajustarCompanerosPorCupos() {
    const cupos = Number(this.postulacionForm.get('cupos')?.value ?? 1);
    const max = Math.max(cupos - 1, 0);
    while (this.companerosPostulacion.length > max) {
      this.companerosPostulacion.removeAt(this.companerosPostulacion.length - 1);
    }
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

    this.ajustarCompanerosPorCupos();

    const preferenciasValores = [
      this.postulacionForm.value.prof1,
      this.postulacionForm.value.prof2,
      this.postulacionForm.value.prof3,
    ].filter((v): v is string | number => v !== null && v !== '');

    const preferencias = preferenciasValores.map((id) => Number(id));
    const perfil = this.currentUserService.getProfile();
    const cuposRequeridos = Number(this.postulacionForm.value.cupos ?? 1);

    const correosSet = new Set<string>();
    const correoPropio = perfil?.correo?.toLowerCase() ?? null;
    const companerosValidos: string[] = [];
    const maxCompaneros = Math.max(cuposRequeridos - 1, 0);

    for (const control of this.companerosPostulacion.controls) {
      const valor = (control.value ?? '').trim();
      if (!valor) {
        continue;
      }
      const normalizado = valor.toLowerCase();
      if ((correoPropio && normalizado === correoPropio) || correosSet.has(normalizado)) {
        continue;
      }
      correosSet.add(normalizado);
      companerosValidos.push(valor);
      if (companerosValidos.length >= maxCompaneros) {
        break;
      }
    }

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
        cuposRequeridos,
        correosCompaneros: companerosValidos,
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

  private resetPostulacionForm() {
    this.companerosPostulacion.clear();
    this.postulacionForm.reset({
      titulo: '',
      objetivo: '',
      descripcion: '',
      rama: '',
      prof1: '',
      prof2: '',
      prof3: '',
      cupos: 1,
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

  private construirFormularioCupos(tema: TemaDisponible) {
    const max = Math.max((tema.cupos ?? 1) - 1, 0);
    const existentes = this.obtenerCorreosIntegrantes(tema).slice(0, max);
    const controles = existentes.map((correo) => this.crearCorreoControl(correo));
    if (!controles.length && max > 0) {
      controles.push(this.crearCorreoControl(''));
    }

    const array = this.fb.array<FormControl<string>>(controles);
    this.cuposForm.setControl('correos', array);
  }

  private crearCorreoControl(valor: string): FormControl<string> {
    return this.fb.control<string>(valor, {
      validators: [Validators.email],
      nonNullable: true,
    });
  }

  private obtenerCorreosIntegrantes(tema: TemaDisponible): string[] {
    const correoActual = this.obtenerAlumnoCorreoActual();
    const actuales = tema.inscripcionesActivas ?? [];
    return actuales
      .map((inscripcion) => inscripcion.correo?.trim() ?? '')
      .filter((correo) => {
        if (!correo) {
          return false;
        }
        if (!correoActual) {
          return true;
        }
        return correo.toLowerCase() !== correoActual.toLowerCase();
      });
  }

  private obtenerAlumnoIdActual(): number | null {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id || perfil.rol !== 'alumno') {
      return null;
    }
    return perfil.id;
  }

  private obtenerAlumnoCorreoActual(): string | null {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.correo) {
      return null;
    }
    return perfil.correo;
  }
}