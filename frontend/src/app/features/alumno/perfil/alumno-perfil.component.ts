import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUserService, CurrentUserProfile } from '../../../shared/services/current-user.service';

type RestriccionAlumno = {
  titulo: string;
  descripcion: string;
};

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

  readonly restricciones = signal<RestriccionAlumno[]>([
    {
      titulo: 'Una postulación activa por alumno',
      descripcion:
        'Si ya tienes una postulación en estado pendiente, en revisión, aceptada o rechazada con observaciones no podrás crear otra hasta que se cierre la actual.',
    },
    {
      titulo: 'Sin edición de postulación tras el envío',
      descripcion:
        'Una vez enviada la postulación queda bloqueada. Solo vuelve a estar editable si el docente la marca como “observada”.',
    },
    {
      titulo: 'Contenido filtrado por carrera',
      descripcion:
        'Solo verás docentes, propuestas y temáticas asociadas a tu carrera (career_id/codigo_carrera) para asegurar la pertinencia del proceso.',
    },
    {
      titulo: 'Entregas solo en etapas habilitadas',
      descripcion:
        'Cada entrega se habilita únicamente si la etapa está activa y dentro de las fechas publicadas por la coordinación.',
    },
    {
      titulo: 'Entregas bloqueadas tras confirmar',
      descripcion:
        'Al confirmar una entrega el archivo queda protegido; el botón de edición se oculta para mantener la integridad documental.',
    },
    {
      titulo: 'Evaluaciones docentes cuando están publicadas',
      descripcion:
        'Los comentarios y resultados del docente solo se muestran cuando visible == true, tras la publicación de la retroalimentación.',
    },
    {
      titulo: 'Agendamiento condicionado a profesor guía',
      descripcion:
        'Solo puedes agendar reuniones si cuentas con profesor guía asignado y el calendario se encuentra publicado (docente_asignado y calendario_publicado).',
    },
    {
      titulo: 'Validación de archivos al subir',
      descripcion:
        'El sistema acepta únicamente archivos .pdf, .docx o .zip con un máximo de 25 MB, validado tanto en frontend como en backend.',
    },
    {
      titulo: 'Formularios completos',
      descripcion:
        'Las solicitudes y entregas se pueden enviar únicamente si todos los campos obligatorios están completos; no se permiten formularios incompletos.',
    },
    {
      titulo: 'Certificados tras finalizar el proceso',
      descripcion:
        'El certificado de aprobación se habilita solo si status_proceso == "finalizado" y evaluacion_final == "aprobada".',
    },
  ]);

  ngOnInit(): void {
    const profile = this.currentUserService.getProfile();
    if (profile) {
      this.userProfile = profile;
      this.tel = profile.telefono ?? '';
    }
  }
}