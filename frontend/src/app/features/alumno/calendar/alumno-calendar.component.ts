import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'alumno-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-calendar.component.html',
  styleUrls: ['./alumno-calendar.component.css']
})
export class AlumnoCalendarComponent {
  showModal = signal(false);

  toggleModal() {
    this.showModal.set(!this.showModal());
  }
}
