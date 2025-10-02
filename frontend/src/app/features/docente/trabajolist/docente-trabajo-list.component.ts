import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

type Grupo = {
  id: number;
  nombre: string;
  alumnos: string;
  alert?: string;
  status?: 'check' | 'pending';
};

type Tema = {
  titulo: string;
  carrera: string;
  descripcion: string;
  requisitos: string[];
  cupos: number;
};

@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent {
  // pestaña activa: 'i' | 'ii' | 'temas'
  tab = signal<'i' | 'ii' | 'temas'>('i');

  showTemaModal = signal(false);
  ramas: string[] = [
    'Desarrollo de Software',
    'Sistemas de Información',
    'Inteligencia de Negocios',
    'Ciencia de Datos',
    'Redes y Seguridad',
    'Otra',
  ];

  temaForm: FormGroup;

  // Datos de ejemplo (TT I)
  private gruposI = signal<Grupo[]>([
    { id: 1, nombre: 'Grupo 1 – TT I', alumnos: 'Ana / José', alert: '¡Falta bitácora!' },
    { id: 2, nombre: 'Grupo 2 – TT I', alumnos: 'Daniela / Pedro', status: 'check' },
  ]);

  // Datos de ejemplo (TT II)
  private gruposII = signal<Grupo[]>([
    { id: 101, nombre: 'Grupo A – TT II', alumnos: 'Carla / Luis', status: 'check' },
    { id: 102, nombre: 'Grupo B – TT II', alumnos: 'Marcela / Jorge' },
  ]);

  // Temas de ejemplo
  temas = signal<Tema[]>([
    {
      titulo: 'Predicción de demanda de buses con BI',
      carrera: 'Computación',
      descripcion: 'Modelo de pronóstico + dashboard (ETL, KPIs, Power BI).',
      requisitos: ['Python', 'ETL', 'Power BI'],
      cupos: 2,
    },
    {
      titulo: 'Clasificación de vinos con ML',
      carrera: 'Computación',
      descripcion: 'Regresión logística / árboles, comparación de métricas.',
      requisitos: ['Pandas', 'Scikit-learn'],
      cupos: 1,
    },
    {
      titulo: 'Plataforma de titulación (Django + Angular)',
      carrera: 'Computación',
      descripcion: 'Roles (alumno/docente/coordinador), flujo y repositorio de entregas.',
      requisitos: ['Django', 'Angular', 'PostgreSQL'],
      cupos: 2,
    },
  ]);

  // Lista mostrada según pestaña
  grupos = computed<Grupo[]>(() => (this.tab() === 'i' ? this.gruposI() : this.gruposII()));

   constructor(private fb: FormBuilder) {
    this.temaForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(160)]],
      objetivo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', [Validators.required, Validators.maxLength(1200)]],
      rama: ['', Validators.required],
    });
  }

  toggleTemaModal(open: boolean) {
    this.showTemaModal.set(open);
    if (!open) {
      this.temaForm.reset();
    }
  }

  submitTema() {
    if (this.temaForm.invalid) {
      this.temaForm.markAllAsTouched();
      return;
    }

    const { titulo, objetivo, descripcion, rama } = this.temaForm.value;
    const nuevoTema: Tema = {
      titulo: (titulo as string).trim(),
      carrera: rama as string,
      descripcion: (descripcion as string).trim(),
      requisitos: objetivo ? [(objetivo as string).trim()] : [],
      cupos: 1,
    };

    this.temas.update((temas) => [nuevoTema, ...temas]);

    this.toggleTemaModal(false);
  }

  hasTemaError(control: string, error: string) {
    const ctrl = this.temaForm.get(control);
    return !!(ctrl && ctrl.touched && ctrl.hasError(error));
  }
}
