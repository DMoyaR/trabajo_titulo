import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CurrentUserService } from '../../../shared/services/current-user.service';

interface Escuela {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}
interface Firma {
  nombre: string;
  cargo: string;
  institucion?: string;
}
interface Documento {
  nombre: string;
  tipo: 'PDF' | 'Carta';
  estado?: 'En revisión' | 'Aprobado' | 'Rechazado';
  url?: string | null;
    detalle?: string | null;
}

type EstadoSolicitud = 'pendiente' | 'aprobado' | 'rechazado';

interface SolicitudCarta {
  id: string;
  creadoEn: string;
  estado: EstadoSolicitud;
  url: string | null;
  motivoRechazo?: string | null;
  alumno: {
    rut: string;
    nombres: string;
    apellidos: string;
    carrera: string;
  };
  practica: {
    jefeDirecto: string;
    cargoAlumno: string;
    fechaInicio: string;
    empresaRut: string;
    sectorEmpresa: string;
    duracionHoras: number;
  };
  destinatario: {
    nombres: string;
    apellidos: string;
    cargo: string;
    empresa: string;
  };
  escuela: Escuela;
  meta?: Record<string, unknown>;
}

function monthNameES(m: number): string {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return months[m] || '';
}
function formatCartaFecha(d: Date): string {
  return `Santiago, ${monthNameES(d.getMonth())} ${d.getDate()} del ${d.getFullYear()}.`;
}

// ==== Utilidades de RUT (Chile) ====
function limpiarRut(rut: string): string {
  return (rut || '').toUpperCase().replace(/[^0-9K]/g, '');
}
function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut);
  if (!limpio) return '';
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let r = '';
  let i = 0;
  for (let j = cuerpo.length - 1; j >= 0; j--) {
    r = cuerpo[j] + r;
    i++;
    if (i % 3 === 0 && j !== 0) r = '.' + r;
  }
  return (cuerpo ? r + '-' : '') + dv;
}
function calcularDV(cuerpo: string): string {
  let suma = 0, multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const res = 11 - (suma % 11);
  if (res === 11) return '0';
  if (res === 10) return 'K';
  return String(res);
}
function validarRutStr(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return calcularDV(cuerpo) === dv;
}
function rutValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return { required: true };
    return validarRutStr(val) ? null : { rutInvalido: true };
  };
}

