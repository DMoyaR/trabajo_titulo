import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'docente-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './docente-layout.component.html',
  styleUrls: ['./docente-layout.component.css']
})
export class DocenteLayoutComponent {}
