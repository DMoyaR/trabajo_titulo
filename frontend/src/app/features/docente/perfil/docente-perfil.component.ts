import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUserService, CurrentUserProfile } from '../../../shared/services/current-user.service';
import { ReunionesService, Reunion } from '../../../shared/services/reuniones.service';

interface UserProfile extends CurrentUserProfile {
  ultimoAcceso?: string;
  contrasena?: string;
}

interface ReunionCalendario {
  id: number;
  motivo: string;
  horaInicio: string;
  horaTermino: string;
  modalidad: string;
  estado: string;
  alumno: string | null;
  observaciones: string | null;
}


@Component({
  selector: 'docente-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈
  templateUrl: './docente-perfil.component.html',
  styleUrls: ['./docente-perfil.component.css'],
})
export class DocentePerfilComponent implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);
  private readonly reunionesService = inject(ReunionesService);

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

  meetingsLoading = false;
  meetingsError: string | null = null;

  private calendarMonth: Date;
  private readonly today: Date;
  private meetingsByDate: Record<string, ReunionCalendario[]> = {};
  private calendarMatrix: number[][] = [];
  private selectedDateKey: string | null = null;
  selectedDay: number | null = null;

  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  constructor() {
    const now = new Date();
    this.today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.selectedDay = now.getDate();
    this.selectedDateKey = this.buildDateKey(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth(),
      this.selectedDay,
    );
    this.buildCalendarGrid();
  }

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

      if (profile.id) {
        this.loadMeetings(profile.id);
      }
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

  /* ===== Reuniones en calendario ===== */
  get calendarWeeks(): number[][] {
    return this.calendarMatrix;
  }

  get calendarMonthLabel(): string {
    return `${this.monthNames[this.calendarMonth.getMonth()]} ${this.calendarMonth.getFullYear()}`;
  }

  get selectedMeetings(): ReunionCalendario[] {
    if (!this.selectedDateKey) {
      return [];
    }
    return this.meetingsByDate[this.selectedDateKey] ?? [];
  }

  get selectedDateLabel(): string {
    if (!this.selectedDateKey) {
      return '';
    }
    const [y, m, d] = this.selectedDateKey.split('-').map(Number);
    const monthName = this.monthNames[m - 1]?.toLowerCase() ?? '';
    return `${d} de ${monthName} de ${y}`;
  }

  get hasAnyMeeting(): boolean {
    return Object.keys(this.meetingsByDate).length > 0;
  }

  goToPreviousMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
    this.buildCalendarGrid();
    this.selectedDay = null;
    this.selectedDateKey = null;
    this.ensureSelectionForCurrentMonth();
  }

  goToNextMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    this.buildCalendarGrid();
    this.selectedDay = null;
    this.selectedDateKey = null;
    this.ensureSelectionForCurrentMonth();
  }

  goToToday(): void {
    const now = new Date();
    this.calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.buildCalendarGrid();
    this.selectedDay = null;
    this.selectedDateKey = null;
    this.ensureSelectionForCurrentMonth();
  }

  selectDay(day: number): void {
    if (!day) {
      return;
    }
    this.selectedDay = day;
    this.selectedDateKey = this.buildDateKey(
      this.calendarMonth.getFullYear(),
      this.calendarMonth.getMonth(),
      day,
    );
  }

  isToday(day: number): boolean {
    if (!day) {
      return false;
    }
    return (
      day === this.today.getDate() &&
      this.calendarMonth.getMonth() === this.today.getMonth() &&
      this.calendarMonth.getFullYear() === this.today.getFullYear()
    );
  }

  isSelected(day: number): boolean {
    return !!day && this.selectedDay === day;
  }

  hasMeetings(day: number): boolean {
    if (!day) {
      return false;
    }
    return this.hasMeetingsFor(day, this.calendarMonth.getFullYear(), this.calendarMonth.getMonth());
  }

  private loadMeetings(docenteId: number): void {
    this.meetingsLoading = true;
    this.meetingsError = null;
    this.reunionesService.listarReuniones({ docente: docenteId }).subscribe({
      next: (reuniones) => {
        this.meetingsByDate = this.mapMeetings(reuniones);
        this.meetingsLoading = false;
        this.ensureSelectionForCurrentMonth();
      },
      error: (err) => {
        console.error('No se pudieron cargar las reuniones del docente', err);
        this.meetingsLoading = false;
        const detail = err?.error?.detail;
        this.meetingsError =
          typeof detail === 'string'
            ? detail
            : 'No fue posible cargar las reuniones agendadas.';
      },
    });
  }

  private mapMeetings(reuniones: Reunion[]): Record<string, ReunionCalendario[]> {
    const mapped: Record<string, ReunionCalendario[]> = {};
    reuniones.forEach((reunion) => {
      if (!reunion.fecha) {
        return;
      }
      const key = reunion.fecha;
      const entry: ReunionCalendario = {
        id: reunion.id,
        motivo: reunion.motivo,
        horaInicio: reunion.horaInicio,
        horaTermino: reunion.horaTermino,
        modalidad: reunion.modalidad,
        estado: reunion.estado,
        alumno: reunion.alumno?.nombre ?? null,
        observaciones: reunion.observaciones ?? null,
      };
      if (!mapped[key]) {
        mapped[key] = [];
      }
      mapped[key].push(entry);
    });

    Object.values(mapped).forEach((items) => {
      items.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    });

    return mapped;
  }

  private buildCalendarGrid(): void {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7; // lunes = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: number[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push(0);
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push(d);
    }
    while (cells.length % 7 !== 0) {
      cells.push(0);
    }

    const weeks: number[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    this.calendarMatrix = weeks;
  }

  private ensureSelectionForCurrentMonth(): void {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();

    if (this.selectedDay) {
      this.selectedDateKey = this.buildDateKey(year, month, this.selectedDay);
      return;
    }

    if (year === this.today.getFullYear() && month === this.today.getMonth()) {
      this.selectedDay = this.today.getDate();
      this.selectedDateKey = this.buildDateKey(year, month, this.selectedDay);
      return;
    }

    const firstWithMeeting = this.findFirstMeetingDay(year, month);
    if (firstWithMeeting) {
      this.selectedDay = firstWithMeeting;
      this.selectedDateKey = this.buildDateKey(year, month, firstWithMeeting);
    } else {
      this.selectedDateKey = null;
    }
  }

  private findFirstMeetingDay(year: number, month: number): number | null {
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= totalDays; day++) {
      if (this.hasMeetingsFor(day, year, month)) {
        return day;
      }
    }
    return null;
  }

  private hasMeetingsFor(day: number, year: number, month: number): boolean {
    if (!day) {
      return false;
    }
    const key = this.buildDateKey(year, month, day);
    return (this.meetingsByDate[key] ?? []).length > 0;
  }

  private buildDateKey(year: number, month: number, day: number): string {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
}