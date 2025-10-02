import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { TemaService, TemaDisponible } from './tema.service';


type Grupo = {
  id: number;
  nombre: string;
  alumnos: string;
  alert?: string;
  status?: 'check' | 'pending';
};


@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent implements OnInit {
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

  // Temas 
  temas = signal<TemaDisponible[]>([]);
  temasCargando = signal(false);
  temasError = signal<string | null>(null);
  enviarTema = signal(false);
  enviarTemaError = signal<string | null>(null);
  eliminarTemaError = signal<string | null>(null);

  // Lista mostrada según pestaña
  grupos = computed<Grupo[]>(() => (this.tab() === 'i' ? this.gruposI() : this.gruposII()));

  constructor(private fb: FormBuilder, private temaService: TemaService) {
    this.temaForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(160)]],
      objetivo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', [Validators.required, Validators.maxLength(1200)]],
      rama: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.cargarTemas();
  }

  private cargarTemas(): void {
    this.temasCargando.set(true);
    this.temasError.set(null);

    this.temaService
      .getTemas()
      .pipe(finalize(() => this.temasCargando.set(false)))
      .subscribe({
        next: (temas) => {
          this.temas.set(temas);
        },
        error: () => {
          this.temasError.set('No fue posible cargar los temas disponibles.');
        },
      });
  }


  toggleTemaModal(open: boolean) {
    this.showTemaModal.set(open);
        if (open) {
      this.enviarTemaError.set(null);
    }

    if (!open) {
      this.temaForm.reset();
      this.enviarTema.set(false);
      this.enviarTemaError.set(null);
    }
  }

  submitTema() {
    if (this.temaForm.invalid) {
      this.temaForm.markAllAsTouched();
      return;
    }

    const { titulo, objetivo, descripcion, rama } = this.temaForm.value;
    const payload = {
      titulo: (titulo as string).trim(),
      carrera: rama as string,
      descripcion: (descripcion as string).trim(),
      requisitos: objetivo ? [(objetivo as string).trim()] : [],
      cupos: 1,
    };

    this.enviarTema.set(true);
    this.enviarTemaError.set(null);

    this.temaService
      .crearTema(payload)
      .pipe(finalize(() => this.enviarTema.set(false)))
      .subscribe({
        next: (tema) => {
          this.temas.update((temas) => [tema, ...temas]);
          this.toggleTemaModal(false);
        },
        error: () => {
          this.enviarTemaError.set('No se pudo guardar el tema. Inténtalo nuevamente.');
        },
      });
  }

  hasTemaError(control: string, error: string) {
    const ctrl = this.temaForm.get(control);
    return !!(ctrl && ctrl.touched && ctrl.hasError(error));
  }


  eliminarTema(tema: TemaDisponible) {
    this.eliminarTemaError.set(null);
      const confirmado = confirm(
      `¿Está seguro de eliminar el tema "${tema.titulo}"? Esta acción no se puede deshacer.`
    );

    if (!confirmado) {
      return;
    }
    this.temaService.eliminarTema(tema.id).subscribe({
      next: () => {
        this.temas.update((temas) => temas.filter((t) => t.id !== tema.id));
      },
      error: () => {
        this.eliminarTemaError.set('No se pudo eliminar el tema. Inténtalo nuevamente.');
      },
    });
  }

}
