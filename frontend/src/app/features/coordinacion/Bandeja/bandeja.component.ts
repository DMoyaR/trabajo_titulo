import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UserProfile {
  nombre: string;
  correo: string;
  carrera: string;
  telefono?: string;
  ultimoAcceso?: string;
  contrasena?: string;
}

@Component({
  selector: 'app-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bandeja.component.html',
  styleUrls: ['./bandeja.component.css'],
})
export class CoordinacionBandejaComponent {
  // Sidebar y menú
  menuOpen = true;

  // Bandeja de mensajes
  selected = signal(0);
  chats = signal([
    { nombre:'Gabriel Ruiz', asunto:'Informe final', mensajes:[
      { yo:false, t:'No olvides completar secciones.'},
      { yo:true,  t:'Recibido, enviaré avances.'},
    ]},
    { nombre:'Natalia Rojas', asunto:'Revisión de avance', mensajes:[{ yo:false, t:'Revisa la metodología.' } ]},
  ]);
  get chat(){ return this.chats()[this.selected()]; }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a: ${section}`);
  }

  logout(): void {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) console.log('Cerrando sesión...');
  }
}
