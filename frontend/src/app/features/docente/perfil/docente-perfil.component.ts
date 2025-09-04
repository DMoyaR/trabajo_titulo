import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'docente-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-perfil.component.html',
  styleUrls: ['./docente-perfil.component.css'],
})
export class DocentePerfilComponent {
  tel = signal('');
}
