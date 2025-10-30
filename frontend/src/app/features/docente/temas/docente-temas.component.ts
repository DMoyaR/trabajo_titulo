import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { TemaService, TemaDisponible as TemaAPI, CrearTemaPayload } from './tema.service';

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
  selector: 'docente-temas',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './docente-temas.component.html',
  styleUrls: ['./docente-temas.component.css'],
})
export class DocenteTemasComponent implements OnInit {
  // ===== Temas (conectado a backend)
  ramas = ['Empresa', 'Desarrollo de software', 'Investigación', 'Artículo', 'I+D', 'Otro'];

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