import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CurrentUserService } from '../../../shared/services/current-user.service';
import { ReunionesService, SolicitudReunion } from '../../../shared/services/reuniones.service';

type RestriccionDocente = {
  titulo: string;
  descripcion: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './docente-dashboard.component.html',
  styleUrls: ['./docente-dashboard.component.css']
})
export class DocenteDashboardComponent implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);
  private readonly reunionesService = inject(ReunionesService);
  private readonly fb = inject(FormBuilder);

  rows = [
    { 
      estudiante: 'Ana López', 
      carrera: 'Ingeniería en Sistemas', 
      tipo: 'Tesis', 
      estado: 'Entregado',
      statusIcon: '✓',
      avance: 85 
    },
    { 
      estudiante: 'Carlos Díaz', 
      carrera: 'Administración', 
      tipo: 'Prácticas', 
      estado: 'Pendiente',
      statusIcon: '⚠',
      avance: 40 
    },
    { 
      estudiante: 'Valeria Molina', 
      carrera: 'Ingeniería Industrial', 
      tipo: 'Proyecto', 
      estado: 'En-plazo',
      statusIcon: '→',
      avance: 60 
    },
    { 
      estudiante: 'David Reyes', 
      carrera: 'Ingeniería en Sistemas', 
      tipo: 'Tesis', 
      estado: 'En-plazo',
      statusIcon: '→',
      avance: 75 
    },
    { 
      estudiante: 'María González', 
      carrera: 'Administración', 
      tipo: 'Prácticas', 
      estado: 'Entregado',
      statusIcon: '✓',
      avance: 100 
    }
  ];

  obs: string = '';
  obs2: string = '';

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

  readonly restricciones = signal<RestriccionDocente[]>([
    {
      titulo: 'Visibilidad limitada por carrera',
      descripcion:
        'Solo puede revisar postulaciones y entregas de estudiantes asociados a su carrera mediante el filtro career_id/codigo_carrera.',
    },
    {
      titulo: 'Gestión restringida de propuestas',
      descripcion:
        'Únicamente visualiza y administra propuestas propias; las creadas por otros docentes permanecen bloqueadas para edición o eliminación.',
    },
    {
      titulo: 'Sin cambios en propuestas con postulaciones activas',
      descripcion:
        'Cuando con_postulaciones == true la propuesta queda fija y no puede ser actualizada mientras existan postulantes asociados.',
    },
    {
      titulo: 'Aceptación válida solo para sus propuestas',
      descripcion:
        'Puede aceptar estudiantes únicamente si se postularon a sus propuestas; no es posible autoasignarse postulantes externos.',
    },
    {
      titulo: 'Actas tras finalizar rúbricas y retroalimentación',
      descripcion:
        'La carga de actas se habilita una vez completada la evaluación por rúbrica y publicada la retroalimentación correspondiente.',
    },
    {
      titulo: 'Agenda activa para recibir solicitudes',
      descripcion:
        'Las reuniones se pueden agendar solo si el docente publicó disponibilidad; se requiere calendario_publicado == true.',
    },
    {
      titulo: 'Acceso a entregas exclusivamente de estudiantes asignados',
      descripcion:
        'El sistema valida docente_id contra el grupo o trabajo para impedir la visualización de entregas ajenas.',
    },
    {
      titulo: 'Retroalimentación dentro de la ventana de etapa',
      descripcion:
        'La plataforma permite emitir comentarios cuando la etapa respectiva está activa según la coordinación.',
    },
    {
      titulo: 'Sin eliminación de entregas ni propuestas publicadas',
      descripcion:
        'No es posible eliminar registros ya publicados o con historial, garantizando trazabilidad institucional.',
    },
    {
      titulo: 'Certificados reservados a coordinación',
      descripcion:
        'La emisión o validación final de certificados corresponde a Coordinación/Dirección; el rol docente no tiene acceso.',
    },
    {
      titulo: 'Formatos y tamaño controlados al subir documentos',
      descripcion:
        'Solo se aceptan archivos PDF, DOCX o ZIP con peso máximo de 25 MB, validado tanto en frontend como backend.',
    },
    {
      titulo: 'Rúbricas editables fuera de etapas activas',
      descripcion:
        'No se pueden modificar rúbricas durante una fase en curso; las actualizaciones deben realizarse antes de iniciar la etapa.',
    },
    {
      titulo: 'Reportes circunscritos a estudiantes supervisados',
      descripcion:
        'Los paneles de datos muestran únicamente estadísticas de los estudiantes bajo su supervisión; no hay acceso a dashboards globales.',
    },
  ]);

  ngOnInit(): void {
    this.cargarDocente();
  }

  private cargarDocente(): void {
    const profile = this.currentUserService.getProfile();
    if (!profile?.id) {
      this.solicitudesError = 'No se pudo obtener el perfil del docente.';
      return;
    }

    this.docenteId = profile.id;
    this.cargarSolicitudes();
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
}