import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'docente-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './docente-dashboard.component.html',
  styleUrls: ['./docente-dashboard.component.css'],
})
export class DocenteDashboardComponent {
  rows = [
    { estudiante:'Ana Gómez', correo:'ana@utem.cl', tipo:'TT', estado:'Público', avance:80 },
    { estudiante:'Carlos Peña', correo:'carlos@utem.cl', tipo:'Práctica', estado:'Privado', avance:40 },
    { estudiante:'José Riquelme', correo:'jose@utem.cl', tipo:'TT', estado:'Revisión', avance:55 },
    { estudiante:'Daniela Torres', correo:'dani@utem.cl', tipo:'TT', estado:'En curso', avance:25 },
  ];

  // propiedades simples para ngModel
  obs: string = '';
  obs2: string = '';
}

