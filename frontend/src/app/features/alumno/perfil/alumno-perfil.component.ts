import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** Perfil de usuario (ESTUDIANTE_13) */
@Component({
  selector: 'alumno-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumno-perfil.component.html',
  styleUrls: ['./alumno-perfil.component.css'],
})
export class AlumnoPerfilComponent {
  tel = signal('');
}
