
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: invalid-format */
@Component({
  selector: 'auth-invalid-format',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './invalid-format.component.html',
  styleUrls: ['./invalid-format.component.css'],
})
export class InvalidFormatComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}
