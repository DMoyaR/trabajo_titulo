import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CurrentUserService, CurrentUserProfile } from '../../../shared/services/current-user.service';
import { ReunionesService, SolicitudReunion } from '../../../shared/services/reuniones.service';

interface UserProfile extends CurrentUserProfile {
  ultimoAcceso?: string;
  contrasena?: string;
}


@Component({
  selector: 'docente-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule], // 👈
  templateUrl: './docente-perfil.component.html',
  styleUrls: ['./docente-perfil.component.css'],
})
export class DocentePerfilComponent implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);
  private readonly reunionesService = inject(ReunionesService);
  private readonly fb = inject(FormBuilder);

  isEditing = false;

  private docenteId: number | null = null;

  solicitudes: SolicitudReunion[] = [];
  solicitudesCargando = false;
  solicitudesError: string | null = null;
  solicitudesMensaje: string | null = null;
  procesandoSolicitud = false;
  seleccionada: SolicitudReunion | null = null;
  modo: 'aprobar' | 'rechazar' | null = null;

  readonly aprobarForm = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    horaInicio: ['', Validators.required],
    horaTermino: ['', Validators.required],
    modalidad: ['presencial', Validators.required],
    comentario: [''],
  });

  readonly rechazoForm = this.fb.group({
    comentario: [''],
  });

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

  ngOnInit(): void {
    this.loadUserProfile();
  }

  async loadUserProfile(): Promise<void> {
    this.isLoading = true;
    try {
      const profile = this.currentUserService.getProfile();
      if (!profile?.id) {
        throw new Error('Perfil no disponible');
      }

      this.docenteId = profile.id;
      this.userProfile = {
        ...this.userProfile,
        ...profile,
      };
      this.editableProfile = { ...this.userProfile };
      this.cargarSolicitudes();
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
    const confirmed = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmed) {
      console.log('Cerrando sesión...');
    }
  }

  cargarSolicitudes(): void {
    if (!this.docenteId) {
      return;
    }

    this.solicitudesCargando = true;
    this.solicitudesError = null;

    this.reunionesService.listarSolicitudes({ docente: this.docenteId }).subscribe({
      next: (items) => {
        this.solicitudes = items;
        this.solicitudesCargando = false;
      },
      error: (err) => {
        console.error('No se pudieron cargar las solicitudes de reunión del docente', err);
        this.solicitudesError = 'No se pudieron cargar las solicitudes. Intenta nuevamente.';
        this.solicitudesCargando = false;
      },
    });
  }

  abrirAprobacion(solicitud: SolicitudReunion): void {
    this.seleccionada = solicitud;
    this.modo = 'aprobar';
    this.solicitudesMensaje = null;
    this.solicitudesError = null;
    this.aprobarForm.reset({
      fecha: '',
      horaInicio: '',
      horaTermino: '',
      modalidad: 'presencial',
      comentario: solicitud.disponibilidadSugerida ?? '',
    });
  }

  abrirRechazo(solicitud: SolicitudReunion): void {
    this.seleccionada = solicitud;
    this.modo = 'rechazar';
    this.solicitudesMensaje = null;
    this.solicitudesError = null;
    this.rechazoForm.reset({ comentario: '' });
  }

  cancelarAccion(): void {
    this.seleccionada = null;
    this.modo = null;
    this.aprobarForm.reset({
      fecha: '',
      horaInicio: '',
      horaTermino: '',
      modalidad: 'presencial',
      comentario: '',
    });
    this.rechazoForm.reset({ comentario: '' });
  }

  confirmarAprobacion(): void {
    const solicitud = this.seleccionada;
    if (!solicitud || this.modo !== 'aprobar' || !this.docenteId) {
      return;
    }

    if (this.aprobarForm.invalid) {
      this.aprobarForm.markAllAsTouched();
      return;
    }

    const formValue = this.aprobarForm.getRawValue();
    const modalidad = formValue.modalidad as 'presencial' | 'online';
    const comentarioNormalizado = formValue.comentario?.trim() || undefined;

    this.procesandoSolicitud = true;
    this.solicitudesError = null;
    this.solicitudesMensaje = null;

    this.reunionesService
      .aprobarSolicitud(solicitud.id, {
        docente: this.docenteId,
        fecha: formValue.fecha,
        horaInicio: formValue.horaInicio,
        horaTermino: formValue.horaTermino,
        modalidad,
        comentario: comentarioNormalizado,
      })
      .subscribe({
        next: () => {
          this.procesandoSolicitud = false;
          this.solicitudesMensaje = 'La reunión fue agendada correctamente.';
          this.cancelarAccion();
          this.cargarSolicitudes();
        },
        error: (err) => {
          console.error('No se pudo aprobar la solicitud de reunión', err);
          this.procesandoSolicitud = false;
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.solicitudesError = detalle;
          } else {
            this.solicitudesError = 'Ocurrió un error al agendar la reunión.';
          }
        },
      });
  }

  confirmarRechazo(): void {
    const solicitud = this.seleccionada;
    if (!solicitud || this.modo !== 'rechazar' || !this.docenteId) {
      return;
    }

    const comentario = this.rechazoForm.value.comentario?.trim() || undefined;

    this.procesandoSolicitud = true;
    this.solicitudesError = null;
    this.solicitudesMensaje = null;

    this.reunionesService
      .rechazarSolicitud(solicitud.id, { docente: this.docenteId, comentario })
      .subscribe({
        next: () => {
          this.procesandoSolicitud = false;
          this.solicitudesMensaje = 'La solicitud fue rechazada correctamente.';
          this.cancelarAccion();
          this.cargarSolicitudes();
        },
        error: (err) => {
          console.error('No se pudo rechazar la solicitud', err);
          this.procesandoSolicitud = false;
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.solicitudesError = detalle;
          } else {
            this.solicitudesError = 'No se pudo registrar el rechazo. Intenta nuevamente.';
          }
        },
      });
  }

  get solicitudesPendientes(): SolicitudReunion[] {
    return this.solicitudes.filter((item) => item.estado === 'pendiente');
  }

  get solicitudesResueltas(): SolicitudReunion[] {
    return this.solicitudes.filter((item) => item.estado !== 'pendiente');
  }

  estadoSolicitudLabel(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  }

  fechaHora(valor: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(valor);
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