import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { CurrentUserService, CurrentUserProfile } from '../../../shared/services/current-user.service';

interface UserProfile extends CurrentUserProfile {
  ultimoAcceso?: string;
  contrasena?: string;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css'],
})
export class CoordinacionPerfilComponent implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);
  isEditing = false;

  userProfile: UserProfile = {
    id: null,
    rol: '',
    nombre: '',
    correo: '',
    rut: null,
    carrera: null,
    telefono: null,
    ultimoAcceso: '',
    contrasena: '',
  };

  editableProfile: UserProfile = { ...this.userProfile };
  isLoading = false;
  isSaving = false;

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  async loadUserProfile(): Promise<void> {
    this.isLoading = true;
    try {
      const profile = this.currentUserService.getProfile();
      if (!profile) {
        throw new Error('Perfil no disponible');
      }

      this.userProfile = {
        ...this.userProfile,
        ...profile,
      };
      this.editableProfile = { ...this.userProfile };
    } catch (error) {
      this.showErrorMessage('No se pudo cargar el perfil');
    } finally {
      this.isLoading = false;
    }
  }

  async saveProfile(): Promise<void> {
    if (!this.isFormValid()) {
      this.showErrorMessage('Por favor completa los campos requeridos');
      return;
    }
    this.isSaving = true;
    try {
      this.userProfile = { ...this.editableProfile };
      this.isEditing = false;
      this.showSuccessMessage('Perfil actualizado correctamente');
    } catch (error) {
      this.showErrorMessage('Error al actualizar el perfil');
    } finally {
      this.isSaving = false;
    }
  }

  async changePassword(): Promise<void> {
    const newPassword = prompt('Ingrese la nueva contraseña:');
    if (newPassword && newPassword.trim()) {
      this.showSuccessMessage('Contraseña actualizada correctamente');
    }
  }

  startEditing(): void {
    this.editableProfile = { ...this.userProfile };
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.editableProfile = { ...this.userProfile };
    this.isEditing = false;
  }

  closeSession(): void {
    if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      return;
    }

    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => this.router.navigateByUrl('/auth/login'),
    });
  }

  private showSuccessMessage(message: string): void {
    alert(message);
  }

  private showErrorMessage(message: string): void {
    alert(message);
  }

  isFormValid(): boolean {
    return !!(
      this.editableProfile.telefono?.trim() ||
      this.editableProfile.contrasena?.trim()
    );
  }
}