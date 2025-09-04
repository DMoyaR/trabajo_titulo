import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈

@Component({
  selector: 'docente-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈
  templateUrl: './docente-perfil.component.html',
  styleUrls: ['./docente-perfil.component.css'],
})
export class DocentePerfilComponent {
  tel: string = ''; // 👈 para [(ngModel)]="tel"
}