import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'alumno-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './alumno-layout.component.html',
  styleUrls: ['./alumno-layout.component.css']
})
export class AlumnoLayoutComponent {}
