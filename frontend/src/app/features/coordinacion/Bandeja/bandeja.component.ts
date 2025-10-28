import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bandeja',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bandeja.component.html',
  styleUrls: ['./bandeja.component.css'],
})
export class CoordinacionBandejaComponent {
  readonly selected = signal(0);
  readonly chats = signal([
    {
      nombre: 'Gabriel Ruiz',
      asunto: 'Informe final',
      mensajes: [
        { yo: false, t: 'No olvides completar secciones.' },
        { yo: true, t: 'Recibido, enviaré avances.' },
      ],
    },
    {
      nombre: 'Natalia Rojas',
      asunto: 'Revisión de avance',
      mensajes: [{ yo: false, t: 'Revisa la metodología.' }],
    },
  ]);

  readonly chat = computed(() => {
    const conversations = this.chats();
    if (!conversations.length) {
      return undefined;
    }

    const index = this.selected();
    if (index < 0 || index >= conversations.length) {
      return conversations[0];
    }

    return conversations[index];
  });
}
