
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: email-sent-success */
@Component({
  selector: 'auth-email-sent-success',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './email-sent-success.component.html',
  styleUrls: ['./email-sent-success.component.css'],
})
export class EmailSentSuccessComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}