@Component({
  selector: 'alumno-practica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './alumno-practica.component.html',
  styleUrls: ['./alumno-practica.component.css'],
})
export class AlumnoPracticaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private readonly currentUserService = inject(CurrentUserService);

  // ===== Estado envío =====
  isSubmitting = signal(false);
  submitOk = signal<string | null>(null);
  submitError = signal<string | null>(null);

  // ===== Pantalla base =====
  indicadores = signal([
    { etapa: 'Inicio', pct: 25 },
    { etapa: 'Entrega', pct: 60 },
    { etapa: 'Evaluación', pct: 80 },
    { etapa: 'Cierre', pct: 10 },
  ]);

  private readonly baseDocumentos: Documento[] = [
    { nombre: 'Certificado de práctica', tipo: 'PDF', estado: 'Aprobado', url: '/docs/certificado-practica.pdf' },
    { nombre: 'Certificado de cumplimiento', tipo: 'PDF', estado: 'Aprobado', url: '/docs/certificado-cumplimiento.pdf' },
  ];
  documentos = signal<Documento[]>([...this.baseDocumentos]);

  solicitudes = signal<SolicitudCarta[]>([]);
  solicitudesLoading = signal(false);
  solicitudesError = signal<string | null>(null);

  private alumnoRut: string | null = null;

  // ===== Modal incrustado =====
  showCarta = signal(false);
  openCarta()  { this.showCarta.set(true); document.body.classList.add('no-scroll'); this.submitOk.set(null); this.submitError.set(null); }
  closeCarta() { this.showCarta.set(false); document.body.classList.remove('no-scroll'); }

  // ===== Catálogos =====
  escuelas: Escuela[] = [
    { id: 'inf',  nombre: 'Escuela de Informática',           direccion: 'José Pedro Alessandri 1242, Ñuñoa', telefono: '(+56-2) 2787 7100' },
    { id: 'ind',  nombre: 'Escuela de Industria',             direccion: 'José Pedro Alessandri 1242, Ñuñoa', telefono: '(+56-2) 2787 7073 – 2787 7196' },
    { id: 'elec', nombre: 'Escuela de Electrónica',           direccion: 'José Pedro Alessandri 1242, Ñuñoa', telefono: '(+56-2) 2787 7034' },
    { id: 'mec',  nombre: 'Escuela de Mecánica',              direccion: 'José Pedro Alessandri 1242, Ñuñoa', telefono: '(+56-2) 2787 7169 – 2787 7039 – 2787 7045' },
    { id: 'geo',  nombre: 'Escuela de Geomensura',            direccion: 'José Pedro Alessandri 1242, Ñuñoa', telefono: '(+56-2) 2787 7111' },
    { id: 'trans',nombre: 'Escuela de Transporte y Tránsito', direccion: 'José Pedro Alessandri 1242, Ñuñoa', telefono: '(+56-2) 2787 7157 – 2787 7030' },
  ];

  sectorOpciones: string[] = [
    'Tecnologías de la Información (TI)',
    'Manufactura',
    'Retail / Comercio',
    'Salud',
    'Banca / Servicios Financieros',
    'Educación',
    'Construcción',
    'Energía / Minería',
    'Transporte / Logística',
    'Sector Público',
    'Otro'
  ];

  todasCarreras: string[] = [
    'Química y Farmacia','Ingeniería Civil Biomédica','Ingeniería Civil Química','Ingeniería Civil Matemática',
    'Bachillerato en Ciencias de la Ingeniería','Dibujante Proyectista','Ingeniería Civil en Ciencia de Datos',
    'Ingeniería Civil en Computación mención Informática','Ingeniería Civil Electrónica','Ingeniería Civil en Mecánica',
    'Ingeniería Civil Industrial','Ingeniería en Biotecnología','Ingeniería en Geomensura','Ingeniería en Alimentos',
    'Ingeniería en Informática','Ingeniería Industrial','Química Industrial','Ingeniería Electrónica'
  ];

  private readonly carreraAliasMap: Record<string, string> = {
    'Ing. Civil Biomédica': 'Ingeniería Civil Biomédica',
    'Ing. Civil Química': 'Ingeniería Civil Química',
    'Ing. Civil Matemática': 'Ingeniería Civil Matemática',
    'Bachillerato en Ciencias de la Ing.': 'Bachillerato en Ciencias de la Ingeniería',
    'Ing. Civil en Ciencia de Datos': 'Ingeniería Civil en Ciencia de Datos',
    'Ing. Civil en Computación mención Informática': 'Ingeniería Civil en Computación mención Informática',
    'Ing. Civil Electrónica': 'Ingeniería Civil Electrónica',
    'Ing. Civil en Mecánica': 'Ingeniería Civil en Mecánica',
    'Ing. Civil Industrial': 'Ingeniería Civil Industrial',
    'Ing. en Biotecnología': 'Ingeniería en Biotecnología',
    'Ing. en Geomensura': 'Ingeniería en Geomensura',
    'Ing. en Alimentos': 'Ingeniería en Alimentos',
    'Ing. en Informática': 'Ingeniería en Informática',
    'Ing. Industrial': 'Ingeniería Industrial',
    'Ing. Electrónica': 'Ingeniería Electrónica',
  };



  carrerasPorEscuela: Record<string, string[]> = {
    inf: ['Ingeniería Civil en Computación mención Informática','Ingeniería en Informática','Ingeniería Civil en Ciencia de Datos'],
    ind: ['Ingeniería Civil Industrial','Ingeniería Industrial','Bachillerato en Ciencias de la Ingeniería','Dibujante Proyectista'],
    elec: ['Ingeniería Civil Electrónica','Ingeniería Electrónica'],
    mec: ['Ingeniería Civil en Mecánica'],
    geo: ['Ingeniería en Geomensura'],
    trans: []
  };

  firmasPorCarrera = {
    'Ingeniería Civil en Computación mención Informática': { nombre:'Víctor Escobar Jeria', cargo:'Director Escuela de Informática y Jefe de Carrera Ingeniería Civil en Computación mención Informática', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería en Informática': { nombre:'Patricia Mellado Acevedo', cargo:'Jefa de Carrera Ingeniería en Informática', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería Civil en Ciencia de Datos': { nombre:'Jorge Vergara Quezada', cargo:'Jefe de Carrera Ingeniería Civil en Ciencia de Datos', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería Civil Industrial': { nombre:'Evelyn Gajardo Gutiérrez', cargo:'Directora Escuela de Industria y Jefa de Carrera Ingeniería Civil Industrial', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería Industrial': { nombre:'Alexis Rufatt Zafira', cargo:'Jefe de Carrera Ingeniería Industrial', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería Civil Electrónica': { nombre:'Patricio Santos López', cargo:'Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería Electrónica': { nombre:'Patricio Santos López', cargo:'Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería Civil en Mecánica': { nombre:'Christian Muñoz Valenzuela', cargo:'Director Escuela de Mecánica', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería en Geomensura': { nombre:'Juan Toledo Ibarra', cargo:'Director Escuela de Geomensura', institucion:'Universidad Tecnologica Metropolitana' },
    'Bachillerato en Ciencias de la Ingeniería': { nombre:'Rafael Loyola Berríos', cargo:'Coordinador del Plan Común de Ingeniería y Jefe de Carrera de Bachillerato en Ciencias de la Ingeniería', institucion:'Universidad Tecnologica Metropolitana' },
    'Dibujante Proyectista': { nombre:'Marcelo Borges Quintanilla', cargo:'Jefe de Carrera Dibujante Proyectista', institucion:'Universidad Tecnologica Metropolitana' },
    'Ingeniería Civil Biomédica': { nombre:'Raúl Caulier Cisterna', cargo:'Jefe de Carrera Ingeniería Civil Biomédica', institucion:'Universidad Tecnologica Metropolitana' }
  } as const;
  firmaFallback: Firma = { nombre: 'Coordinación de Carrera — UTEM', cargo: '' };

  objetivosPorEscuela: Record<string, string[]> = {
    inf: [
      'Interactuar con profesionales del área informática y con otros de áreas relacionadas.',
      'Desarrollar capacidades informáticas que le permitan desenvolverse en el ámbito profesional.',
      'Comprobar empíricamente la importancia de las tecnologías de información.',
      'Participar en el diseño y/o implementación de soluciones informáticas.'
    ],
    ind: [
      'Aplicar metodologías de mejora continua (Lean/Seis Sigma) en procesos productivos o de servicios.',
      'Levantar y analizar indicadores de gestión (KPI), costos y productividad.',
      'Participar en la planificación de la cadena de suministro, logística y gestión de inventarios.',
      'Colaborar en sistemas de gestión de calidad y seguridad industrial.'
    ],
    elec: [
      'Apoyar el diseño, simulación y pruebas de circuitos electrónicos y sistemas embebidos.',
      'Implementar e integrar instrumentación, sensores y adquisición de datos.',
      'Participar en el diseño/ensamble de PCB y protocolos de comunicación.',
      'Aplicar normas de seguridad y estándares eléctricos en laboratorio y terreno.'
    ],
    mec: [
      'Apoyar el diseño y análisis mecánico mediante herramientas CAD/CAE.',
      'Participar en procesos de manufactura, mantenimiento y confiabilidad.',
      'Realizar análisis térmico y de fluidos en equipos/sistemas cuando aplique.',
      'Aplicar normas de seguridad industrial en talleres y plantas.'
    ],
    geo: [
      'Realizar levantamientos topográficos con equipos GNSS/estación total.',
      'Procesar y validar datos geoespaciales para generar planos y modelos.',
      'Aplicar técnicas de georreferenciación, nivelación y replanteo.',
      'Elaborar cartografía y reportes técnicos utilizando SIG.'
    ],
    trans: [
      'Apoyar estudios de tránsito: aforos, velocidad y nivel de servicio.',
      'Analizar y modelar la demanda de transporte para la planificación de rutas.',
      'Colaborar en medidas de seguridad vial e infraestructura asociada.',
      'Contribuir a la gestión operativa del transporte público/privado.'
    ],
  };

  private _objetivosPorCarrera: Record<string, string[]> = {
    'Ingeniería Civil Biomédica': [
      'Apoyar la integración y validación de equipos biomédicos en entornos clínicos.',
      'Aplicar normas y estándares de seguridad (IEC/ISO) y gestión de riesgos clínicos.',
      'Desarrollar y/o mantener sistemas de bioinstrumentación y monitoreo.',
      'Colaborar en interoperabilidad de sistemas de información en salud.'
    ],
    'Ingeniería en Alimentos': [
      'Apoyar el control de calidad bajo BPM y sistema HACCP.',
      'Realizar análisis fisicoquímicos y/o microbiológicos según protocolos.',
      'Participar en mejora de procesos y trazabilidad en planta.',
      'Colaborar en desarrollo o reformulación de productos alimentarios.'
    ],
    'Ingeniería Civil Química': [
      'Participar en operaciones unitarias y control de procesos químicos.',
      'Apoyar en control de calidad y cumplimiento normativo ambiental.',
      'Realizar balances de materia y energía y análisis de datos de planta.',
      'Contribuir a seguridad de procesos y gestión de residuos.'
    ],
    'Química Industrial': [
      'Apoyar en control de calidad y análisis químico instrumental.',
      'Participar en operación/optimización de procesos y seguridad industrial.',
      'Gestionar documentación técnica y cumplimiento normativo.',
      'Colaborar en implementación de mejoras de proceso.'
    ],
    'Ingeniería Civil Matemática': [
      'Aplicar modelamiento matemático a problemas de ingeniería.',
      'Desarrollar análisis estadístico y métodos de optimización.',
      'Implementar soluciones computacionales para simulación numérica.',
      'Elaborar reportes técnicos con interpretación de resultados.'
    ],
    'Ingeniería Civil en Ciencia de Datos': [
      'Adquirir, depurar y preparar datos desde fuentes heterogéneas.',
      'Construir modelos de analítica/aprendizaje supervisado y no supervisado.',
      'Validar y evaluar modelos; comunicar hallazgos con visualizaciones.',
      'Apoyar el despliegue y monitoreo de soluciones de data science.'
    ],
    'Ingeniería en Biotecnología': [
      'Apoyar cultivos, bioprocesos y análisis en laboratorio biotecnológico.',
      'Aplicar normas de bioseguridad y buenas prácticas de laboratorio.',
      'Procesar y analizar datos experimentales para toma de decisiones.',
      'Colaborar en escalamiento o transferencia tecnológica cuando aplique.'
    ],
    'Ingeniería en Geomensura': [
      'Realizar levantamientos topográficos con equipos GNSS/estación total.',
      'Procesar y validar datos geoespaciales para generar planos y modelos.',
      'Aplicar técnicas de georreferenciación, nivelación y replanteo.',
      'Elaborar cartografía y reportes técnicos utilizando SIG.'
    ],
  };

  // ===== Form carta =====
  cartaForm: FormGroup = this.fb.group({
    // Datos para la carta
    alumnoNombres: ['', Validators.required],
    alumnoApellidos: ['', Validators.required],
    alumnoRut: ['', [Validators.required, rutValidator()]],
    escuelaId: ['', Validators.required],
    carrera: ['', Validators.required],
    duracionHoras: [320, Validators.required], // 160 | 320
    destNombres: ['', Validators.required],
    destApellidos: ['', Validators.required],
    destCargo: ['', Validators.required],
    destEmpresa: ['', Validators.required],

    // Datos de la práctica (empresa)
    empresaRut: ['', [Validators.required, rutValidator()]],
    sectorEmpresa: ['', Validators.required], // select
    sectorEmpresaOtro: [''],                  // requerido sólo si sectorEmpresa === 'Otro'
    jefeDirecto: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    cargoAlumno: ['', Validators.required],
  });

  // --- Hace "sectorEmpresaOtro" requerido sólo cuando sectorEmpresa === 'Otro'
  constructor() {
    const sectorCtrl = this.cartaForm.get('sectorEmpresa')!;
    const otroCtrl   = this.cartaForm.get('sectorEmpresaOtro')!;
    // Estado inicial
    otroCtrl.disable({ emitEvent: false });

    sectorCtrl.valueChanges.subscribe((val) => {
      if (val === 'Otro') {
        otroCtrl.enable({ emitEvent: false });
        otroCtrl.setValidators([Validators.required]);
      } else {
        otroCtrl.setValue('', { emitEvent: false });
        otroCtrl.clearValidators();
        otroCtrl.disable({ emitEvent: false });
      }
      otroCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    const storedRutRaw = localStorage.getItem('alumnoRut');
    const storedCarrera = this.normalizarCarrera(localStorage.getItem('alumnoCarrera'));
     

    if (storedRutRaw) {
      const rutFormateado = formatearRut(storedRutRaw);
      this.alumnoRut = rutFormateado;
      this.cartaForm.get('alumnoRut')?.setValue(rutFormateado);
      localStorage.setItem('alumnoRut', rutFormateado);
    }

    if (storedCarrera) {
      this.cartaForm.get('carrera')?.setValue(storedCarrera);
      localStorage.setItem('alumnoCarrera', storedCarrera);
      const escuelaMatch = Object.entries(this.carrerasPorEscuela).find(([, carreras]) => carreras.includes(storedCarrera));
      if (escuelaMatch) {
        this.cartaForm.get('escuelaId')?.setValue(escuelaMatch[0]);
      }  
    }
    this.cargarDatosAlumnoDesdePerfil();
    this.cargarSolicitudes();

  }

  fv = toSignal(this.cartaForm.valueChanges, { initialValue: this.cartaForm.value });
  fechaHoy = computed(() => formatCartaFecha(new Date()));

  carrerasDisponibles = computed(() => {
    const esc = (this.fv().escuelaId || '') as string;
    const list = this.carrerasPorEscuela[esc];
    return (list && list.length) ? list : this.todasCarreras;
  });

  escuelaSel = computed<Escuela | null>(() => {
    const escId = (this.fv().escuelaId || '') as string;
    return this.escuelas.find(e => e.id === escId) || null;
  });

  firmaActual = computed<Firma>(() => {
    const c = (this.fv().carrera || '') as string;
    // @ts-ignore
    return (this.firmasPorCarrera as any)[c] || { ...this.firmaFallback };
  });

  objetivosActuales = computed<string[]>(() => {
    const c = (this.fv().carrera || '') as string;
    const esc = (this.fv().escuelaId || '') as string;
    const porCarrera = this._objetivosPorCarrera[c];
    if (porCarrera && porCarrera.length) return porCarrera;
    const porEscuela = this.objetivosPorEscuela[esc];
    if (porEscuela && porEscuela.length) return porEscuela;
    return [
      'Aplicar conocimientos disciplinares en un contexto profesional real.',
      'Integrarse a equipos de trabajo, comunicando avances y resultados.',
      'Cumplir con normas de seguridad, calidad y medioambiente vigentes.',
      'Elaborar informes técnicos con conclusiones basadas en evidencia.'
    ];
  });

  private cargarDatosAlumnoDesdePerfil(): void {
    const profile = this.currentUserService.getProfile();
    if (!profile || profile.rol !== 'alumno') {
      return;
    }

    const patch: Record<string, unknown> = {};

    if (profile.nombre) {
      const { nombres, apellidos } = this.separarNombreCompleto(profile.nombre);
      patch['alumnoNombres'] = nombres;
      patch['alumnoApellidos'] = apellidos;
    }

    if (profile.rut) {
      const rutFormateado = formatearRut(profile.rut);
      if (rutFormateado) {
        patch['alumnoRut'] = rutFormateado;
        this.alumnoRut = rutFormateado;
        localStorage.setItem('alumnoRut', rutFormateado);
      }
    }

    if (profile.carrera) {
      const carreraPerfil = this.normalizarCarrera(profile.carrera);
      if (carreraPerfil) {
        patch['carrera'] = carreraPerfil;
        localStorage.setItem('alumnoCarrera', carreraPerfil);
        const escuelaMatch = Object.entries(this.carrerasPorEscuela).find(([, carreras]) =>
          carreras.includes(carreraPerfil)
        );
        if (escuelaMatch) {
          patch['escuelaId'] = escuelaMatch[0];
        }
      }
    }

    const keys = Object.keys(patch);
    if (!keys.length) {
      return;
    }

    this.cartaForm.patchValue(patch);
    keys.forEach((key) => {
      const control = this.cartaForm.get(key);
      control?.markAsPristine();
      control?.markAsUntouched();
      control?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private separarNombreCompleto(nombreCompleto: string | null | undefined): { nombres: string; apellidos: string } {
    const limpio = (nombreCompleto ?? '').trim().replace(/\s+/g, ' ');
    if (!limpio) {
      return { nombres: '', apellidos: '' };
    }
    const partes = limpio.split(' ');
    if (partes.length === 1) {
      return { nombres: partes[0], apellidos: '' };
    }
    if (partes.length === 2) {
      return { nombres: partes[0], apellidos: partes[1] };
    }
    return {
      nombres: partes.slice(0, partes.length - 2).join(' '),
      apellidos: partes.slice(-2).join(' '),
    };
  }

  private normalizarCarrera(carrera: string | null | undefined): string {
    const raw = (carrera ?? '').trim();
    if (!raw) {
      return '';
    }
    return this.carreraAliasMap[raw] || raw;
  }

  private cargarSolicitudes(): void {

    this.solicitudesLoading.set(true);
    this.solicitudesError.set(null);

    const params: Record<string, string> = {
      
      page: '1',
      size: '50',
    };
    if (this.alumnoRut) {
      params['alumno_rut'] = this.alumnoRut;
    }


    this.http
      .get<{ items: SolicitudCarta[]; total: number }>('/api/practicas/solicitudes-carta/listar', { params })
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res.items) ? res.items : [];
          this.solicitudes.set(items);
          
          const documentos: Documento[] = [...this.baseDocumentos];

          items
            .filter((solicitud) => solicitud.estado === 'aprobado' && !!solicitud.url)
            .forEach((solicitud) => {
              const fechaCreacion = this.formatFechaCorta(solicitud.creadoEn);
              const nombreCarta =
                fechaCreacion && fechaCreacion !== '—'
                  ? `Carta de práctica aprobada — ${fechaCreacion}`
                  : 'Carta de práctica aprobada';
              const detalle = solicitud.destinatario.cargo
                ? `Dirigida a ${solicitud.destinatario.empresa}. Cargo: ${solicitud.destinatario.cargo}.`
                : `Dirigida a ${solicitud.destinatario.empresa}.`;

              documentos.push({
                nombre: nombreCarta,
                tipo: 'Carta',
                estado: 'Aprobado',
                url: solicitud.url,
                detalle,
              });
            });

          this.documentos.set(documentos);
          
          if (!this.alumnoRut) {
            const firstRut = items.find((sol) => sol?.alumno?.rut)?.alumno?.rut;
            if (firstRut) {
              const rutFormateado = formatearRut(firstRut);
              this.alumnoRut = rutFormateado;
              localStorage.setItem('alumnoRut', rutFormateado);
              this.cartaForm.get('alumnoRut')?.setValue(rutFormateado, { emitEvent: false });
            }
          }
          this.solicitudesLoading.set(false);
        },
        error: (err) => {
          console.error('Error cargando solicitudes:', err);
          this.solicitudes.set([]);
          this.solicitudesError.set('No se pudieron cargar tus solicitudes de carta.');
          this.documentos.set([...this.baseDocumentos]);
          this.solicitudesLoading.set(false);
        },
      });
  }


  estadoEtiqueta(estado: EstadoSolicitud): Documento['estado'] {
    return this.estadoDocumento(estado);
  }

  estadoChipClase(estado: EstadoSolicitud): string {
    const etiqueta = this.estadoDocumento(estado);
    switch (etiqueta) {
      case 'Aprobado':
        return 'chip-ok';
      case 'Rechazado':
        return 'chip-bad';
      default:
        return 'chip-warn';
    }
  }

  formatFecha(fechaIso: string | null | undefined): string {
    if (!fechaIso) return '—';
    const date = new Date(fechaIso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatFechaCorta(fechaIso: string | null | undefined): string {
    if (!fechaIso) return '—';
    const date = new Date(fechaIso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }


  private estadoDocumento(estado: EstadoSolicitud): Documento['estado'] {
    switch (estado) {
      case 'aprobado':
        return 'Aprobado';
      case 'rechazado':
        return 'Rechazado';
      default:
        return 'En revisión';
    }
  }


  // Sector resuelto (si eligen "Otro", usa el texto)
  sectorResuelto = computed(() => {
    const v = this.fv();
    const otro = (this.cartaForm.get('sectorEmpresaOtro')?.enabled ? (v.sectorEmpresaOtro || '').trim() : '');
    return (v.sectorEmpresa === 'Otro' && otro) ? otro : v.sectorEmpresa;
  });

  prev = computed(() => {
    const v = this.fv();
    const esc = this.escuelaSel();
    return {
      alumnoNombres: v.alumnoNombres || '—',
      alumnoApellidos: v.alumnoApellidos || '',
      alumnoRut: formatearRut(v.alumnoRut || ''),
      carrera: v.carrera || '—',
      duracionHoras: v.duracionHoras || 320,
      escuelaNombre: esc?.nombre || 'Escuela',
      escuelaDireccion: esc?.direccion || '—',
      escuelaTelefono: esc?.telefono || '—',
      destNombres: v.destNombres || '—',
      destApellidos: v.destApellidos || '',
      destCargo: v.destCargo || 'Cargo',
      destEmpresa: v.destEmpresa || 'Empresa'
    };
  });

  // Máscara de RUT al salir del campo
  onRutBlur(controlName: 'alumnoRut' | 'empresaRut') {
    const ctrl = this.cartaForm.get(controlName);
    if (!ctrl) return;
    const f = formatearRut(ctrl.value || '');
    ctrl.setValue(f, { emitEvent: true });
    ctrl.updateValueAndValidity();
  }

  // ===== Envío =====
  enviarAprobacion() {
    this.submitOk.set(null);
    this.submitError.set(null);

    if (this.cartaForm.invalid || !this.escuelaSel()) {
      this.cartaForm.markAllAsTouched();
      this.submitError.set('Revisa los campos obligatorios.');
      return;
    }

    const v = this.fv();
    const payload = {
      alumno: {
        rut: formatearRut(v.alumnoRut!),
        nombres: v.alumnoNombres!,
        apellidos: v.alumnoApellidos!,
        carrera: v.carrera!,
      },
      practica: {
        jefeDirecto: v.jefeDirecto!,
        cargoAlumno: v.cargoAlumno!,
        fechaInicio: v.fechaInicio!,
        empresaRut: formatearRut(v.empresaRut!),
        sectorEmpresa: this.sectorResuelto(),
        duracionHoras: v.duracionHoras!,
      },
      destinatario: {
        nombres: v.destNombres!,
        apellidos: v.destApellidos!,
        cargo: v.destCargo!,
        empresa: v.destEmpresa!,
      },
      escuela: this.escuelaSel()!,
      meta: { tipo: 'carta-practica', creadoEn: new Date().toISOString() },
    };

    this.alumnoRut = payload.alumno.rut;
    localStorage.setItem('alumnoRut', payload.alumno.rut);
    localStorage.setItem('alumnoCarrera', payload.alumno.carrera);
    this.cartaForm.get('alumnoRut')?.setValue(payload.alumno.rut, { emitEvent: true });
    this.cartaForm.get('carrera')?.setValue(payload.alumno.carrera, { emitEvent: true });

    this.isSubmitting.set(true);

    // ⚠️ Ajusta la URL a tu backend real si es distinta
    this.http.post('/api/practicas/solicitudes-carta', payload).subscribe({
      next: () => {
        this.submitOk.set('Solicitud enviada a Coordinación.');

        this.cargarSolicitudes();

        this.isSubmitting.set(false);
        this.closeCarta();
      },
      error: (err) => {
        console.error('Error enviando solicitud:', err);
        this.submitError.set('No se pudo enviar. Inténtalo nuevamente.');
        this.isSubmitting.set(false);
      }
    });
  }

  // Helper para template (acceso corto a controles)
  f(name: string): AbstractControl {
    return this.cartaForm.get(name)!;
  }
}