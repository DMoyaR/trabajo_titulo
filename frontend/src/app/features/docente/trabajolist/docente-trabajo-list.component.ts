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
  //Lógica de Código 2 (Trabajo de Título)
  tab = signal<'i' | 'ii'>('i');
  grupos = signal([
    { 
      nombre: 'Proyecto del primer grupo', 
      alumnos: 'Alumno 1, Alumno 2',
      alert: '',
      status: 'check'
    },
    { 
      nombre: 'Proyecto del segundo grupo', 
      alumnos: 'Alumno 1, Alumno 2, Alumno 3',
      alert: '⚠️',
      status: ''
    },
    { 
      nombre: 'Proyecto del tercer grupo', 
      alumnos: 'Alumno 1',
      alert: '',
      status: 'check'
    },
    { 
      nombre: 'Proyecto del cuarto grupo', 
      alumnos: 'Alumno 1, Alumno 2',
      alert: '',
      status: 'check'
    },
    { 
      nombre: 'Proyecto del quinto grupo', 
      alumnos: 'Alumno 1',
      alert: '⚠️',
      status: ''
    },
    { 
      nombre: 'Proyecto del sexto grupo', 
      alumnos: 'Alumno 1, Alumno 2',
      alert: '',
      status: 'check'
    },
  ]);
}