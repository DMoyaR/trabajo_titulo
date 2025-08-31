
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Reusable card for status screens (success/error) with UTEM styling */
@Component({
  selector: 'ui-status-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-card.component.html',
  styleUrls: ['./status-card.component.css'],
})
export class StatusCardComponent {
  @Input() logoSrc = 'assets/LOGOU.png';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() primaryText = 'Iniciar Sesión';
  @Input() primary?: () => void;
}