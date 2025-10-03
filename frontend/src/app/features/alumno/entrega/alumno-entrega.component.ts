import { Component, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, NgClass } from '@angular/common';

type EstadoEval = 'pendiente' | 'entregada' | 'calificada';

interface Entrega {
  titulo: string;
  comentario?: string | null;
  archivoNombre: string;
  archivoTipo: string;
  fecha: string | Date;
  nota?: number | null;
}

interface Evaluacion {
  id: number;
  titulo: string;
  descripcion?: string;
  fechaLimite: string | Date;
  estado: EstadoEval;
  tipo: 'informe' | 'presentación' | 'anexo' | string;
  ultimaEntrega?: Entrega | null;
}

@Component({
  selector: 'alumno-entrega',
  standalone: true,
  templateUrl: './alumno-entrega.component.html',
  styleUrls: ['./alumno-entrega.component.css'],
  imports: [CommonModule, FormsModule, NgIf, NgFor, NgClass, DatePipe, TitleCasePipe],
})
export class AlumnoEntregaComponent {
  // UI text
  titulo = 'Entregas';

  // Simulación de datos (puedes reemplazar por los que vengan del backend)
  private _evaluaciones = signal<Evaluacion[]>([
    {
      id: 1,
      titulo: 'Informe de Avance #2',
      descripcion: 'Sube el informe con conclusiones preliminares.',
      fechaLimite: new Date(),
      estado: 'pendiente',
      tipo: 'informe',
      ultimaEntrega: null,
    },
    {
      id: 2,
      titulo: 'Presentación intermedia',
      descripcion: 'Diapositivas de 10-12 láminas.',
      fechaLimite: new Date(),
      estado: 'calificada',
      tipo: 'presentación',
      ultimaEntrega: {
        titulo: 'Deck v1',
        comentario: 'Buen contenido, mejorar visuales.',
        archivoNombre: 'presentacion_intermedia_v1.pptx',
        archivoTipo: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fecha: new Date(),
        nota: 6.0,
      },
    },
    {
      id: 3,
      titulo: 'Anexo de datos',
      fechaLimite: new Date(),
      estado: 'entregada',
      tipo: 'anexo',
      ultimaEntrega: {
        titulo: 'dataset_UG.zip',
        comentario: null,
        archivoNombre: 'dataset_UG.zip',
        archivoTipo: 'application/zip',
        fecha: new Date(),
        nota: null,
      },
    },
  ]);

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

  canUpload = computed(() => {
    const ev = this._seleccion();
    return !!ev && ev.estado === 'pendiente';
  });

  isDragging = () => this._dragging();
  sending = () => this._sending();
  progress = () => this._progress();
  errorMsg = () => this._errorMsg();

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

  async submitUpload() {
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

    // Simulación de upload
    this._sending.set(true);
    this._progress.set(0);

    // Simular progreso
    const total = 100;
    for (let p = 0; p <= total; p += 10) {
      await new Promise(r => setTimeout(r, 120));
      this._progress.set(p);
    }

    // Actualizar la evaluación seleccionada como entregada
    const ev = this._seleccion();
    if (ev) {
      const f = this._archivo()!;
      const nuevaEntrega: Entrega = {
        titulo: this.upload.titulo,
        comentario: this.upload.comentario || null,
        archivoNombre: f.name,
        archivoTipo: f.type || 'application/octet-stream',
        fecha: new Date(),
        nota: null,
      };
      const actualizada: Evaluacion = { ...ev, estado: 'entregada', ultimaEntrega: nuevaEntrega };

      // Reemplazar en la lista
      const lista = this._evaluaciones().map(x => (x.id === ev.id ? actualizada : x));
      this._evaluaciones.set(lista);
      this._seleccion.set(actualizada);
    }

    this._sending.set(false);
    this.showUpload.set(false);
  }
}
