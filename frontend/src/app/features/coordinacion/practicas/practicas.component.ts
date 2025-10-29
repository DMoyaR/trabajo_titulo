import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
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

interface DocumentoCompartido {
  id: number;
  nombre: string;
  descripcion?: string | null;
  createdAt: string;
  url: string | null;
}

interface CartaPreviewData {
  alumnoNombres: string;
  alumnoApellidos: string;
  alumnoRut: string;
  carrera: string;
  duracionHoras: number;
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

  @ViewChild('archivoInput') archivoInput?: ElementRef<HTMLInputElement>;

  documentosCompartidos = signal<DocumentoCompartido[]>([]);
  documentosLoading = signal(false);
  documentosError = signal<string | null>(null);
  documentoUploadError = signal<string | null>(null);
  gestionDocumentoLoading = signal(false);

  documentoForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });
  archivoNombre = signal<string | null>(null);
  private archivoSeleccionado: File | null = null;

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

  firmasPorCarrera: Record<string, Firma> = {
    'Ingeniería Civil en Computación mención Informática': {
      nombre: 'Víctor Escobar Jeria',
      cargo:
        'Director Escuela de Informática y Jefe de Carrera Ingeniería Civil en Computación mención Informática',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería en Informática': {
      nombre: 'Patricia Mellado Acevedo',
      cargo: 'Jefa de Carrera Ingeniería en Informática',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería Civil en Ciencia de Datos': {
      nombre: 'Jorge Vergara Quezada',
      cargo: 'Jefe de Carrera Ingeniería Civil en Ciencia de Datos',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería Civil Industrial': {
      nombre: 'Evelyn Gajardo Gutiérrez',
      cargo: 'Directora Escuela de Industria y Jefa de Carrera Ingeniería Civil Industrial',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería Industrial': {
      nombre: 'Alexis Rufatt Zafira',
      cargo: 'Jefe de Carrera Ingeniería Industrial',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería Civil Electrónica': {
      nombre: 'Patricio Santos López',
      cargo: 'Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería Electrónica': {
      nombre: 'Patricio Santos López',
      cargo: 'Director Escuela de Electrónica y Jefe de Carrera Ingeniería Civil Electrónica / Ingeniería Electrónica',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería Civil en Mecánica': {
      nombre: 'Christian Muñoz Valenzuela',
      cargo: 'Director Escuela de Mecánica',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería en Geomensura': {
      nombre: 'Juan Toledo Ibarra',
      cargo: 'Director Escuela de Geomensura',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Bachillerato en Ciencias de la Ingeniería': {
      nombre: 'Rafael Loyola Berríos',
      cargo: 'Coordinador del Plan Común de Ingeniería y Jefe de Carrera de Bachillerato en Ciencias de la Ingeniería',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Dibujante Proyectista': {
      nombre: 'Marcelo Borges Quintanilla',
      cargo: 'Jefe de Carrera Dibujante Proyectista',
      institucion: 'Universidad Tecnologica Metropolitana',
    },
    'Ingeniería Civil Biomédica': {
      nombre: 'Raúl Caulier Cisterna',
      cargo: 'Jefe de Carrera Ingeniería Civil Biomédica',
      institucion: 'Universidad Tecnologica Metropolitana',
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

  private firmaFallback: Firma = {
    nombre: 'Coordinación de Carrera — UTEM',
    cargo: '',
    institucion: 'Universidad Tecnologica Metropolitana',
  };

  // ====== Cargar datos ======
  ngOnInit() {
    const profile = this.currentUserService.getProfile();
    this.coordinadorId = profile?.id ?? null;
    this.cargarSolicitudes();
    if (this.coordinadorId !== null) {
      this.cargarDocumentosCompartidos();
    } else {
      this.documentosCompartidos.set([]);
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
  aprobar() {
    const c = this.current();
    if (!c) return;

    const body: { url?: string | null } = this.aprobarForm.value.urlFirmado
      ? { url: this.aprobarForm.value.urlFirmado }
      : {};

    this.http
      .post<AprobarSolicitudResponse>(`/api/coordinacion/solicitudes-carta/${c.id}/aprobar`, body)
      .subscribe({
        next: (res) => {
          this.toast.set('Solicitud aprobada correctamente.');
          const nuevaUrl = res?.url ?? (body['url'] as string | null | undefined) ?? null;
          this.actualizarEstadoLocal(c.id, 'aprobado', nuevaUrl ?? undefined);
          this.cerrarDetalle();
        },
        error: () => this.toast.set('Error al aprobar solicitud.'),
      });
  }

  rechazar() {
    const c = this.current();
    if (!c) return;

    if (this.rechazarForm.invalid) {
      this.rechazarForm.markAllAsTouched();
      return;
    }

    const body = { motivo: this.rechazarForm.value.motivo || '' };
    this.http.post(`/api/coordinacion/solicitudes-carta/${c.id}/rechazar`, body).subscribe({
      next: () => {
        this.toast.set('Solicitud rechazada.');
        this.actualizarEstadoLocal(c.id, 'rechazado', null, body.motivo);
        this.cerrarDetalle();
      },
      error: () => this.toast.set('Error al rechazar solicitud.'),
    });
  }

  actualizarEstadoLocal(id: string, estado: Estado, url?: string | null, motivo?: string) {
    const arr = this.solicitudes();
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) {
      arr[i] = { ...arr[i], estado, url: url || arr[i].url, motivoRechazo: motivo || arr[i].motivoRechazo };
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

  fechaHoy = computed(() => {
    const d = new Date();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `Santiago, ${meses[d.getMonth()]} ${d.getDate()} del ${d.getFullYear()}.`;
  });

  firmaActual = computed<Firma>(() => {
    const carrera = this.current()?.alumno?.carrera || '';
    return this.firmasPorCarrera[carrera] || this.firmaFallback;
  });

  objetivosActuales = computed<string[]>(() => {
    const carta = this.current();
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

    return [
      'Aplicar conocimientos disciplinares en un contexto profesional real.',
      'Integrarse a equipos de trabajo, comunicando avances y resultados.',
      'Cumplir con normas de seguridad, calidad y medioambiente vigentes.',
      'Elaborar informes técnicos con conclusiones basadas en evidencia.',
    ];
  });

  cartaPreview = computed<CartaPreviewData>(() => {
    const carta = this.current();
    const escuela = carta?.escuela;

    return {
      alumnoNombres: carta?.alumno?.nombres || '—',
      alumnoApellidos: carta?.alumno?.apellidos || '',
      alumnoRut: carta?.alumno?.rut ? formatearRut(carta.alumno.rut) : '—',
      carrera: carta?.alumno?.carrera || '—',
      duracionHoras: carta?.practica?.duracionHoras || 320,
      escuelaNombre: escuela?.nombre || 'Escuela',
      escuelaDireccion: escuela?.direccion || '—',
      escuelaTelefono: escuela?.telefono || '—',
      destNombres: carta?.destinatario?.nombres || '—',
      destApellidos: carta?.destinatario?.apellidos || '',
      destCargo: carta?.destinatario?.cargo || 'Cargo',
      destEmpresa: carta?.destinatario?.empresa || 'Empresa',
    };
  });
  // ====== Pestañas ======
  // arriba, junto al resto de signals:
mainTab = signal<'solicitudes' | 'documentos'>('solicitudes');

// función para cambiar de pestaña
setMainTab(tab: 'solicitudes' | 'documentos') {
  this.mainTab.set(tab);
  if (tab === 'documentos' && this.coordinadorId !== null && !this.documentosCompartidos().length) {
    // si entras a Documentos y aún no cargan, los traemos
    this.cargarDocumentosCompartidos();
  }
}

}