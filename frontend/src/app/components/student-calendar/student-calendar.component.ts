import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MeetingRequestService } from '../../services/meeting-request.service';

type FormModel = {
  studentName: string;
  date: string;
  time: string;
  title: string;
  location: string;
  description: string;
};

@Component({
  selector: 'app-student-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-calendar.component.html',
  styleUrl: './student-calendar.component.css'
})
export class StudentCalendarComponent {
  formModel = signal<FormModel>({
    studentName: 'Alumno',
    date: '',
    time: '',
    title: '',
    location: '',
    description: ''
  });

  submitted = signal(false);

  readonly lastRequests = computed(() =>
    this.meetingService
      .allRequests()
      .filter((req) => req.studentName === this.formModel().studentName)
      .slice(-3)
      .reverse()
  );

  constructor(private readonly meetingService: MeetingRequestService) {}

  updateField<K extends keyof FormModel>(field: K, value: FormModel[K]) {
    this.submitted.set(false);
    this.formModel.update((current) => ({ ...current, [field]: value }));
  }

  submit() {
    const value = this.formModel();
    if (!value.date || !value.time || !value.title) {
      this.submitted.set(false);
      return;
    }

    this.meetingService.addRequest(value);
    this.submitted.set(true);
    this.formModel.set({
      studentName: value.studentName,
      date: '',
      time: '',
      title: '',
      location: '',
      description: ''
    });
  }
}
