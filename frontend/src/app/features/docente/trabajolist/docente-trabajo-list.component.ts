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
  tab = signal<'i' | 'ii' | 'temas'>('i');
  grupos = signal([
    { nombre: 'Proyecto del primer grupo', estado: 'en curso', alert: '' },
    { nombre: 'Proyecto del segundo grupo', estado: 'en riesgo', alert: '⚠️' },
    { nombre: 'Proyecto del tercer grupo', estado: 'pendiente', alert: '' },
  ]);

  gruposII = signal([
    { nombre: 'Proyecto avanzado del cuarto grupo', estado: 'en revisión final', alert: '' },
    { nombre: 'Proyecto del quinto grupo', estado: 'pendiente de correcciones', alert: '⚠️' },
    { nombre: 'Proyecto del sexto grupo', estado: 'programado para defensa', alert: '' },
  ]);


temas = signal([
    {
      titulo: 'Eficiencia energética en edificios inteligentes',
      descripcion: 'Propuesta de mejoras en sistemas HVAC utilizando IoT.',
      estado: 'Inscrito',
    },
    {
      titulo: 'Plataforma web para gestión de laboratorios',
      descripcion: 'Aplicación para agendamiento y control de inventario.',
      estado: 'Disponible',
    },
    {
      titulo: 'Modelos predictivos para transporte público',
      descripcion: 'Uso de machine learning para anticipar la demanda.',
      estado: 'En revisión',
    },
  ]);
  isAddingTema = signal(false);

  toggleAgregarTema() {
    this.isAddingTema.update((value) => !value);
  }
}