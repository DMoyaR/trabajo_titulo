import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { TemaService, TemaDisponible as TemaAPI, CrearTemaPayload } from './tema.service';

type Tab = 'titulo1' | 'titulo2' | 'temas';
type EstadoGrupo = 'pendiente' | 'en_revision' | 'aprobado' | 'finalizado';
type EstadoEntrega = 'pendiente' | 'evaluado';

/** ====== MODELOS DE LA VISTA (UI) ====== */
interface Grupo {
  id: string;
  nombre: string;
  integrantes: string[];
  estado: EstadoGrupo;
}

interface Entrega {
  id: string;
  titulo: string;
  tipo: string;            // "Plan de trabajo" | "Bitácora" | "Reunión" | "Informe"
  estado: EstadoEntrega;   // pendiente | evaluado
  fechaLimite?: string;
  fechaEntrega?: string;
  nota?: number;
  comentarios?: string;
  expanded?: boolean;
}

/** Tema usado en la UI. Incluye id para poder eliminar en backend */
interface TemaDisponible {
  id?: number;
  titulo: string;
  objetivo: string;        // En backend no existe; lo derivamos de requisitos[0] o join
  descripcion: string;
  rama: string;            // Mapea a "carrera" del backend
  cupos: number;
  requisitos: string;
  fecha: Date;             // Mapea a created_at
}

interface Propuesta {
  id: string;
  alumno: string;
  tema: string;
  descripcion: string;
  rama: string;
  fecha: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  comentario?: string;
}

