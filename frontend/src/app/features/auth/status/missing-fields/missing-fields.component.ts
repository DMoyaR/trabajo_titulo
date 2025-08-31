
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: missing-fields */
@Component({
  selector: 'auth-missing-fields',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './missing-fields.component.html',
  styleUrls: ['./missing-fields.component.css'],
})
export class MissingFieldsComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}