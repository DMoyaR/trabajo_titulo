import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import jsPDF from 'jspdf';
import { CurrentUserService } from '../../../shared/services/current-user.service';

type Estado = 'pendiente' | 'aprobado' | 'rechazado';

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

interface SolicitudCarta {
  id: string;
  creadoEn: string;
  alumno: {
    rut: string;
    nombres: string;
    apellidos: string;
    carrera: string;
  };
  practica: {
    jefeDirecto: string;
    correoEncargado: string;
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
  estado: Estado;
  url?: string | null;
  motivoRechazo?: string | null;
  meta?: Record<string, unknown> | null;
}

interface AprobarSolicitudResponse {
  status: string;
  url?: string | null;
}

interface DocumentoCompartidoApi {
  id: number;
  nombre: string;
  descripcion?: string | null;
  carrera: string;
  created_at: string;
  url: string | null;
  uploadedBy?: { id: number; nombre: string; correo: string } | null;
}

interface EvaluacionPracticaApi {
  id: number;
  nombre: string;
  descripcion?: string | null;
  carrera: string;
  created_at: string;
  url: string | null;
}

interface DocumentoCompartido {
  id: number;
  nombre: string;
  descripcion?: string | null;
  createdAt: string;
  url: string | null;
}

interface EvaluacionPractica {
  id: number;
  nombre: string;
  descripcion?: string | null;
  createdAt: string;
  url: string | null;
}

interface PracticaEvaluacionEntrega {
  id: number;
  createdAt: string;
  nota: string;
  archivoUrl: string | null;
  archivoNombre: string;
  empresa: string;
  alumno: { id: number; nombre: string; correo: string; carrera: string } | null;
  evaluacion?: EvaluacionPractica | null;
}
interface FirmaCoordinadorApi {
  id: number;
  carrera: string;
  created_at: string;
  updated_at: string;
  url: string | null;
  url_firma_digital?: string | null;
  uploadedBy?: { id: number; nombre: string; correo: string } | null;
}

interface FirmaCoordinador {
  id: number;
  carrera: string;
  createdAt: string;
  updatedAt: string;
  url: string | null;
  urlFirmaDigital: string | null;
}

interface CartaPreviewData {
  alumnoNombres: string;
  alumnoApellidos: string;
  alumnoRut: string;
  carrera: string;
  duracionHoras: number;
  fechaInicio: string;
  escuelaNombre: string;
  escuelaDireccion: string;
  escuelaTelefono: string;
  destNombres: string;
  destApellidos: string;
  destCargo: string;
  destEmpresa: string;
}

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
    if (i % 3 === 0 && j !== 0) {
      r = '.' + r;
    }
  }
  return (cuerpo ? r + '-' : '') + dv;
}

@Component({
  selector: 'app-practicas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './practicas.component.html',
  styleUrls: ['./practicas.component.css'],
})
export class PracticasComponent {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private currentUserService = inject(CurrentUserService);

  private coordinadorId: number | null = null;
  isCoordinador = false;
  coordinadorCarrera: string | null = null;


  @ViewChild('archivoInput') archivoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('firmaInput') firmaInput?: ElementRef<HTMLInputElement>;
  @ViewChild('evaluacionInput') evaluacionInput?: ElementRef<HTMLInputElement>;

  documentosCompartidos = signal<DocumentoCompartido[]>([]);
  documentosLoading = signal(false);
  documentosError = signal<string | null>(null);
  documentoUploadError = signal<string | null>(null);
  gestionDocumentoLoading = signal(false);

  evaluacion = signal<EvaluacionPractica | null>(null);
  evaluacionLoading = signal(false);
  evaluacionError = signal<string | null>(null);
  evaluacionUploadError = signal<string | null>(null);
  evaluacionGestionLoading = signal(false);
  evaluacionArchivoNombre = signal<string | null>(null);
  private evaluacionArchivoSeleccionado: File | null = null;
  entregasEvaluacion = signal<PracticaEvaluacionEntrega[]>([]);
  entregasEvaluacionLoading = signal(false);
  entregasEvaluacionError = signal<string | null>(null);
  notasEdicion = signal<Record<number, string | undefined>>({});
  guardandoNotas = signal<Record<number, boolean>>({});
  notaErrores = signal<Record<number, string | null>>({});

  
  firmaCoordinador = signal<FirmaCoordinador | null>(null);
  firmaLoading = signal(false);
  firmaError = signal<string | null>(null);
  firmaUploadError = signal<string | null>(null);
  firmaGestionLoading = signal(false);
  firmaArchivoNombre = signal<string | null>(null);
  private firmaArchivoSeleccionado: File | null = null;
  firmaUrlError = signal<string | null>(null);
  firmaUrlLoading = signal(false);

  aprobarUrlError = signal<string | null>(null);

  private logoHeaderDataUrl: string | null = null;
  private logoHeaderPromise: Promise<string | null> | null = null;

  documentoForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });
  archivoNombre = signal<string | null>(null);
  private archivoSeleccionado: File | null = null;

  evaluacionForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  estado = signal<Estado>('pendiente');
  query = signal<string>('');
  page = signal(1);
  size = signal(10);
  total = signal(0);

  loading = signal(false);
  error = signal<string | null>(null);
  toast = signal<string | null>(null);

  solicitudes = signal<SolicitudCarta[]>([]);
  current = signal<SolicitudCarta | null>(null);
  showDetalle = signal(false);

  aprobarForm = this.fb.group({ urlFirmado: [''] });
  rechazarForm = this.fb.group({ motivo: ['', Validators.required] });

  firmaUrlForm = this.fb.group({ urlFirmaDigital: [''] });

  firmasPorCarrera: Record<string, Firma> = {
    'Ingeniería Civil en Computación mención Informática': {
      nombre: 'Víctor Escobar Jeria',
      cargo:
        'Director Escuela de Informática y Jefe de Carrera Ingeniería Civil en Computación mención Informática',
      institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería en Informática': {
      nombre: 'Patricia Mellado Acevedo',
      cargo: 'Jefa de Carrera Ingeniería en Informática',
      institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería Civil en Ciencia de Datos': {
      nombre: 'Jorge Vergara Quezada',
      cargo: 'Jefe de Carrera Ingeniería Civil en Ciencia de Datos',
      institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería Civil Industrial': {
      nombre: 'Evelyn Gajardo Gutiérrez',
      cargo: 'Directora Escuela de Industria y Jefa de Carrera Ingeniería Civil Industrial',
      institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería Industrial': {
      nombre: 'Alexis Rufatt Zafira',
      cargo: 'Jefe de Carrera Ingeniería Industrial',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería Civil Electrónica': {
      nombre: 'Patricio Santos López',
      cargo: 'Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería Electrónica': {
      nombre: 'Patricio Santos López',
      cargo: 'Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería Civil en Mecánica': {
      nombre: 'Christian Muñoz Valenzuela',
      cargo: 'Director Escuela de Mecánica',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería en Geomensura': {
      nombre: 'Juan Toledo Ibarra',
      cargo: 'Director Escuela de Geomensura',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Bachillerato en Ciencias de la Ingeniería': {
      nombre: 'Rafael Loyola Berríos',
      cargo: 'Coordinador del Plan Común de Ingeniería y Jefe de Carrera de Bachillerato en Ciencias de la Ingeniería',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Dibujante Proyectista': {
      nombre: 'Marcelo Borges Quintanilla',
      cargo: 'Jefe de Carrera Dibujante Proyectista',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
    'Ingeniería Civil Biomédica': {
      nombre: 'Raúl Caulier Cisterna',
      cargo: 'Jefe de Carrera Ingeniería Civil Biomédica',
            institucion: 'Universidad Tecnológica Metropolitana',
    },
  };

  objetivosPorEscuela: Record<string, string[]> = {
    inf: [
      'Interactuar con profesionales del área informática y con otros de áreas relacionadas.',
      'Desarrollar capacidades informáticas que le permitan desenvolverse en el ámbito profesional.',
      'Comprobar empíricamente la importancia de las tecnologías de información.',
      'Participar en el diseño y/o implementación de soluciones informáticas.',
    ],
    ind: [
      'Aplicar metodologías de mejora continua (Lean/Seis Sigma) en procesos productivos o de servicios.',
      'Levantar y analizar indicadores de gestión (KPI), costos y productividad.',
      'Participar en la planificación de la cadena de suministro, logística y gestión de inventarios.',
      'Colaborar en sistemas de gestión de calidad y seguridad industrial.',
    ],
    elec: [
      'Apoyar el diseño, simulación y pruebas de circuitos electrónicos y sistemas embebidos.',
      'Implementar e integrar instrumentación, sensores y adquisición de datos.',
      'Participar en el diseño/ensamble de PCB y protocolos de comunicación.',
      'Aplicar normas de seguridad y estándares eléctricos en laboratorio y terreno.',
    ],
    mec: [
      'Apoyar el diseño y análisis mecánico mediante herramientas CAD/CAE.',
      'Participar en procesos de manufactura, mantenimiento y confiabilidad.',
      'Realizar análisis térmico y de fluidos en equipos/sistemas cuando aplique.',
      'Aplicar normas de seguridad industrial en talleres y plantas.',
    ],
    geo: [
      'Realizar levantamientos topográficos con equipos GNSS/estación total.',
      'Procesar y validar datos geoespaciales para generar planos y modelos.',
      'Aplicar técnicas de georreferenciación, nivelación y replanteo.',
      'Elaborar cartografía y reportes técnicos utilizando SIG.',
    ],
    trans: [
      'Apoyar estudios de tránsito: aforos, velocidad y nivel de servicio.',
      'Analizar y modelar la demanda de transporte para la planificación de rutas.',
      'Colaborar en medidas de seguridad vial e infraestructura asociada.',
      'Contribuir a la gestión operativa del transporte público/privado.',
    ],
  };

  private objetivosPorCarrera: Record<string, string[]> = {
    'Ingeniería Civil Biomédica': [
      'Apoyar la integración y validación de equipos biomédicos en entornos clínicos.',
      'Aplicar normas y estándares de seguridad (IEC/ISO) y gestión de riesgos clínicos.',
      'Desarrollar y/o mantener sistemas de bioinstrumentación y monitoreo.',
      'Colaborar en interoperabilidad de sistemas de información en salud.',
    ],
    'Ingeniería en Alimentos': [
      'Apoyar el control de calidad bajo BPM y sistema HACCP.',
      'Realizar análisis fisicoquímicos y/o microbiológicos según protocolos.',
      'Participar en mejora de procesos y trazabilidad en planta.',
      'Colaborar en desarrollo o reformulación de productos alimentarios.',
    ],
    'Ingeniería Civil Química': [
      'Participar en operaciones unitarias y control de procesos químicos.',
      'Apoyar en control de calidad y cumplimiento normativo ambiental.',
      'Realizar balances de materia y energía y análisis de datos de planta.',
      'Contribuir a seguridad de procesos y gestión de residuos.',
    ],
    'Química Industrial': [
      'Apoyar en control de calidad y análisis químico instrumental.',
      'Participar en operación/optimización de procesos y seguridad industrial.',
      'Gestionar documentación técnica y cumplimiento normativo.',
      'Colaborar en implementación de mejoras de proceso.',
    ],
    'Ingeniería Civil Matemática': [
      'Aplicar modelamiento matemático a problemas de ingeniería.',
      'Desarrollar análisis estadístico y métodos de optimización.',
      'Implementar soluciones computacionales para simulación numérica.',
      'Elaborar reportes técnicos con interpretación de resultados.',
    ],
    'Ingeniería Civil en Ciencia de Datos': [
      'Adquirir, depurar y preparar datos desde fuentes heterogéneas.',
      'Construir modelos de analítica/aprendizaje supervisado y no supervisado.',
      'Validar y evaluar modelos; comunicar hallazgos con visualizaciones.',
      'Apoyar el despliegue y monitoreo de soluciones de data science.',
    ],
    'Ingeniería en Biotecnología': [
      'Apoyar cultivos, bioprocesos y análisis en laboratorio biotecnológico.',
      'Aplicar normas de bioseguridad y buenas prácticas de laboratorio.',
      'Procesar y analizar datos experimentales para toma de decisiones.',
      'Colaborar en escalamiento o transferencia tecnológica cuando aplique.',
    ],
    'Ingeniería en Geomensura': [
      'Realizar levantamientos topográficos con equipos GNSS/estación total.',
      'Procesar y validar datos geoespaciales para generar planos y modelos.',
      'Aplicar técnicas de georreferenciación, nivelación y replanteo.',
      'Elaborar cartografía y reportes técnicos utilizando SIG.',
    ],
  };

  private objetivosGenericos: string[] = [
    'Aplicar conocimientos disciplinares en un contexto profesional real.',
    'Integrarse a equipos de trabajo, comunicando avances y resultados.',
    'Cumplir con normas de seguridad, calidad y medioambiente vigentes.',
    'Elaborar informes técnicos con conclusiones basadas en evidencia.',
  ];


  private firmaFallback: Firma = {
    nombre: 'Coordinación de Carrera — UTEM',
    cargo: '',
          institucion: 'Universidad Tecnológica Metropolitana',
  };

  // ====== Cargar datos ======
  ngOnInit() {
    const profile = this.currentUserService.getProfile();
    this.isCoordinador = profile?.rol === 'coordinador';
    this.coordinadorId = this.isCoordinador ? profile?.id ?? null : null;
    this.coordinadorCarrera = this.isCoordinador ? profile?.carrera ?? null : null;

    this.cargarSolicitudes();

    if (this.coordinadorId !== null) {
      // Documentos compartidos
      this.cargarDocumentosCompartidos();
      this.cargarEntregasEvaluacion();
      //cargar firma apenas se monta el componente
      this.cargarFirmaCoordinador();
    } else {
      this.documentosCompartidos.set([]);
      this.firmaCoordinador.set(null);
    }
  }

  // ====== Documentos oficiales ======
  cargarDocumentosCompartidos() {
    if (this.coordinadorId === null) {
      this.documentosCompartidos.set([]);
      return;
    }

    this.documentosLoading.set(true);
    this.documentosError.set(null);

    this.http
      .get<{ items: DocumentoCompartidoApi[]; total: number }>(
        '/api/coordinacion/practicas/documentos/',
        {
          params: { coordinador: String(this.coordinadorId) },
        }
      )
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res.items) ? res.items : [];
          const mapped = items.map((doc) => ({
            id: doc.id,
            nombre: doc.nombre,
            descripcion: doc.descripcion ?? null,
            createdAt: doc.created_at,
            url: doc.url,
          }));
          this.documentosCompartidos.set(mapped);
          this.documentosLoading.set(false);
        },
        error: () => {
          this.documentosError.set('No se pudieron cargar los documentos compartidos.');
          this.documentosCompartidos.set([]);
          this.documentosLoading.set(false);
        },
      });
  }

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.archivoSeleccionado = file;
    this.documentoUploadError.set(null);
    this.archivoNombre.set(file ? file.name : null);

    if (file) {
      const nombreCtrl = this.documentoForm.get('nombre');
      if (nombreCtrl && !nombreCtrl.value) {
        nombreCtrl.setValue(file.name);
      }
    }
  }

  subirDocumento() {
    if (this.coordinadorId === null) {
      this.toast.set('No se encontró información del coordinador.');
      return;
    }

    if (!this.archivoSeleccionado) {
      this.documentoUploadError.set('Selecciona un archivo para compartir.');
      return;
    }

    if (this.documentoForm.invalid) {
      this.documentoForm.markAllAsTouched();
      return;
    }

    const formValue = this.documentoForm.value;
    const formData = new FormData();
    formData.append('coordinador', String(this.coordinadorId));
    formData.append('archivo', this.archivoSeleccionado);
    formData.append('nombre', formValue.nombre || this.archivoSeleccionado.name);
    if (formValue.descripcion) {
      formData.append('descripcion', formValue.descripcion);
    }

    this.gestionDocumentoLoading.set(true);
    this.http
      .post<DocumentoCompartidoApi>('/api/coordinacion/practicas/documentos/', formData)
      .subscribe({
        next: (res) => {
          const nuevo: DocumentoCompartido = {
            id: res.id,
            nombre: res.nombre,
            descripcion: res.descripcion ?? null,
            createdAt: res.created_at,
            url: res.url,
          };
          this.documentosCompartidos.update((docs) => [nuevo, ...docs]);
          this.toast.set('Documento compartido correctamente.');
          this.limpiarFormularioDocumento();
          this.gestionDocumentoLoading.set(false);
        },
        error: () => {
          this.toast.set('No se pudo subir el documento.');
          this.gestionDocumentoLoading.set(false);
        },
      });
  }

  limpiarFormularioDocumento() {
    this.documentoForm.reset();
    this.archivoSeleccionado = null;
    this.documentoUploadError.set(null);
    this.archivoNombre.set(null);
    if (this.archivoInput?.nativeElement) {
      this.archivoInput.nativeElement.value = '';
    }
  }

  eliminarDocumento(id: number) {
    if (this.coordinadorId === null) {
      return;
    }

    this.gestionDocumentoLoading.set(true);
    this.http
      .delete(`/api/coordinacion/practicas/documentos/${id}/`, {
        params: { coordinador: String(this.coordinadorId) },
      })
      .subscribe({
        next: () => {
          this.documentosCompartidos.update((docs) => docs.filter((doc) => doc.id !== id));
          this.toast.set('Documento eliminado.');
          this.gestionDocumentoLoading.set(false);
        },
        error: () => {
          this.toast.set('No se pudo eliminar el documento.');
          this.gestionDocumentoLoading.set(false);
        },
      });
  }

  // ====== Evaluación práctica ======
  cargarEvaluacion() {
    if (this.coordinadorId === null) {
      this.evaluacion.set(null);
      return;
    }

    this.evaluacionLoading.set(true);
    this.evaluacionError.set(null);

    this.http
      .get<{ item: EvaluacionPracticaApi | null }>(`/api/coordinacion/practicas/evaluacion/`, {
        params: { coordinador: String(this.coordinadorId) },
      })
      .subscribe({
        next: (res) => {
          const item = res?.item ?? null;
          this.evaluacion.set(
            item
              ? {
                  id: item.id,
                  nombre: item.nombre,
                  descripcion: item.descripcion ?? null,
                  createdAt: item.created_at,
                  url: item.url,
                }
              : null
          );
          this.evaluacionLoading.set(false);
        },
        error: () => {
          this.evaluacionError.set('No se pudo cargar la evaluación de práctica.');
          this.evaluacion.set(null);
          this.evaluacionLoading.set(false);
        },
      });
  }

  cargarEntregasEvaluacion() {
    if (this.coordinadorId === null) {
      this.entregasEvaluacion.set([]);
      return;
    }

    this.entregasEvaluacionLoading.set(true);
    this.entregasEvaluacionError.set(null);

    this.http
      .get<{ items: PracticaEvaluacionEntrega[] }>(
        '/api/coordinacion/practicas/evaluacion/entregas/',
        {
          params: { coordinador: String(this.coordinadorId) },
        }
      )
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res.items) ? res.items : [];
          const mapped = items.map((item) => ({
            id: item.id,
            createdAt: item.createdAt || (item as any).created_at || '',
            nota: item.nota ?? '',
            archivoUrl: item.archivoUrl || (item as any).archivo_url || null,
            archivoNombre: item.archivoNombre || (item as any).archivo_nombre || '',
            empresa: item.empresa || '',
            alumno: item.alumno || null,
            evaluacion: item.evaluacion,
          }));

          const notas: Record<number, string> = {};
          const errores: Record<number, string | null> = {};

          mapped.forEach((m) => {
            notas[m.id] = m.nota || '';
            errores[m.id] = null; // sin error al inicio
          });

          this.entregasEvaluacion.set(mapped);
          this.notasEdicion.set(notas);
          this.notaErrores.set(errores);
          this.entregasEvaluacionLoading.set(false);
        },
        error: () => {
          this.entregasEvaluacionError.set(
            'No se pudieron cargar las entregas de los alumnos.'
          );
          this.entregasEvaluacion.set([]);
          this.entregasEvaluacionLoading.set(false);
        },
      });
  }

  onEvaluacionSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.evaluacionArchivoSeleccionado = file;
    this.evaluacionUploadError.set(null);
    this.evaluacionArchivoNombre.set(file ? file.name : null);

    if (file) {
      const nombreCtrl = this.evaluacionForm.get('nombre');
      if (nombreCtrl && !nombreCtrl.value) {
        nombreCtrl.setValue(file.name);
      }
    }
  }

  subirEvaluacion() {
    if (this.coordinadorId === null) {
      this.toast.set('No se encontró información del coordinador.');
      return;
    }

    if (!this.evaluacionArchivoSeleccionado) {
      this.evaluacionUploadError.set('Selecciona el formulario de evaluación.');
      return;
    }

    if (this.evaluacionForm.invalid) {
      this.evaluacionForm.markAllAsTouched();
      return;
    }

    const formValue = this.evaluacionForm.value;
    const formData = new FormData();
    formData.append('coordinador', String(this.coordinadorId));
    formData.append('archivo', this.evaluacionArchivoSeleccionado);
    formData.append('nombre', formValue.nombre || this.evaluacionArchivoSeleccionado.name);
    if (formValue.descripcion) {
      formData.append('descripcion', formValue.descripcion);
    }

    this.evaluacionGestionLoading.set(true);
    this.http.post<EvaluacionPracticaApi>('/api/coordinacion/practicas/evaluacion/', formData).subscribe({
      next: (res) => {
        this.evaluacion.set({
          id: res.id,
          nombre: res.nombre,
          descripcion: res.descripcion ?? null,
          createdAt: res.created_at,
          url: res.url,
        });
        this.toast.set('Evaluación subida y compartida con los alumnos.');
        this.limpiarFormularioEvaluacion();
        this.evaluacionGestionLoading.set(false);
      },
      error: () => {
        this.toast.set('No se pudo subir la evaluación.');
        this.evaluacionGestionLoading.set(false);
      },
    });
  }

  limpiarFormularioEvaluacion() {
    this.evaluacionForm.reset();
    this.evaluacionArchivoSeleccionado = null;
    this.evaluacionUploadError.set(null);
    this.evaluacionArchivoNombre.set(null);
    if (this.evaluacionInput?.nativeElement) {
      this.evaluacionInput.nativeElement.value = '';
    }
  }


  private validarNotaRaw(raw: string): { ok: boolean; normalizada: string | null } {
    if (!raw) {
      return { ok: false, normalizada: null };
    }

    // Aceptar coma o punto como separador decimal
    const limpio = raw.replace(',', '.').trim();

    // Formato: dígito 1–7, opcional un decimal
    const regex = /^[1-7](\.[0-9])?$/;
    if (!regex.test(limpio)) {
      return { ok: false, normalizada: null };
    }

    const num = Number(limpio);
    if (Number.isNaN(num) || num < 1 || num > 7) {
      return { ok: false, normalizada: null };
    }

    // Siempre guardamos con un decimal, ej: "6.0"
    const normalizada = num.toFixed(1);
    return { ok: true, normalizada };
  }


  onNotaChange(entregaId: number, valor: string) {
    // Guardamos lo que va escribiendo
    this.notasEdicion.update((prev) => ({ ...prev, [entregaId]: valor }));

    // Validamos en tiempo real
    const { ok } = this.validarNotaRaw(valor);
    this.notaErrores.update((prev) => ({
      ...prev,
      [entregaId]: ok ? null : 'La nota debe estar entre 1,0 y 7,0',
    }));
  }

  notaGuardando(entregaId: number): boolean {
    return !!this.guardandoNotas()[entregaId];
  }

  guardarNota(entregaId: number) {
    if (this.coordinadorId === null) {
      this.toast.set('No se encontró información del coordinador.');
      return;
    }

    const raw = (this.notasEdicion()[entregaId] ?? '').trim();
    const { ok, normalizada } = this.validarNotaRaw(raw);

    if (!ok || !normalizada) {
      this.notaErrores.update((prev) => ({
        ...prev,
        [entregaId]: 'La nota debe estar entre 1,0 y 7,0',
      }));
      this.toast.set('La nota debe estar entre 1,0 y 7,0');
      return;
    }

    const nota = normalizada; // aquí ya va algo tipo "6.0"

    this.guardandoNotas.update((prev) => ({ ...prev, [entregaId]: true }));

    this.http
      .patch<PracticaEvaluacionEntrega>(
        `/api/coordinacion/practicas/evaluacion/entregas/${entregaId}/`,
        { nota },
        {
          params: { coordinador: String(this.coordinadorId) },
        }
      )
      .subscribe({
        next: (res) => {
          this.actualizarEntregaLocal(entregaId, res.nota ?? '');
          // limpiamos el error si todo salió bien
          this.notaErrores.update((prev) => ({
            ...prev,
            [entregaId]: null,
          }));
          this.toast.set('Nota guardada.');
          this.guardandoNotas.update((prev) => ({ ...prev, [entregaId]: false }));
        },
        error: () => {
          this.toast.set('No se pudo guardar la nota.');
          this.guardandoNotas.update((prev) => ({ ...prev, [entregaId]: false }));
        },
      });
  }


  private actualizarEntregaLocal(entregaId: number, nota: string) {
    this.entregasEvaluacion.update((items) => {
      const copia = [...items];
      const idx = copia.findIndex((e) => e.id === entregaId);
      if (idx >= 0) {
        copia[idx] = { ...copia[idx], nota };
      }
      return copia;
    });
    this.notasEdicion.update((prev) => ({ ...prev, [entregaId]: nota }));
  }

  descargarCsvEntregas() {
    const filas = this.entregasEvaluacion();
    if (!filas.length) {
      this.toast.set('No hay entregas para exportar.');
      return;
    }

    const encabezados = ['Alumno', 'Empresa', 'Informe', 'Nota', 'Fecha de envío'];
    const contenido = filas
      .map((f) => {
        const cols = [
          f.alumno?.nombre || '',
          f.empresa || '',
          f.archivoNombre || '',
          f.nota || '',
          this.formatFecha(f.createdAt) || f.createdAt || '',
        ];
        return cols
          .map((c) => {
            const safe = c.replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(',');
      })
      .join('\n');

    const csv = `${encabezados.join(',')}\n${contenido}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entregas_evaluacion_practica.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

// ====== Firma del coordinador ======
  cargarFirmaCoordinador() {
    if (this.coordinadorId === null) {
      this.firmaCoordinador.set(null);
      this.firmaUrlForm.patchValue({ urlFirmaDigital: '' });
      return;
    }

    this.firmaLoading.set(true);
    this.firmaError.set(null);

    this.http
      .get<{ item: FirmaCoordinadorApi | null }>(
        '/api/coordinacion/practicas/firma/',
        {
          params: { coordinador: String(this.coordinadorId) },
        }
      )
      .subscribe({
        next: (res) => {
          const item = res?.item ?? null;
          const mapped = item ? this.mapFirmaApi(item) : null;
          this.firmaCoordinador.set(mapped);
          this.firmaUrlForm.patchValue({ urlFirmaDigital: mapped?.urlFirmaDigital || '' });
          this.firmaLoading.set(false);
        },
        error: () => {
          this.firmaError.set('No se pudo cargar la firma del coordinador.');
          this.firmaLoading.set(false);
        },
      });
  }

  onFirmaSeleccionada(event: Event) {
    this.firmaUploadError.set(null);
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      this.firmaArchivoSeleccionado = null;
      this.firmaArchivoNombre.set(null);
      return;
    }

    const tipo = (file.type || '').toLowerCase();
    if (tipo && !tipo.startsWith('image/')) {
      this.firmaUploadError.set('La firma debe ser una imagen (PNG o JPG).');
      this.firmaArchivoSeleccionado = null;
      this.firmaArchivoNombre.set(null);
      return;
    }

    this.firmaArchivoSeleccionado = file;
    this.firmaArchivoNombre.set(file.name);
  }

  subirFirmaCoordinador() {
    if (this.coordinadorId === null) {
      return;
    }

    if (!this.firmaArchivoSeleccionado) {
      this.firmaUploadError.set('Selecciona una imagen de firma.');
      return;
    }

    this.firmaGestionLoading.set(true);
    const formData = new FormData();
    formData.append('coordinador', String(this.coordinadorId));
    formData.append('archivo', this.firmaArchivoSeleccionado);

    this.http
      .post<FirmaCoordinadorApi>('/api/coordinacion/practicas/firma/', formData)
      .subscribe({
        next: (res) => {
          this.firmaCoordinador.set(this.mapFirmaApi(res));
          this.toast.set('Firma guardada correctamente.');
          this.limpiarArchivoFirma();
          this.firmaGestionLoading.set(false);
        },
        error: () => {
          this.firmaUploadError.set('No se pudo guardar la firma.');
          this.firmaGestionLoading.set(false);
        },
      });
  }

  limpiarArchivoFirma() {
    this.firmaArchivoSeleccionado = null;
    this.firmaArchivoNombre.set(null);
    this.firmaUploadError.set(null);
    if (this.firmaInput?.nativeElement) {
      this.firmaInput.nativeElement.value = '';
    }
  }

  guardarFirmaUrl() {
    if (this.coordinadorId === null) {
      return;
    }

    this.firmaUrlError.set(null);

    const urlControl = this.firmaUrlForm.get('urlFirmaDigital');
    const raw = (urlControl?.value as string | null) ?? '';
    const trimmed = raw.trim();

    const formData = new FormData();
    formData.append('coordinador', String(this.coordinadorId));
    formData.append('url_firma_digital', trimmed);

    this.firmaUrlLoading.set(true);

    this.http
      .post<FirmaCoordinadorApi>('/api/coordinacion/practicas/firma/', formData)
      .subscribe({
        next: (res) => {
          const mapped = this.mapFirmaApi(res);
          this.firmaCoordinador.set(mapped);
          this.firmaUrlForm.patchValue({ urlFirmaDigital: mapped.urlFirmaDigital || '' });
          this.toast.set('URL guardada correctamente.');
          this.firmaUrlLoading.set(false);
        },
        error: () => {
          this.firmaUrlError.set('No se pudo guardar la URL de la firma.');
          this.firmaUrlLoading.set(false);
        },
      });
  }


  private mapFirmaApi(api: FirmaCoordinadorApi): FirmaCoordinador {
    return {
      id: api.id,
      carrera: api.carrera,
      createdAt: api.created_at,
      updatedAt: api.updated_at,
      url: api.url,
      urlFirmaDigital: api.url_firma_digital ?? null,
    };
  }




  cargarSolicitudes() {
    this.loading.set(true);
    const params: Record<string, string> = {
      estado: this.estado(),
      q: this.query(),
      page: String(this.page()),
      size: String(this.size()),
    };
    if (this.coordinadorId !== null) {
      params['coordinador'] = String(this.coordinadorId);
    }
    this.http.get<{ items: SolicitudCarta[]; total: number }>(
      '/api/coordinacion/solicitudes-carta',
      { params }
    ).subscribe({
      next: (res) => {
        this.solicitudes.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las solicitudes');
        this.loading.set(false);
      },
    });
  }

  setEstado(est: Estado) {
    this.estado.set(est);
    this.page.set(1);
    this.cargarSolicitudes();
  }

  buscar() {
    this.page.set(1);
    this.cargarSolicitudes();
  }

  nextPage() {
    if (this.page() * this.size() < this.total()) {
      this.page.update((v) => v + 1);
      this.cargarSolicitudes();
    }
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update((v) => v - 1);
      this.cargarSolicitudes();
    }
  }

  // ====== Detalle ======
  abrirDetalle(s: SolicitudCarta) {
    this.current.set(s);
    this.showDetalle.set(true);
    document.body.classList.add('no-scroll');
  }

  cerrarDetalle() {
    this.showDetalle.set(false);
    this.current.set(null);
    document.body.classList.remove('no-scroll');
  }

  
// ====== Acciones ======
async aprobar() {
  // AHORA: este método es "Firmar con imagen"
  const c = this.current();
  if (!c) return;

  let archivo: File;
  try {
    // Genera el PDF usando la firma guardada del coordinador (si existe)
    archivo = await this.generarArchivoCartaPdf(c);
  } catch (err) {
    console.error('No se pudo generar el PDF de la carta.', err);
    this.toast.set('No se pudo generar el archivo PDF de la carta.');
    return;
  }

  const formData = new FormData();
  formData.append('documento', archivo, archivo.name);

  // En esta opción NO usamos la URL, solo firma con imagen
  this.http
    .post<AprobarSolicitudResponse>(
      `/api/coordinacion/solicitudes-carta/${c.id}/aprobar`,
      formData
    )
    .subscribe({
      next: (res) => {
        this.toast.set('Solicitud aprobada correctamente.');
        const nuevaUrl = res?.url ?? null;
        this.actualizarEstadoLocal(c.id, 'aprobado', nuevaUrl);
        this.cerrarDetalle();
      },
      error: (err) => {
        console.error('Error al aprobar solicitud:', err);
        this.toast.set('Error al aprobar solicitud.');
      },
    });
}

async firmarConUrl() {
  const c = this.current();
  if (!c) return;

  // limpiar mensaje de error previo
  this.aprobarUrlError.set(null);

  const rawUrl = this.aprobarForm.value.urlFirmado || '';
  let urlFirmado = rawUrl.trim();

  if (!urlFirmado) {
    const urlGuardada = this.firmaCoordinador()?.urlFirmaDigital?.trim();
    if (urlGuardada) {
      urlFirmado = urlGuardada;
    }
  }

  // ⬇️ ahora marcamos el error en vez de usar toast
  if (!urlFirmado) {
    this.aprobarUrlError.set('Debes ingresar una URL o guardar una URL de firma.');
    return;
  }

  let archivo: File;
  try {
    archivo = await this.generarArchivoCartaPdf(c, urlFirmado);
  } catch (err) {
    console.error('No se pudo generar el PDF de la carta (modo URL).', err);
    this.toast.set('No se pudo generar el archivo PDF de la carta.');
    return;
  }

  const formData = new FormData();
  formData.append('documento', archivo, archivo.name);
  formData.append('url', urlFirmado);

  this.http
    .post<AprobarSolicitudResponse>(
      `/api/coordinacion/solicitudes-carta/${c.id}/aprobar`,
      formData
    )
    .subscribe({
      next: (res) => {
        this.toast.set('Solicitud aprobada correctamente (URL firmada).');
        const nuevaUrl = res?.url ?? null;
        this.actualizarEstadoLocal(c.id, 'aprobado', nuevaUrl);
        this.cerrarDetalle();
      },
      error: (err) => {
        console.error('Error al aprobar solicitud (URL).', err);
        this.toast.set('Error al aprobar solicitud.');
      },
    });
}


rechazar() {
  const c = this.current();
  if (!c) return;

  const motivoCtrl = this.rechazarForm.get('motivo');
  if (!motivoCtrl) return;

  // Limpiar espacios en blanco
  const raw = motivoCtrl.value ?? '';
  const trimmed = raw.trim();

  // Si está vacío o son solo espacios, marcamos como tocado y dejamos que el HTML muestre el mensaje
  if (!trimmed) {
    motivoCtrl.setValue(''); // limpia espacios
    motivoCtrl.markAsTouched();
    return;
  }

  // Por si hay otros validadores en el futuro
  if (this.rechazarForm.invalid) {
    this.rechazarForm.markAllAsTouched();
    return;
  }

  const body = { motivo: trimmed };

  this.http.post(`/api/coordinacion/solicitudes-carta/${c.id}/rechazar`, body).subscribe({
    next: () => {
      this.toast.set('Solicitud rechazada.');
      this.actualizarEstadoLocal(c.id, 'rechazado', null, body.motivo);
      this.cerrarDetalle();
    },
    error: () => this.toast.set('Error al rechazar solicitud.'),
  });
}

  actualizarEstadoLocal(id: string, estado: Estado, url?: string | null, motivo?: string | null) {
    const arr = this.solicitudes();
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) {
      const actualizado = { ...arr[i] };
      actualizado.estado = estado;
      if (url !== undefined) {
        actualizado.url = url;
      }
      if (motivo !== undefined) {
        actualizado.motivoRechazo = motivo;
      }
      arr[i] = actualizado;
      this.solicitudes.set([...arr]);
    }
  }

  formatFecha(fecha: string | null | undefined): string {
    if (!fecha) return '';

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) {
      return fecha;
    }

    return parsed.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    });
  }

  private obtenerObjetivosParaSolicitud(carta: SolicitudCarta | null): string[] {
    if (!carta) {
      return [];
    }

    const carrera = carta.alumno?.carrera || '';
    const escuelaId = carta.escuela?.id || '';

    const porCarrera = this.objetivosPorCarrera[carrera];
    if (porCarrera && porCarrera.length) {
      return porCarrera;
    }

    const porEscuela = this.objetivosPorEscuela[escuelaId];
    if (porEscuela && porEscuela.length) {
      return porEscuela;
    }

    return this.objetivosGenericos;
  }

  private construirCartaPreviewData(carta: SolicitudCarta | null): CartaPreviewData {
    const escuela = carta?.escuela;

    return {
      alumnoNombres: carta?.alumno?.nombres || '—',
      alumnoApellidos: carta?.alumno?.apellidos || '',
      alumnoRut: carta?.alumno?.rut ? formatearRut(carta.alumno.rut) : '—',
      carrera: carta?.alumno?.carrera || '—',
      duracionHoras: carta?.practica?.duracionHoras || 320,
      fechaInicio: this.formatFecha(carta?.practica?.fechaInicio) || '—',
      escuelaNombre: escuela?.nombre || 'Escuela',
      escuelaDireccion: escuela?.direccion || '—',
      escuelaTelefono: escuela?.telefono || '—',
      destNombres: carta?.destinatario?.nombres || '—',
      destApellidos: carta?.destinatario?.apellidos || '',
      destCargo: carta?.destinatario?.cargo || 'Cargo',
      destEmpresa: carta?.destinatario?.empresa || 'Empresa',
    };
  }



  private obtenerFirmaPorCarrera(carrera: string | null | undefined): Firma {
    const clave = carrera || '';
    return this.firmasPorCarrera[clave] || this.firmaFallback;
  }

  private escribirTextoJustificado(
    doc: jsPDF,
    texto: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number {
    if (!texto || !texto.trim()) {
      return y;
    }

    const lineas = doc.splitTextToSize(texto, maxWidth);
    const espacioBase = doc.getTextWidth(' ');

    lineas.forEach((linea: string, index: number) => {
      const lineaLimpia = linea.trim();
      const palabras = lineaLimpia.split(/\s+/).filter(Boolean);
      const esUltimaLinea = index === lineas.length - 1;

      if (!palabras.length) {
        y += lineHeight;
        return;
      }

      if (esUltimaLinea || palabras.length === 1) {
        doc.text(lineaLimpia, x, y);
      } else {
        const espacios = palabras.length - 1;
        const anchoPalabras = palabras.reduce(
          (acc: number, palabra: string) => acc + doc.getTextWidth(palabra),
          0
        );
        const anchoActual = anchoPalabras + espacioBase * espacios;
        const extraPorEspacio = espacios
          ? Math.max(0, (maxWidth - anchoActual) / espacios)
          : 0;

        let cursorX = x;
        palabras.forEach((palabra: string, palabraIndex: number) => {
          doc.text(palabra, cursorX, y);
          if (palabraIndex < espacios) {
            cursorX += doc.getTextWidth(palabra) + espacioBase + extraPorEspacio;
          }
        });
      }

      y += lineHeight;
    });

    return y;
  }


private escribirBullet(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  indent = 6
): number {
  // ancho efectivo para el texto, dejando un margen para la sangría
  const anchoTexto = maxWidth - indent;
  const lineas = doc.splitTextToSize(texto, anchoTexto);

  if (!lineas.length) return y;

  // 1) Primera línea: dibuja el bullet y la primera línea sin justificar (mejor legibilidad)
  doc.text('•', x, y);
  doc.text(lineas[0], x + indent, y);
  y += lineHeight;

  // 2) Líneas de continuación: justificar con el helper que ya tienes
  for (let i = 1; i < lineas.length; i++) {
    y = this.escribirTextoJustificado(doc, lineas[i], x + indent, y, anchoTexto, lineHeight);
  }

  return y;
}


  private async cargarLogoHeader(): Promise<string | null> {
    if (this.logoHeaderDataUrl) {
      return this.logoHeaderDataUrl;
    }

    if (this.logoHeaderPromise) {
      return this.logoHeaderPromise;
    }

    this.logoHeaderPromise = fetch('/assets/Logo_Header.png')
      .then(async (resp) => {
        if (!resp.ok) {
          throw new Error('No se pudo cargar el logo del encabezado');
        }

        const blob = await resp.blob();

        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('No se pudo leer el logo del encabezado'));
          reader.readAsDataURL(blob);
        });
      })
      .then((dataUrl) => {
        this.logoHeaderDataUrl = dataUrl;
        return dataUrl;
      })
      .catch((err) => {
        console.error('No se pudo preparar el logo de la carta de práctica.', err);
        return null;
      })
      .finally(() => {
        this.logoHeaderPromise = null;
      });

    return this.logoHeaderPromise;
  }

 private async cargarImagenFirma(
    url: string
  ): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error('No se pudo cargar la imagen de la firma');
      }

      const blob = await resp.blob();
      const mime = (blob.type || '').toLowerCase();
      const format: 'PNG' | 'JPEG' =
        mime.includes('jpeg') || mime.includes('jpg') ? 'JPEG' : 'PNG';

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen de la firma'));
        reader.readAsDataURL(blob);
      });

      return { dataUrl, format };
    } catch (err) {
      console.error('Error preparando la firma del coordinador:', err);
      return null;
    }
  }



private async generarArchivoCartaPdf(
  solicitud: SolicitudCarta,
  firmaUrl?: string | null
): Promise<File> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const preview = this.construirCartaPreviewData(solicitud);
  const objetivos = this.obtenerObjetivosParaSolicitud(solicitud);
  const firma = this.obtenerFirmaPorCarrera(solicitud.alumno?.carrera);
  const fechaTexto = this.fechaHoy();

  // Firma gráfica del coordinador (si existe y corresponde usar imagen)
  const firmaCoord = this.firmaCoordinador();
  const firmaFuente = firmaUrl?.trim() || firmaCoord?.url || null;
  const firmaImagen = firmaFuente
    ? await this.cargarImagenFirma(firmaFuente)
    : null;

    const margenX = 20;
    let cursorY = 5;
    const anchoTexto = 170;
    const saltoLinea = 6;

    const logoDataUrl = await this.cargarLogoHeader();
    if (logoDataUrl) {
      const logoWidth = 48;
      const logoHeight = 56;
      const logoX = (210 - logoWidth) / 2;
      doc.addImage(logoDataUrl, 'PNG', logoX, cursorY, logoWidth, logoHeight);
      cursorY += logoHeight + 6;
    } else {
      cursorY += 6;
    }

    doc.setFontSize(11);



    //FECHA A LA DERECHA
    doc.setFont('Helvetica', 'normal');
    // Ancho de la página (A4 en mm)
    const pageWidth = doc.internal.pageSize.getWidth();
    // Usamos el mismo margen que a la izquierda
    const rightMargin = margenX;
    // Calculamos el ancho del texto de la fecha
    const fechaAncho = doc.getTextWidth(fechaTexto);
    // Posición X para que la fecha quede pegada al margen derecho
    const fechaX = pageWidth - rightMargin - fechaAncho;
    // Dibujamos la fecha alineada a la derecha
    doc.text(fechaTexto, fechaX, cursorY);
    cursorY += saltoLinea + 2;

    doc.setFont('Helvetica', 'bold');
    const destinatarioLineas = [
      'Señor',
      `${preview.destNombres} ${preview.destApellidos}`.trim(),
      preview.destCargo,
      preview.destEmpresa,
      'Presente',
    ].filter((linea) => !!linea);
    destinatarioLineas.forEach((linea) => {
      doc.text(linea, margenX, cursorY);
      cursorY += saltoLinea;
    });
    doc.setFont('Helvetica', 'normal');
    cursorY += 1;

    cursorY += 2;

    const alumnoNombre = `${preview.alumnoNombres} ${preview.alumnoApellidos}`.trim() || 'Alumno/a';
    const rutTexto = preview.alumnoRut === '—' ? '' : `, RUT ${preview.alumnoRut}`;
    const carreraTexto = preview.carrera === '—' ? '' : ` de la carrera de ${preview.carrera}`;
    const parrafo1 = `Me permito dirigirme a Ud. para presentar al Sr. ${alumnoNombre}${rutTexto}${carreraTexto} de la Universidad Tecnológica Metropolitana, y solicitar su aceptación en calidad de alumno en práctica.`;
    cursorY = this.escribirTextoJustificado(doc, parrafo1, margenX, cursorY, anchoTexto, saltoLinea);
    cursorY += 3;

    const duracionTexto = new Intl.NumberFormat('es-CL').format(preview.duracionHoras || 0);
    const parrafo2 = `Cabe destacar que dicho alumno está cubierto por el seguro estudiantil de acuerdo en el Art. 3o de ley No 16.744 y el Art. 1o del D.L. No 313/73. Esta práctica tiene una duración de ${duracionTexto} horas cronológicas, con fecha de inicio el día ${preview.fechaInicio} y sus objetivos son:`;
    cursorY = this.escribirTextoJustificado(doc, parrafo2, margenX, cursorY, anchoTexto, saltoLinea);

// espacio pequeño antes de la lista (opcional)
cursorY += 6;

    objetivos.forEach((objetivo) => {
      cursorY = this.escribirBullet(
        doc,
        objetivo,        // sin el símbolo •, la función lo agrega
        margenX,         // x inicial
        cursorY,         // y actual
        anchoTexto,      // mismo ancho que usas en párrafos
        saltoLinea,      // mismo interlineado
        6                // sangría del bullet
      );
    });

    cursorY += saltoLinea*3; // espacio antes de la despedida

    // ===== Firma del coordinador como imagen (si existe) =====
    if (firmaImagen) {
      // dimensiones más grandes de la firma en mm
      const firmaWidth = 66;
      const firmaHeight = 33;

      // alineada al margen derecho (orientación derecha → izquierda)
      const firmaRightX = margenX + anchoTexto;   // borde derecho del bloque
      const firmaX = firmaRightX - firmaWidth;    // empezamos desde la derecha hacia la izquierda

      doc.addImage(
        firmaImagen.dataUrl,
        firmaImagen.format,
        firmaX,
        cursorY,
        firmaWidth,
        firmaHeight
      );

      cursorY += firmaHeight + 4; // un poco más de espacio después de la firma
    }

    // ===== Texto "Le saluda atentamente," debajo de la firma =====
    cursorY += saltoLinea;
    doc.setFont('Helvetica', 'normal');
    const xRight = margenX + anchoTexto; // extremo derecho del bloque de texto
    doc.text('Le saluda atentamente,', xRight, cursorY, { align: 'right' });
    cursorY += saltoLinea;

    doc.setFont('Helvetica', 'bold');
    doc.text(firma.nombre, xRight, cursorY, { align: 'right' });
    cursorY += saltoLinea;

    doc.setFont('Helvetica', 'normal');
    if (firma.cargo) {
      const cargoLineas = doc.splitTextToSize(firma.cargo, anchoTexto);
      doc.text(cargoLineas, xRight, cursorY, { align: 'right' });
      cursorY += cargoLineas.length * saltoLinea;
    }



    // ===== Pie de página =====
    doc.setFont('Helvetica', 'bold');

    const institucion = firma.institucion || 'Universidad Tecnológica Metropolitana';
    const institucionLineas = doc.splitTextToSize(institucion, anchoTexto);
    doc.setFont('Helvetica', 'normal');

    const encabezado = `${preview.escuelaNombre} — ${preview.escuelaDireccion} — Tel. ${preview.escuelaTelefono} —  http://www.utem.cl`;
    const encabezadoLineas = doc.splitTextToSize(encabezado, anchoTexto);

    // Medidas de la página
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = margenX + anchoTexto / 2;
    const footerMarginBottom = 15;        // distancia al borde inferior
    const footerLineHeight = saltoLinea - 1; // un poco más compacto

    // Calculamos desde abajo hacia arriba para que el pie quede "pegado" al fondo
    const totalFooterLines = institucionLineas.length + encabezadoLineas.length;
    let footerY =
      pageHeight - footerMarginBottom - footerLineHeight * (totalFooterLines - 1);

    // Primera línea: "Universidad Tecnológica Metropolitana"
    doc.text(institucionLineas, centerX, footerY, { align: 'center' });
    footerY += institucionLineas.length * footerLineHeight;

    // Segunda línea: "Escuela de Informática — ... — Tel. ..."
    doc.text(encabezadoLineas, centerX, footerY, { align: 'center' });




    const nombreArchivo = this.construirNombreArchivoCarta(preview);
    const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

    if (typeof File === 'undefined') {
      throw new Error('API File no disponible en este navegador.');
    }

    return new File([blob], nombreArchivo, { type: 'application/pdf' });
  }

  private construirNombreArchivoCarta(preview: CartaPreviewData): string {
    const base = `${preview.alumnoNombres} ${preview.alumnoApellidos}`.trim() || 'estudiante';
    const normalizado = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    const sufijo = normalizado || 'estudiante';
    return `carta_practica_${sufijo}.pdf`;
  }

  fechaHoy = computed(() => {
    const d = new Date();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `Santiago, ${meses[d.getMonth()]} ${d.getDate()} del ${d.getFullYear()}.`;
  });

  firmaActual = computed<Firma>(() => {
    const carrera = this.current()?.alumno?.carrera;
    return this.obtenerFirmaPorCarrera(carrera);
  });

  objetivosActuales = computed<string[]>(() => {
    const carta = this.current();
    const objetivos = this.obtenerObjetivosParaSolicitud(carta);
    return [...objetivos];
  });

  cartaPreview = computed<CartaPreviewData>(() => {
    const carta = this.current();
    return this.construirCartaPreviewData(carta);
  });

  // ====== Pestañas ======
  // arriba, junto al resto de signals:
  mainTab = signal<'solicitudes' | 'documentos' | 'recepcion' | 'firma'>('solicitudes');

  // función para cambiar de pestaña
  setMainTab(tab: 'solicitudes' | 'documentos' | 'recepcion' | 'firma') {
    if (tab === 'firma' && !this.isCoordinador) {
      return;
    }

    this.mainTab.set(tab);
    if (tab === 'documentos' && this.coordinadorId !== null && !this.documentosCompartidos().length) {
      // si entras a Documentos y aún no cargan, los traemos
      this.cargarDocumentosCompartidos();
    }
    if (tab === 'recepcion' && this.coordinadorId !== null) {
      this.cargarEntregasEvaluacion();
    }
    if (tab === 'firma' && this.coordinadorId !== null && !this.firmaCoordinador()) {
      this.cargarFirmaCoordinador();
    }
  }
}