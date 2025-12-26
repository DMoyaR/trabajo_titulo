
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: locked */
@Component({
  selector: 'auth-locked',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './locked.component.html',
  styleUrls: ['./locked.component.css'],
})
export class LockedComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}