import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'alumno-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
  <aside class="sidebar-wrap" [class.collapsed]="collapsed()">
    <div class="brand">
      <img src="assets/utem.png" alt="UTEM" class="brand-logo" />
      <span class="brand-title">Alumno</span>
      <button class="collapse-btn" (click)="toggle()" [attr.aria-label]="collapsed() ? 'Expandir' : 'Colapsar'">☰</button>
    </div>

    <nav class="menu">
      <a routerLink="/alumno/dashboard"     routerLinkActive="active" class="item"><span class="icon">🏠</span><span class="label">Dashboard</span></a>
      <a routerLink="/alumno/calendar"      routerLinkActive="active" class="item"><span class="icon">📅</span><span class="label">Calendar</span></a>
      <a routerLink="/alumno/notifications" routerLinkActive="active" class="item"><span class="icon">🔔</span><span class="label">Notifications</span></a>
      <a routerLink="/alumno/trabajo"       routerLinkActive="active" class="item"><span class="icon">🧩</span><span class="label">Trabajo</span></a>
      <a routerLink="/alumno/perfil"        routerLinkActive="active" class="item"><span class="icon">👤</span><span class="label">Perfil</span></a>
      <a routerLink="/alumno/reuniones"     routerLinkActive="active" class="item"><span class="icon">🤝</span><span class="label">Reuniones</span></a>
      <a routerLink="/alumno/bandeja"       routerLinkActive="active" class="item"><span class="icon">📥</span><span class="label">Bandeja</span></a>
      <a routerLink="/alumno/docs"          routerLinkActive="active" class="item"><span class="icon">📄</span><span class="label">Docs</span></a>
      <a routerLink="/alumno/evaluations"   routerLinkActive="active" class="item"><span class="icon">📝</span><span class="label">Evaluations</span></a>
      <a routerLink="/alumno/entrega"       routerLinkActive="active" class="item"><span class="icon">📤</span><span class="label">Entrega</span></a>
      <a routerLink="/alumno/practica"      routerLinkActive="active" class="item"><span class="icon">🛠️</span><span class="label">Práctica</span></a>
      <a routerLink="/alumno/viewer"        routerLinkActive="active" class="item"><span class="icon">👀</span><span class="label">Viewer</span></a>
    </nav>
  </aside>
  `,
  styles: [`
    .sidebar-wrap { display:flex; flex-direction:column; height:100%; }
    .brand { display:grid; grid-template-columns:40px 1fr 36px; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid #ececec; }
    .brand-logo { width:36px; height:36px; object-fit:contain; }
    .brand-title { font-weight:700; }
    .collapse-btn { border:none; background:transparent; font-size:18px; cursor:pointer; }

    .menu { padding:8px; display:flex; flex-direction:column; gap:4px; }
    .item { display:grid; grid-template-columns:28px 1fr; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; text-decoration:none; color:#222; }
    .item:hover { background:#f0f3ff; }
    .item.active { background:#e6ecff; font-weight:600; }
    .icon { text-align:center; font-size:18px; }
    .label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .collapsed .brand { grid-template-columns:40px 0 36px; }
    .collapsed .brand-title { display:none; }
    .collapsed .item { grid-template-columns:28px 0; }
    .collapsed .label { display:none; }
  `]
})
export class AlumnoSidebarComponent {
  private _collapsed = signal(false);
  collapsed = computed(() => this._collapsed());
  toggle() { this._collapsed.set(!this._collapsed()); }
}
    
