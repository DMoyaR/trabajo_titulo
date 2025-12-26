
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: bad-credentials */
@Component({
  selector: 'auth-bad-credentials',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './bad-credentials.component.html',
  styleUrls: ['./bad-credentials.component.css'],
})
export class BadCredentialsComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}