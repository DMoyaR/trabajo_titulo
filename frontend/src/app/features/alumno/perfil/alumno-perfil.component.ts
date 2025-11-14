import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUserService, CurrentUserProfile } from '../../../shared/services/current-user.service';

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
  editableTel = '';
  editablePassword = '';
  ultimoAcceso = '';
  
  isEditing = false;
  isLoading = false;
  isSaving = false;

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    try {
      const profile = this.currentUserService.getProfile();
      if (!profile) {
        throw new Error('Perfil no disponible');
      }

      this.userProfile = profile;
      this.tel = profile.telefono ?? '';
      this.editableTel = this.tel;
      this.ultimoAcceso = ''; // Aquí puedes agregar la lógica para obtener el último acceso
    } catch (error) {
      this.showErrorMessage('No se pudo cargar el perfil');
    } finally {
      this.isLoading = false;
    }
  }

  saveProfile(): void {
    if (!this.isFormValid()) {
      this.showErrorMessage('Por favor completa los campos requeridos');
      return;
    }
    
    this.isSaving = true;
    try {
      this.tel = this.editableTel;
      this.isEditing = false;
      this.editablePassword = '';
      this.showSuccessMessage('Perfil actualizado correctamente');
    } catch (error) {
      this.showErrorMessage('Error al actualizar el perfil');
    } finally {
      this.isSaving = false;
    }
  }

  changePassword(): void {
    const newPassword = prompt('Ingrese la nueva contraseña:');
    if (newPassword && newPassword.trim()) {
      this.showSuccessMessage('Contraseña actualizada correctamente');
    }
  }

  startEditing(): void {
    this.editableTel = this.tel;
    this.editablePassword = '';
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.editableTel = this.tel;
    this.editablePassword = '';
    this.isEditing = false;
  }

  closeSession(): void {
    const confirmed = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmed) {
      console.log('Cerrando sesión...');
      // Aquí puedes agregar la lógica para cerrar sesión
    }
  }

  private showSuccessMessage(message: string): void {
    alert(message);
  }

  private showErrorMessage(message: string): void {
    alert(message);
  }

  private isFormValid(): boolean {
    return !!(
      this.editableTel?.trim() ||
      this.editablePassword?.trim()
    );
  }
}