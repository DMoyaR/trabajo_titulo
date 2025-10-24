import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface CartaAlumnoInfo {
  nombres: string;
  apellidos: string;
  rut: string;
  carrera: string;
}

export interface CartaDestinatarioInfo {
  nombres: string;
  apellidos: string;
  cargo: string;
  empresa: string;
}

export interface CartaEscuelaInfo {
  nombre: string;
  direccion: string;
  telefono: string;
}

export interface CartaFirmaInfo {
  nombre: string;
  cargo: string;
  institucion?: string;
}

@Component({
  selector: 'app-carta-practica-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carta-practica-preview.component.html',
  styleUrls: ['./carta-practica-preview.component.css'],
})
export class CartaPracticaPreviewComponent {
  @Input({ required: true }) alumno!: CartaAlumnoInfo;
  @Input({ required: true }) destinatario!: CartaDestinatarioInfo;
  @Input({ required: true }) escuela!: CartaEscuelaInfo;
  @Input({ required: true }) duracionHoras!: number;
  @Input() objetivos: string[] = [];
  @Input() fecha?: string | null;
  @Input() firma?: CartaFirmaInfo | null;

  private readonly meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  get fechaTexto(): string {
    if (this.fecha) {
      return this.fecha;
    }
    const hoy = new Date();
    return this.formatFecha(hoy);
  }

  get firmaNombre(): string {
    return this.firma?.nombre ?? 'Coordinación de Carrera — UTEM';
  }

  get firmaCargo(): string {
    return this.firma?.cargo ?? '';
  }

  get firmaInstitucion(): string {
    return this.firma?.institucion ?? 'Universidad Tecnológica Metropolitana';
  }

  get objetivosLista(): string[] {
    if (Array.isArray(this.objetivos) && this.objetivos.length) {
      return this.objetivos;
    }
    return [
      'Aplicar conocimientos disciplinares en un contexto profesional real.',
      'Integrarse a equipos de trabajo, comunicando avances y resultados.',
      'Cumplir con normas de seguridad, calidad y medioambiente vigentes.',
      'Elaborar informes técnicos con conclusiones basadas en evidencia.',
    ];
  }

  private formatFecha(fecha: Date): string {
    const mes = this.meses[fecha.getMonth()] ?? '';
    return `Santiago, ${mes} ${fecha.getDate()} del ${fecha.getFullYear()}.`;
  }
}