import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

type EstadoEval = 'Pendiente' | 'Entregada' | 'Calificada';
type TipoEval   = 'avance' | 'informe' | 'defensa' | 'otro';

interface EntregaInfo {
  titulo: string;
  comentario?: string;
  archivoNombre: string;
  archivoTipo: string;
  fecha: string;   // ISO
  nota?: number;
}

interface Evaluacion {
  id: string;
  titulo: string;
  descripcion?: string;
  fechaLimite: string; // ISO
  estado: EstadoEval;
  tipo:   TipoEval;
  ultimaEntrega?: EntregaInfo;
}

@Component({
  selector: 'alumno-entrega',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumno-entrega.component.html',
  styleUrls: ['./alumno-entrega.component.css'],
})
export class AlumnoEntregaComponent {
  // Cabecera
  titulo = 'Entregas';

  // Datos (demo; conecta a tu API)
  evaluaciones = signal<Evaluacion[]>([
    {
      id: 'ev-1',
      titulo: 'Avance #2',
      descripcion: 'Sube tu informe de avance con bitácora.',
      fechaLimite: new Date().toISOString(),
      estado: 'Pendiente',
      tipo: 'avance',
    },
    {
      id: 'ev-2',
      titulo: 'Informe Final',
      descripcion: 'Documento con formato institucional.',
      fechaLimite: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      estado: 'Entregada',
      tipo: 'informe',
      ultimaEntrega: {
        titulo: 'Informe final v1',
        comentario: 'Envío preliminar',
        archivoNombre: 'informe_final_v1.pdf',
        archivoTipo: 'application/pdf',
        fecha: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    },
    {
      id: 'ev-3',
      titulo: 'Defensa',
      descripcion: 'Presentación y defensa final.',
      fechaLimite: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      estado: 'Calificada',
      tipo: 'defensa',
      ultimaEntrega: {
        titulo: 'Presentación final',
        comentario: 'Versión definitiva',
        archivoNombre: 'defensa.pptx',
        archivoTipo:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        nota: 6.3,
      },
    },
  ]);

  pendientes  = computed(() => this.evaluaciones().filter(e => e.estado === 'Pendiente'));
  completadas = computed(() => this.evaluaciones().filter(e => e.estado !== 'Pendiente'));

  // Selección/detalle
  seleccionada = signal<Evaluacion | null>(null);
  seleccionar(e: Evaluacion) { this.seleccionada.set(e); this.resetForm(); }
  limpiarSeleccion() { this.seleccionada.set(null); }
  canUpload() { return this.seleccionada()?.estado === 'Pendiente'; }

  /* ================= Instrucciones dinámicas ================= */
  getInstrucciones(e: Evaluacion): string[] {
    const fecha = new Date(e.fechaLimite);
    const fechaTxt = `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    const base = [
      `Fecha límite: ${fechaTxt}. Las reentregas son válidas solo dentro de la ventana establecida.`,
    ];

    switch (e.tipo) {
      case 'avance':
        return [
          'Formato: PDF obligatorio.',
          'Incluye bitácora de trabajo (puede ir como anexo al final del PDF).',
          'Extensión sugerida: 5–10 páginas.',
          'Nombra el archivo: AVANCE_N_Apellido1Apellido2.pdf (ej: AVANCE_2_PerezGomez.pdf).',
          'Tamaño máximo: 25 MB.',
          ...base,
        ];
      case 'informe':
        return [
          'Formato: PDF con plantilla institucional.',
          'Adjunta anexos en un .ZIP si corresponde (datos, apéndices, etc.).',
          'Citas y referencias según norma de la escuela.',
          'Nombra el archivo: INFORME_FINAL_Apellido1Apellido2.pdf.',
          'Tamaño máximo: 25 MB por archivo.',
          ...base,
        ];
      case 'defensa':
        return [
          'Formato: PPT/PPTX (16:9). Opcional: exporta una copia en PDF.',
          'Duración estimada de exposición: 10–15 min.',
          'Incorpora portada con nombre del alumno y tema.',
          'Nombra el archivo: DEFENSA_Apellido1Apellido2.pptx.',
          'Tamaño máximo: 25 MB.',
          ...base,
        ];
      default: // 'otro'
        return [
          'Sube el archivo solicitado por el docente.',
          'Formatos permitidos: PDF, DOC/DOCX, PPT/PPTX o ZIP.',
          'Tamaño máximo: 25 MB.',
          ...base,
        ];
    }
  }

  /* ================= Subida de archivo (igual que antes) ================= */
  showUpload = signal(false);
  isDragging = signal(false);
  errorMsg = signal<string | null>(null);
  sending = signal(false);
  progress = signal(0);

  readonly maxMB = 25;
  readonly maxBytes = this.maxMB * 1024 * 1024;
  readonly allowed = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/zip',
  ];

  upload = { titulo: '', comentario: '', archivo: null as File | null };

  archivoInfo = computed(() => {
    const f = this.upload.archivo; if (!f) return null;
    return { name: f.name, sizeMB: (f.size/(1024*1024)).toFixed(2), type: f.type || '—' };
  });

  openUpload(){ if (!this.canUpload()) return; this.resetForm(); this.showUpload.set(true); }
  closeUpload(){ if (this.sending()) return; this.showUpload.set(false); }

  onDrop(ev: DragEvent){ ev.preventDefault(); this.isDragging.set(false); const f=ev.dataTransfer?.files?.[0]??null; this.setFile(f); }
  onDragOver(ev: DragEvent){ ev.preventDefault(); this.isDragging.set(true); }
  onDragLeave(){ this.isDragging.set(false); }
  onFilePick(ev: Event){ const i = ev.target as HTMLInputElement; const f = i.files?.[0] ?? null; this.setFile(f); }

  private setFile(file: File | null){
    this.errorMsg.set(null);
    if(!file){ this.upload.archivo = null; return; }
    if(file.size > this.maxBytes){ this.errorMsg.set(`El archivo supera el máximo de ${this.maxMB} MB.`); this.upload.archivo=null; return; }
    if(file.type && !this.allowed.includes(file.type)){ this.errorMsg.set('Formato no permitido. Sube PDF, DOC/DOCX, PPT/PPTX o ZIP.'); this.upload.archivo=null; return; }
    this.upload.archivo = file;
  }

  async submitUpload(){
    const e = this.seleccionada(); if(!e) return;
    if(!this.upload.titulo.trim()){ this.errorMsg.set('Ingresa un título para tu entrega.'); return; }
    if(!this.upload.archivo){ this.errorMsg.set('Selecciona un archivo.'); return; }

    this.sending.set(true); this.progress.set(0);
    for(let i=0;i<=100;i+=8){ await new Promise(r=>setTimeout(r,60)); this.progress.set(i); }
    // TODO: enviar a API con FormData

    const nueva: Evaluacion = {
      ...e,
      estado:'Entregada',
      ultimaEntrega:{
        titulo:this.upload.titulo,
        comentario:this.upload.comentario,
        archivoNombre:this.upload.archivo.name,
        archivoTipo:this.upload.archivo.type||'—',
        fecha:new Date().toISOString()
      }
    };
    this.evaluaciones.update(list => list.map(x => x.id===e.id ? nueva : x));
    this.seleccionada.set(nueva);
    this.sending.set(false); this.showUpload.set(false); this.resetForm();
  }

  private resetForm(){ this.errorMsg.set(null); this.progress.set(0); this.sending.set(false); this.upload = { titulo:'', comentario:'', archivo:null }; }

  estadoClase(estado: EstadoEval){
    return { chip:true, warn:estado==='Pendiente', info:estado==='Entregada', ok:estado==='Calificada' };
  }
}