@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent implements OnInit {
  // ===== pestañas
  tab: Tab = 'titulo1';

  // ===== grupos (mock UI)
  gruposTitulo1: Grupo[] = [
    { id: 'g1', nombre: 'Grupo 1', integrantes: ['Peña', 'Muñoz'], estado: 'aprobado' },
    { id: 'g2', nombre: 'Grupo 2', integrantes: ['Jiménez', 'Quezada'], estado: 'en_revision' },
  ];

  gruposTitulo2: Grupo[] = [
    { id: 'g3', nombre: 'Grupo 3', integrantes: ['Pérez', 'González'], estado: 'pendiente' },
    { id: 'g4', nombre: 'Grupo 4', integrantes: ['Morales', 'Rojas'], estado: 'finalizado' },
  ];

  estadoTexto(e: EstadoGrupo): string {
    switch (e) {
      case 'pendiente': return 'Pendiente';
      case 'en_revision': return 'En revisión';
      case 'aprobado': return 'Aprobado';
      case 'finalizado': return 'Finalizado';
      default: return e;
    }
  }
  estadoClase(e: EstadoGrupo): string {
    switch (e) {
      case 'pendiente': return 'chip-pend';
      case 'en_revision': return 'chip-rev';
      case 'aprobado': return 'chip-ok';
      case 'finalizado': return 'chip-done';
      default: return '';
    }
  }

  // ===== panel de entregas (mock UI)
  grupoSeleccionado: Grupo | null = null;
  entregas: Entrega[] = [];

  // filtros
  tiposEntrega = ['Todos', 'Plan de trabajo', 'Bitácora', 'Reunión', 'Informe'];
  filtroTipo: string = 'Todos';
  filtroBusqueda: string = '';

  verGrupo(grupo: Grupo) {
    this.grupoSeleccionado = grupo;
    this.filtroTipo = 'Todos';
    this.filtroBusqueda = '';

    // Mock: reemplazar por servicio real si más adelante conectas entregas
    this.entregas = [
      { id: 'e1', titulo: 'Hito 1 · Plan de trabajo', tipo: 'Plan de trabajo', estado: 'evaluado', fechaEntrega: '08 abr 2024', nota: 6.5, comentarios: 'Buen alcance y cronograma claro. Ajustar sección de riesgos.' },
      { id: 'e2', titulo: 'Bitácora Semanal #5',      tipo: 'Bitácora',      estado: 'pendiente', fechaLimite: '02 may 2024' },
      { id: 'e3', titulo: 'Reunión de seguimiento',   tipo: 'Reunión',       estado: 'pendiente', fechaLimite: '25 abr 2024' },
      { id: 'e4', titulo: 'Informe intermedio',       tipo: 'Informe',       estado: 'evaluado',  fechaEntrega: '10 may 2024', nota: 6.0, comentarios: 'Buen análisis, profundizar en el marco comparativo.' },
    ];
  }
  volverAListaGrupos() {
    this.grupoSeleccionado = null;
    this.entregas = [];
  }

  get entregasFiltradas(): Entrega[] {
    const q = this.filtroBusqueda.trim().toLowerCase();
    return this.entregas.filter(e => {
      const matchTipo = this.filtroTipo === 'Todos' || e.tipo === this.filtroTipo;
      const matchTexto = !q || e.titulo.toLowerCase().includes(q) || e.tipo.toLowerCase().includes(q);
      return matchTipo && matchTexto;
    });
  }

  // helpers para el template (evitar funciones flecha en HTML)
  get hasPendientes(): boolean {
    return this.entregasFiltradas.some(e => e.estado === 'pendiente');
  }
  get hasEvaluadas(): boolean {
    return this.entregasFiltradas.some(e => e.estado === 'evaluado');
  }

  // ===== evaluación (modal)
  showEvalModal = false;
  entregaEnRevision: Entrega | null = null;
  notaInput: number | null = null;
  comentariosInput = '';

  revisarEntrega(e: Entrega) {
    this.entregaEnRevision = e;
    this.notaInput = null;
    this.comentariosInput = '';
    this.showEvalModal = true;
  }
  cerrarEvalModal() {
    this.showEvalModal = false;
    this.entregaEnRevision = null;
    this.notaInput = null;
    this.comentariosInput = '';
  }
  guardarEvaluacion() {
    if (!this.entregaEnRevision || this.notaInput == null) return;
    const idx = this.entregas.findIndex(x => x.id === this.entregaEnRevision!.id);
    if (idx >= 0) {
      this.entregas[idx] = {
        ...this.entregaEnRevision,
        estado: 'evaluado',
        fechaEntrega: new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
        nota: this.notaInput,
        comentarios: this.comentariosInput || 'Sin comentarios adicionales.',
      };
    }
    this.cerrarEvalModal();
  }
  toggleResumen(e: Entrega) { e.expanded = !e.expanded; }

  // ===== Temas (conectado a backend)
  ramas = ['Informática', 'Industrial', 'Mecánica', 'Electrónica', 'Geomensura'];

  temas: TemaDisponible[] = [];
  temasCargando = false;
  temasError: string | null = null;

  showModalTema = false;
  enviarTema = false;
  enviarTemaError: string | null = null;

  nuevoTema: Partial<TemaDisponible> = {
    titulo: '', objetivo: '', descripcion: '', rama: '', cupos: 1, requisitos: ''
  };

  constructor(private temaService: TemaService) {}

  ngOnInit(): void {
    // Carga inicial de temas desde el backend
    this.cargarTemas();
  }

  private cargarTemas(): void {
    this.temasCargando = true;
    this.temasError = null;

    this.temaService.getTemas()
      .pipe(finalize(() => (this.temasCargando = false)))
      .subscribe({
        next: (temasApi: TemaAPI[]) => {
          // Mapeo de API -> UI
          this.temas = temasApi.map(t => ({
            id: t.id,
            titulo: t.titulo,
            objetivo: (t.requisitos?.[0] ?? (t.requisitos?.join(', ') ?? '')),
            descripcion: t.descripcion,
            rama: t.carrera,
            cupos: t.cupos,
            requisitos: (t.requisitos?.join(', ') ?? ''),
            fecha: t.created_at ? new Date(t.created_at) : new Date()
          }));
        },
        error: () => {
          this.temasError = 'No fue posible cargar los temas disponibles.';
        }
      });
  }

  abrirModalTema() {
    this.showModalTema = true;
    this.enviarTemaError = null;
  }
  cerrarModalTema() {
    this.showModalTema = false;
    this.nuevoTema = { titulo: '', objetivo: '', descripcion: '', rama: '', cupos: 1, requisitos: '' };
    this.enviarTema = false;
    this.enviarTemaError = null;
  }

  guardarTema() {
    // Validaciones mínimas (UI actual usa ngModel)
    if (!this.nuevoTema.titulo || !this.nuevoTema.descripcion || !this.nuevoTema.rama) return;

    const requisitosArray =
      (this.nuevoTema.requisitos ?? '')
        .toString()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const payload: CrearTemaPayload = {
      titulo: (this.nuevoTema.titulo ?? '').trim(),
      carrera: (this.nuevoTema.rama ?? '').trim(),
      descripcion: (this.nuevoTema.descripcion ?? '').trim(),
      requisitos: requisitosArray,
      cupos: Number(this.nuevoTema.cupos ?? 1),
      // created_by: (opcional) si tu backend lo necesita
    };

    
    this.enviarTema = true;
    this.enviarTemaError = null;

    this.temaService.crearTema(payload)
      .pipe(finalize(() => (this.enviarTema = false)))
      .subscribe({
        next: (temaCreado: TemaAPI) => {
          // Mapeo API -> UI para insertar al inicio manteniendo tu tabla actual
          const temaUI: TemaDisponible = {
            id: temaCreado.id,
            titulo: temaCreado.titulo,
            objetivo: (temaCreado.requisitos?.[0] ?? (temaCreado.requisitos?.join(', ') ?? '')),
            descripcion: temaCreado.descripcion,
            rama: temaCreado.carrera,
            cupos: temaCreado.cupos,
            requisitos: (temaCreado.requisitos?.join(', ') ?? ''),
            fecha: temaCreado.created_at ? new Date(temaCreado.created_at) : new Date()
          };
          this.temas = [temaUI, ...this.temas];
          this.cerrarModalTema();
        },
        error: () => {
          this.enviarTemaError = 'No se pudo guardar el tema. Inténtalo nuevamente.';
        }
      });
  }

  eliminarTema(tema: TemaDisponible) {
    if (!tema.id) {
      // Si por alguna razón vino sin id, lo quitamos localmente
      this.temas = this.temas.filter(t => t !== tema);
      return;
    }

    const confirmado = confirm(`¿Está seguro de eliminar el tema "${tema.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    this.temaService.eliminarTema(tema.id).subscribe({
      next: () => {
        this.temas = this.temas.filter(t => t.id !== tema.id);
      },
      error: () => {
        alert('No se pudo eliminar el tema. Inténtalo nuevamente.');
      }
    });
  }

  // ===== Propuestas (mock UI, sin backend)
  showPropuestasModal = false;
  propuestaSeleccionada: Propuesta | null = null;
  comentarioDecision = '';
  propuestas: Propuesta[] = [
    { id: '1', alumno: 'Bastián Peña', tema: 'Plataforma de gestión de prácticas UTEM', descripcion: 'Sistema web para la administración de prácticas profesionales.', rama: 'Informática', fecha: '15/10/2025', estado: 'pendiente' },
    { id: '2', alumno: 'Mauro Muñoz', tema: 'Optimización de rutas logísticas', descripcion: 'Proyecto de análisis de datos para transporte urbano eficiente.', rama: 'Industrial',  fecha: '14/10/2025', estado: 'pendiente' },
  ];
  togglePropuestasModal(v: boolean) {
    this.showPropuestasModal = v;
    if (!v) { this.propuestaSeleccionada = null; this.comentarioDecision = ''; }
  }
  seleccionarPropuesta(p: Propuesta) {
    this.propuestaSeleccionada = p;
    this.comentarioDecision = '';
  }
  aceptarPropuesta() {
    if (!this.propuestaSeleccionada) return;
    const idx = this.propuestas.findIndex(p => p.id === this.propuestaSeleccionada!.id);
    if (idx >= 0) {
      this.propuestas[idx] = { ...this.propuestaSeleccionada, estado: 'aceptada', comentario: this.comentarioDecision };
      this.togglePropuestasModal(false);
    }
  }
  rechazarPropuesta() {
    if (!this.propuestaSeleccionada) return;
    const idx = this.propuestas.findIndex(p => p.id === this.propuestaSeleccionada!.id);
    if (idx >= 0) {
      this.propuestas[idx] = { ...this.propuestaSeleccionada, estado: 'rechazada', comentario: this.comentarioDecision };
      this.togglePropuestasModal(false);
    }
  }
}
