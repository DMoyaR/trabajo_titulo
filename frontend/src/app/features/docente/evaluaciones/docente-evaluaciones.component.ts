import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type GrupoEvaluaciones = {
  nombre: string;
  evaluaciones: {
    titulo: string;
    fecha: string;
    estado: string;
  }[];
};

@Component({
  selector: 'app-evaluaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-evaluaciones.component.html',
  styleUrls: ['./docente-evaluaciones.component.css'],
})
export class DocenteEvaluacionesComponent {
  readonly estados = ['Pendiente', 'En progreso', 'Evaluada'];

  grupos = signal<GrupoEvaluaciones[]>([]);

  grupoNombre = signal('');
  evaluacionTitulo = signal('');
  evaluacionFecha = signal('');
  evaluacionEstado = signal(this.estados[0]);

  agregarEvaluacion(event: Event): void {
    event.preventDefault();

    const nombre = this.grupoNombre().trim();
    const titulo = this.evaluacionTitulo().trim();
    const fecha = this.evaluacionFecha().trim();
    const estado = this.evaluacionEstado();

    if (!nombre || !titulo) {
      return;
    }

    const evaluacion = { titulo, fecha, estado };
    const gruposActuales = this.grupos();
    const indiceGrupo = gruposActuales.findIndex(
      (grupo) => grupo.nombre.toLowerCase() === nombre.toLowerCase()
    );

    if (indiceGrupo >= 0) {
      const grupoActualizado: GrupoEvaluaciones = {
        ...gruposActuales[indiceGrupo],
        evaluaciones: [...gruposActuales[indiceGrupo].evaluaciones, evaluacion],
      };

      this.grupos.set([
        ...gruposActuales.slice(0, indiceGrupo),
        grupoActualizado,
        ...gruposActuales.slice(indiceGrupo + 1),
      ]);
    } else {
      this.grupos.set([
        ...gruposActuales,
        {
          nombre,
          evaluaciones: [evaluacion],
        },
      ]);
    }

    this.evaluacionTitulo.set('');
    this.evaluacionFecha.set('');
    this.evaluacionEstado.set(this.estados[0]);
  }
}
