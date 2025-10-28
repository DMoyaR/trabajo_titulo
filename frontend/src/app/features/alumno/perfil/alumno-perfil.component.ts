import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUserService, CurrentUserProfile } from '../../../shared/services/current-user.service';

/** Perfil de usuario (ESTUDIANTE_13) */
@Component({
  selector: 'alumno-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumno-perfil.component.html',
  styleUrls: ['./alumno-perfil.component.css'],
})
export class AlumnoPerfilComponent implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);

  userProfile: CurrentUserProfile | null = null;
  tel = '';

  ngOnInit(): void {
    const profile = this.currentUserService.getProfile();
    if (profile) {
      this.userProfile = profile;
      this.tel = profile.telefono ?? '';
    }
  }
}
