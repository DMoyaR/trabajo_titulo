
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: email-not-linked */
@Component({
  selector: 'auth-email-not-linked',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './email-not-linked.component.html',
  styleUrls: ['./email-not-linked.component.css'],
})
export class EmailNotLinkedComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}
