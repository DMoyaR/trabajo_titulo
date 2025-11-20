import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, NgClass } from '@angular/common';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import {
  AlumnoEntregasService,
  EvaluacionGrupoDto,
  EvaluacionEntregaDto,
} from './alumno-entrega.service';
import { finalize } from 'rxjs/operators';

type EstadoEval = 'pendiente' | 'entregada' | 'calificada';

interface Entrega {
  titulo: string;
  comentario?: string | null;
  archivoNombre: string;
  archivoTipo: string;
  archivoUrl?: string | null;
  fecha: string | Date;
  nota?: number | null;
}

interface Evaluacion {
  id: number;
  titulo: string;
  descripcion?: string;
  comentario?: string | null;
  fechaLimite: string | Date | null;
  estado: EstadoEval;
  tipo: 'informe' | 'presentación' | 'anexo' | string;
  rubricaUrl?: string | null;
  rubricaNombre?: string | null;
  rubricaTipo?: string | null;
  ultimaEntrega?: Entrega | null;
}

@Component({
  selector: 'alumno-entrega',
  standalone: true,
  templateUrl: './alumno-entrega.component.html',
  styleUrls: ['./alumno-entrega.component.css'],
  imports: [CommonModule, FormsModule, NgIf, NgFor, NgClass, DatePipe, TitleCasePipe],
})
export class AlumnoEntregaComponent implements OnInit {
  // UI text
  titulo = 'Entregas';

  private readonly currentUserService = inject(CurrentUserService);
  private readonly entregasService = inject(AlumnoEntregasService);

  private _evaluaciones = signal<Evaluacion[]>([]);
  private _cargando = signal(false);
  private _loadError = signal<string | null>(null);

  private alumnoId: number | null = null;

  // Selección
  private _seleccion = signal<Evaluacion | null>(null);

  // Modal subir
  showUpload = signal(false);

  // Drag & drop / archivo
  private _dragging = signal(false);
  private _archivo = signal<File | null>(null);

  // Envío simulado
  private _sending = signal(false);
  private _progress = signal(0);
  private _errorMsg = signal<string | null>(null);

  // Modelo del formulario de subida
  upload = {
    titulo: '',
    comentario: '',
  };

  // Constantes
  maxMB = 25;

  // Getters para template (signals)
  pendientes = () => this._evaluaciones().filter(e => e.estado === 'pendiente');
  completadas = () => this._evaluaciones().filter(e => e.estado !== 'pendiente');

  seleccionada = () => this._seleccion();

  cargando = () => this._cargando();
  loadError = () => this._loadError();

  canUpload = computed(() => {
    const ev = this._seleccion();
    return !!ev && ev.estado === 'pendiente';
  });

  isDragging = () => this._dragging();
  sending = () => this._sending();
  progress = () => this._progress();
  errorMsg = () => this._errorMsg();

  ngOnInit(): void {
    const perfil = this.currentUserService.getProfile();
    if (!perfil?.id) {
      this._loadError.set('No fue posible identificar al alumno actual.');
      return;
    }

    this.alumnoId = perfil.id;

    this._cargando.set(true);
    this._loadError.set(null);

    this.entregasService.listarEvaluaciones(perfil.id).subscribe({
      next: evaluaciones => {
        const mapeadas = evaluaciones.map(ev => this.mapEvaluacion(ev));
        this._evaluaciones.set(mapeadas);
        this._cargando.set(false);
        this.seleccionarInicial();
      },
      error: (error) => {
        console.error('No se pudieron cargar las evaluaciones del alumno', error);
        this._cargando.set(false);
        const detalle = error?.error?.detail;
        if (typeof detalle === 'string') {
          this._loadError.set(detalle);
        } else {
          this._loadError.set('No pudimos cargar tus evaluaciones. Intenta nuevamente más tarde.');
        }
      },
    });
  }

  private mapEvaluacion(dto: EvaluacionGrupoDto): Evaluacion {
    const ultima = dto.ultima_entrega ?? dto.entregas?.[0] ?? null;
    return {
      id: dto.id,
      titulo: dto.titulo,
      descripcion: undefined,
      comentario: dto.comentario,
      fechaLimite: this.parseFecha(dto.fecha),
      estado: this.mapEstado(dto, ultima),
      tipo: this.inferirTipo(dto.titulo),
      rubricaUrl: dto.rubrica_url,
      rubricaNombre: dto.rubrica_nombre,
      rubricaTipo: dto.rubrica_tipo,
      ultimaEntrega: ultima ? this.mapEntregaDto(ultima) : null,
    };
  }

  private mapEstado(dto: EvaluacionGrupoDto, ultima: EvaluacionEntregaDto | null): EstadoEval {
    if (ultima) {
      if (ultima.estado_revision === 'revisada') {
        return 'calificada';
      }
      return 'entregada';
    }

    const normalizado = (dto.estado ?? '').trim().toLowerCase();
    if (normalizado === 'evaluada' || normalizado === 'calificada') {
      return 'calificada';
    }
    if (normalizado === 'entregada') {
      return 'entregada';
    }
    if (normalizado === 'en progreso') {
      return 'pendiente';
    }
    return 'pendiente';
  }

  private mapEntregaDto(dto: EvaluacionEntregaDto): Entrega {
    return {
      titulo: dto.titulo,
      comentario: dto.comentario,
      archivoNombre: dto.archivo_nombre,
      archivoTipo: dto.archivo_tipo ?? 'application/octet-stream',
      archivoUrl: dto.archivo_url,
      fecha: this.parseFecha(dto.creado_en) ?? dto.creado_en,
      nota: dto.nota,
    };
  }

