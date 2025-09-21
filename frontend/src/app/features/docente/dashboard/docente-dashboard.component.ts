import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DocenteDashboardComponent {
  menuOpen = true;
  
  rows = [
    { 
      estudiante: 'Ana López', 
      carrera: 'Ingeniería en Sistemas', 
      tipo: 'Tesis', 
      estado: 'Entregado',
      statusIcon: '✓',
      avance: 85 
    },
    { 
      estudiante: 'Carlos Díaz', 
      carrera: 'Administración', 
      tipo: 'Prácticas', 
      estado: 'Pendiente',
      statusIcon: '⚠',
      avance: 40 
    },
    { 
      estudiante: 'Valeria Molina', 
      carrera: 'Ingeniería Industrial', 
      tipo: 'Proyecto', 
      estado: 'En-plazo',
      statusIcon: '→',
      avance: 60 
    },
    { 
      estudiante: 'David Reyes', 
      carrera: 'Ingeniería en Sistemas', 
      tipo: 'Tesis', 
      estado: 'En-plazo',
      statusIcon: '→',
      avance: 75 
    },
    { 
      estudiante: 'María González', 
      carrera: 'Administración', 
      tipo: 'Prácticas', 
      estado: 'Entregado',
      statusIcon: '✓',
      avance: 100 
    }
  ];

  obs: string = '';
  obs2: string = '';

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a: ${section}`);
  }

  logout(): void {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) {
      console.log('Cerrando sesión...');
    }
  }
}