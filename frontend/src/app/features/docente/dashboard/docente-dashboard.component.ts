import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type RestriccionDocente = {
  titulo: string;
  descripcion: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './docente-dashboard.component.html',
  styleUrls: ['./docente-dashboard.component.css']
})
export class DocenteDashboardComponent {
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
}
