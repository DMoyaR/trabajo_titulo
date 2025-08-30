
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusCardComponent } from '../../status-card/status-card.component';

/** Auto-generated status screen: temp-disabled */
@Component({
  selector: 'auth-temp-disabled',
  standalone: true,
  imports: [CommonModule, StatusCardComponent],
  templateUrl: './temp-disabled.component.html',
  styleUrls: ['./temp-disabled.component.css'],
})
export class TempDisabledComponent {
  constructor(private router: Router) {}
  goLogin(){ this.router.navigateByUrl('/auth/login'); }
}