  private inferirTipo(titulo: string | null | undefined): Evaluacion['tipo'] {
    const texto = (titulo ?? '').toLowerCase();
    if (texto.includes('present')) {
      return 'presentación';
    }
    if (texto.includes('anexo') || texto.includes('datos')) {
      return 'anexo';
    }
    if (texto.includes('informe') || texto.includes('report')) {
      return 'informe';
    }
    return 'general';
  }

  private parseFecha(valor: string | null | undefined): Date | null {
    if (!valor) {
      return null;
    }

    // When the backend sends only a date (YYYY-MM-DD), construct the date at the
    // end of the local day so it isn't shifted to the previous day by timezone
    // conversion. Otherwise, fall back to native parsing for full timestamps.
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (soloFecha.test(valor)) {
      const [anio, mes, dia] = valor.split('-').map((v) => Number(v));
      return new Date(anio, mes - 1, dia, 23, 59, 0, 0);
    }

    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private seleccionarInicial(): void {
    const evaluaciones = this._evaluaciones();
    if (!evaluaciones.length) {
      this._seleccion.set(null);
      return;
    }

    const actual = this._seleccion();
    if (actual && evaluaciones.some(ev => ev.id === actual.id)) {
      return;
    }

    const pendiente = evaluaciones.find(ev => ev.estado === 'pendiente');
    this._seleccion.set(pendiente ?? evaluaciones[0]);
  }

  archivoInfo() {
    const f = this._archivo();
    if (!f) return null;
    const sizeMB = Math.round((f.size / (1024 * 1024)) * 10) / 10;
    return { name: f.name, type: f.type || 'desconocido', sizeMB };
  }

  // Acciones UI
  seleccionar(e: Evaluacion) {
    this._seleccion.set(e);
  }

  limpiarSeleccion() {
    this._seleccion.set(null);
  }

  estadoClase(estado: EstadoEval) {
    switch (estado) {
      case 'pendiente': return 'chip warn';
      case 'entregada': return 'chip info';
      case 'calificada': return 'chip ok';
      default: return 'chip';
    }
  }

  getInstrucciones(ev: Evaluacion): string[] {
    switch (ev.tipo) {
      case 'informe':
        return [
          'Formato PDF, portada y numeración.',
          'Máx. 15 páginas, incluir conclusiones.',
          'Nombrar archivo: informe_apellido.pdf',
        ];
      case 'presentación':
        return [
          '10 a 12 diapositivas.',
          'Incluir objetivos, método, resultados.',
          'Traer copia en USB por si acaso.',
        ];
      case 'anexo':
        return [
          'Comprimir en ZIP.',
          'Incluir README con descripción de archivos.',
        ];
      default:
        return ['Revisar instrucciones en Aula Virtual.'];
    }
  }

  openUpload() {
    this._errorMsg.set(null);
    this._archivo.set(null);
    this.upload.titulo = '';
    this.upload.comentario = '';
    this.showUpload.set(true);
  }

  closeUpload() {
    if (this._sending()) return;
    this.showUpload.set(false);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this._dragging.set(true);
  }

  onDragLeave() {
    this._dragging.set(false);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this._dragging.set(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) this._archivo.set(f);
  }

  onFilePick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] || null;
    this._archivo.set(f);
  }

  submitUpload() {
    this._errorMsg.set(null);

    if (!this.upload.titulo?.trim()) {
      this._errorMsg.set('Debes ingresar un título para el envío.');
      return;
    }
    if (!this._archivo()) {
      this._errorMsg.set('Debes seleccionar un archivo.');
      return;
    }
    if (this.archivoInfo()?.sizeMB && this.archivoInfo()!.sizeMB > this.maxMB) {
      this._errorMsg.set(`El archivo supera el máximo de ${this.maxMB} MB.`);
      return;
    }

    const alumnoId = this.alumnoId;
    const ev = this._seleccion();
    if (!alumnoId || !ev) {
      this._errorMsg.set('No se pudo identificar la evaluación seleccionada.');
      return;
    }

    this._sending.set(true);
    this._progress.set(10);

    this.entregasService
      .enviarEntrega(ev.id, alumnoId, {
        titulo: this.upload.titulo.trim(),
        comentario: this.upload.comentario?.trim() || null,
        archivo: this._archivo()!,
      })
      .pipe(
        finalize(() => {
          this._sending.set(false);
          this._progress.set(0);
        })
      )
      .subscribe({
        next: dto => {
          const entrega = this.mapEntregaDto(dto);
          const estado: EstadoEval = dto.estado_revision === 'revisada' ? 'calificada' : 'entregada';
          const actualizada: Evaluacion = { ...ev, estado, ultimaEntrega: entrega };
          this._evaluaciones.set(
            this._evaluaciones().map(x => (x.id === ev.id ? actualizada : x))
          );
          this._seleccion.set(actualizada);
          this._progress.set(100);
          this.showUpload.set(false);
          this._archivo.set(null);
          this.upload.titulo = '';
          this.upload.comentario = '';
        },
        error: error => {
          console.error('No se pudo registrar la entrega de la evaluación', error);
          const detalle = error?.error;
          if (detalle?.titulo?.[0]) {
            this._errorMsg.set(detalle.titulo[0]);
            return;
          }
          if (detalle?.archivo?.[0]) {
            this._errorMsg.set(detalle.archivo[0]);
            return;
          }
          if (detalle?.evaluacion?.[0]) {
            this._errorMsg.set(detalle.evaluacion[0]);
            return;
          }
          this._errorMsg.set('No pudimos subir tu entrega. Intenta nuevamente.');
        },
      });
  }
}