
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: logout-success */
@Component({
  selector: 'auth-logout-success',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './logout-success.component.html',
  styleUrls: ['./logout-success.component.css'],
})
export class LogoutSuccessComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}