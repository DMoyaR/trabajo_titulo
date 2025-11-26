import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingRequestService, MeetingStatus } from '../../services/meeting-request.service';

@Component({
  selector: 'app-teacher-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-requests.component.html',
  styleUrl: './teacher-requests.component.css'
})
export class TeacherRequestsComponent {
  constructor(private readonly meetingService: MeetingRequestService) {}

  requestsByStatus() {
    return this.meetingService.requestsByStatus();
  }

  changeStatus(id: string, status: MeetingStatus) {
    this.meetingService.updateStatus(id, status);
  }
}
