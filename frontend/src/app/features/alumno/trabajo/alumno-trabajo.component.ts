import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

type RamaCarrera =
  | 'Desarrollo de Software' | 'Sistemas de Información'
  | 'Inteligencia de Negocios' | 'Ciencia de Datos'
  | 'Redes y Seguridad' | 'Otra';

interface Profesor {
  id: string;
  nombre: string;
  ramas: RamaCarrera[];
}

@Component({
  selector: 'alumno-trabajo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alumno-trabajo.component.html',
  styleUrls: ['./alumno-trabajo.component.css']
})
export class AlumnoTrabajoComponent {
  // Data existente
  entregas = signal([
    { nombre:'Informe de avance #2', estado:'Aprobado', fecha:'15 de abril' }
  ]);

  // Estado modal
  showPostulacion = signal(false);

  // Catálogos
  ramas: RamaCarrera[] = [
    'Desarrollo de Software','Sistemas de Información','Inteligencia de Negocios',
    'Ciencia de Datos','Redes y Seguridad','Otra'
  ];

  profesores: Profesor[] = [
    { id: 'p1', nombre: 'Mauro Castillo', ramas: ['Desarrollo de Software','Sistemas de Información'] },
    { id: 'p2', nombre: 'Gilberto', ramas: ['Ciencia de Datos','Inteligencia de Negocios'] },
    { id: 'p3', nombre: 'María Pérez', ramas: ['Redes y Seguridad','Sistemas de Información'] },
    { id: 'p4', nombre: 'Juan Soto', ramas: ['Desarrollo de Software','Ciencia de Datos'] },
    { id: 'p5', nombre: 'Ana Díaz', ramas: ['Inteligencia de Negocios'] },
  ];

  postulacionForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.postulacionForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(160)]],
      objetivo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', [Validators.required, Validators.maxLength(1200)]],
      rama: ['', Validators.required],
      prof1: ['', Validators.required],
      prof2: [''],
      prof3: ['']
    }, { validators: this.profesoresDistintosValidator });
  }

  // Getter para usar en template y evitar TS4111
  get profesoresDuplicados() {
    return this.postulacionForm.errors?.['profesoresDuplicados'];
  }

  // Filtra profesores por rama seleccionada
  profesoresFiltrados = computed(() => {
    const rama = this.postulacionForm.get('rama')?.value as RamaCarrera | '';
    if (!rama) return this.profesores;
    return this.profesores.filter(p => p.ramas.includes(rama as RamaCarrera));
  });

  togglePostulacion(open: boolean) {
    this.showPostulacion.set(open);
    if (!open) this.postulacionForm.reset();
  }

  private profesoresDistintosValidator = (group: FormGroup) => {
    const p1 = group.get('prof1')?.value;
    const p2 = group.get('prof2')?.value;
    const p3 = group.get('prof3')?.value;
    const arr = [p1, p2, p3].filter(Boolean);
    return (new Set(arr).size !== arr.length) ? { profesoresDuplicados: true } : null;
  };

  submitPostulacion() {
    if (this.postulacionForm.invalid) {
      this.postulacionForm.markAllAsTouched();
      return;
    }
    const payload = {
      titulo: this.postulacionForm.value.titulo.trim(),
      objetivo: this.postulacionForm.value.objetivo.trim(),
      descripcion: this.postulacionForm.value.descripcion.trim(),
      rama: this.postulacionForm.value.rama,
      preferenciasProfesores: [
        this.postulacionForm.value.prof1,
        this.postulacionForm.value.prof2 || null,
        this.postulacionForm.value.prof3 || null
      ].filter(Boolean)
    };
    console.log('Postulación enviada:', payload);
    alert('Tu postulación fue enviada para revisión.');
    this.togglePostulacion(false);
  }

  hasError(ctrl: string, err: string) {
    const c = this.postulacionForm.get(ctrl);
    return !!(c && c.touched && c.hasError(err));
  }
}
