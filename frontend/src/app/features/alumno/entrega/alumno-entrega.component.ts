import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pantalla de Entrega (ESTUDIANTE_15)
 * - Muestra instrucciones y permite escoger tipo de presentación (URL, archivo, etc.)
 * - Es solo UI (mock) a la espera de integrar con API.
 */
@Component({
  selector: 'alumno-entrega',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-entrega.component.html',
  styleUrls: ['./alumno-entrega.component.css'],
})
export class AlumnoEntregaComponent {
  // Estado reactivo mínimo para los botones (solo visual)
  selected = signal<'url' | 'archivo' | 'mas' | null>(null);

  // Evento de carga de archivo (mock: guarda el nombre)
  archivoNombre = signal<string>('');
  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const name = input.files && input.files[0] ? input.files[0].name : '';
    this.archivoNombre.set(name);
  }
}
