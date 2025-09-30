import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UserProfile {
  nombre: string;
  correo: string;
  carrera: string;
  telefono?: string;
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
  menuOpen = true;
  isEditing = false;

  userProfile: UserProfile = {
    nombre: '',
    correo: '',
    carrera: '',
    telefono: '',
    ultimoAcceso: '',
    contrasena: '',
  };

  editableProfile: UserProfile = { ...this.userProfile };
  isLoading = false;
  isSaving = false;

  ngOnInit(): void {
    this.loadUserProfile();
  }

  async loadUserProfile(): Promise<void> {
    this.isLoading = true;
    try {
      this.userProfile = {
        nombre: 'Juan Pérez',
        correo: 'juan.perez@example.com',
        carrera: 'Ingeniería Informática',
        telefono: '+56912345678',
        ultimoAcceso: '25 de abril de 2024',
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

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(section: string): void {
    console.log(`Navegando a: ${section}`);
  }

  logout(): void {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) {
      console.log('Cerrando sesión...');
    }
  }

  closeSession(): void {
    this.logout();
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