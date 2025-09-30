import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'docente-bandeja',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-bandeja.component.html',
  styleUrls: ['./docente-bandeja.component.css'],
})
export class DocenteBandejaComponent {
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
}