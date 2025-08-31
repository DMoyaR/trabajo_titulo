
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: login-success */
@Component({
  selector: 'auth-login-success',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './login-success.component.html',
  styleUrls: ['./login-success.component.css'],
})
export class LoginSuccessComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}