
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: temp-error */
@Component({
  selector: 'auth-temp-error',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './temp-error.component.html',
  styleUrls: ['./temp-error.component.css'],
})
export class TempErrorComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}