import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'docente-trabajo-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-trabajo-list.component.html',
  styleUrls: ['./docente-trabajo-list.component.css'],
})
export class DocenteTrabajoListComponent {
  tab = signal<'i'|'ii'>('i');
  grupos = signal([
    { nombre:'Proyecto del primer grupo', estado:'en curso', alert:'' },
    { nombre:'Proyecto del segundo grupo', estado:'en riesgo', alert:'⚠️' },
    { nombre:'Proyecto del tercer grupo', estado:'pendiente', alert:'' },
  ]);
}
