import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUserService, CurrentUserProfile } from '../../../shared/services/current-user.service';

interface Restriccion {
  titulo: string;
  descripcion: string;
}

@Component({
  selector: 'alumno-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumno-perfil.component.html',
  styleUrls: ['./alumno-perfil.component.css'],
})
export class AlumnoPerfilComponent implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);

  private readonly restriccionesData: Restriccion[] = [
    {
      titulo: 'Respetar los plazos establecidos',
      descripcion: 'Debes cumplir con las fechas límite indicadas por la universidad para cada entrega.',
    },
    {
      titulo: 'Uso responsable de la plataforma',
      descripcion: 'Evita compartir tus credenciales y mantén la seguridad de tu cuenta.',
    },
    {
      titulo: 'Actualización de datos personales',
      descripcion: 'Mantén tu información de contacto actualizada para recibir notificaciones importantes.',
    },
    {
      titulo: 'Comunicación respetuosa',
      descripcion: 'Trata con respeto a docentes y compañeros en todos los canales oficiales.',
    },
    {
      titulo: 'Entrega de documentación válida',
      descripcion: 'Los documentos enviados deben ser legibles y corresponder a los formatos solicitados.',
    },
    {
      titulo: 'Uso adecuado de recursos compartidos',
      descripcion: 'No elimines ni modifiques archivos que no sean de tu autoría sin autorización.',
    },
    {
      titulo: 'Participación en reuniones programadas',
      descripcion: 'Confirma tu asistencia o justifica tus ausencias con anticipación.',
    },
    {
      titulo: 'Respeto por la propiedad intelectual',
      descripcion: 'Asegúrate de citar correctamente las fuentes utilizadas en tus trabajos.',
    },
    {
      titulo: 'Cumplimiento del reglamento institucional',
      descripcion: 'Revisa y cumple con las normas establecidas por tu carrera y la universidad.',
    },
    {
      titulo: 'Uso responsable de los canales de soporte',
      descripcion: 'Utiliza los medios oficiales de soporte únicamente para consultas relacionadas con tu práctica.',
    },
  ];

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

  restricciones(): Restriccion[] {
    return this.restriccionesData;
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