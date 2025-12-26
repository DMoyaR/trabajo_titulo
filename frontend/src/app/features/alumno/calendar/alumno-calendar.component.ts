import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CurrentUserService } from '../../../shared/services/current-user.service';
import { ReunionesService, Reunion, SolicitudReunion } from '../../../shared/services/reuniones.service';

type EstadoEvento = 'Pendiente' | 'Confirmada' | 'Rechazada' | 'Reprogramada';

type Evento = {
  id: string;
  titulo: string;
  hora: string;         // "HH:mm"
  lugar: string;
  descripcion: string;
  estado: EstadoEvento; // Alumno ve estado
};

type SummaryItem = {
  key: string;          // YYYY-MM-DD
  date: Date;
  items: (Evento & { key: string })[];
};

@Component({
  selector: 'alumno-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumno-calendar.component.html',
  styleUrls: ['./alumno-calendar.component.css']
})
export class AlumnoCalendarComponent implements OnInit {
  private readonly reunionesService = inject(ReunionesService);
  private readonly currentUserService = inject(CurrentUserService);

  private alumnoId: number | undefined = undefined;

  private mensajeSig = signal<string | null>(null);
  mensaje() { return this.mensajeSig(); }
  private setMensaje(value: string | null) { this.mensajeSig.set(value); }

  private errorSig = signal<string | null>(null);
  error() { return this.errorSig(); }
  private setError(value: string | null) { this.errorSig.set(value); }

  private cargandoSig = signal(false);
  cargando() { return this.cargandoSig(); }
  private setCargando(value: boolean) { this.cargandoSig.set(value); }

  private enviandoSig = signal(false);
  enviando() { return this.enviandoSig(); }
  private setEnviando(value: boolean) { this.enviandoSig.set(value); }
  /* ===== Estado base ===== */
  private ref = new Date();
  month = signal(this.ref.getMonth());
  year  = signal(this.ref.getFullYear());
  selectedDay = signal<number | null>(this.ref.getDate());
  today = new Date();

  weekDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  monthNames = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  /* ===== Calendario grande / mini ===== */
  weeks() {
    const y = this.year(), m = this.month();
    const firstW = (new Date(y, m, 1).getDay() + 6) % 7; // Lunes=0
    const last   = new Date(y, m + 1, 0).getDate();
    const cells: number[] = [];
    for (let i = 0; i < firstW; i++) cells.push(0);
    for (let d = 1; d <= last; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(0);
    const rows: number[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }
  miniWeeks() { return this.weeks(); }

  /* ===== Navegación ===== */
  prevMonth() {
    let m = this.month() - 1, y = this.year();
    if (m < 0) { m = 11; y--; }
    this.month.set(m); this.year.set(y); this.selectedDay.set(null);
    this.syncMini();
  }
  nextMonth() {
    let m = this.month() + 1, y = this.year();
    if (m > 11) { m = 0; y++; }
    this.month.set(m); this.year.set(y); this.selectedDay.set(null);
    this.syncMini();
  }
  goToday() {
    const t = new Date();
    this.month.set(t.getMonth());
    this.year.set(t.getFullYear());
    this.selectedDay.set(t.getDate());
    this.syncMini();
  }

  isToday(d: number) {
    if (!d) return false;
    return d === this.today.getDate() &&
           this.month() === this.today.getMonth() &&
           this.year()  === this.today.getFullYear();
  }
  isSelected(d: number) { return !!d && this.selectedDay() === d; }

  onDayClick(d: number) {
    if (!d) return;
    this.selectedDay.set(d);
    this.openDayModal();
  }

  /* ===== Mini: picker avanzado ===== */
  showMiniPicker = false;
  tempMonth = this.month();
  tempYear  = this.year();

  showRangeView = false;
  yearsInRange: number[] = [];
  yearRangeStart = this.year() - 6;
  yearRanges: { start: number; end: number }[] = [];

  constructor() {
    this.buildYearRange(this.yearRangeStart);
  }

  ngOnInit(): void {
    const perfil = this.currentUserService.getProfile();
    this.alumnoId = perfil?.id ?? undefined;

    if (this.alumnoId === undefined) {
      this.setError('No pudimos identificar tu usuario para agendar una reunión.');
      return;
    }

    this.cargarDatos();
  }

  private syncMini() {
    this.tempMonth = this.month();
    this.tempYear = this.year();
  }
  toggleMiniPicker() {
    this.syncMini();
    this.showMiniPicker = !this.showMiniPicker;
    this.showRangeView = false;
  }
  miniPrev() { this.prevMonth(); }
  miniNext() { this.nextMonth(); }

  applyMiniPicker() {
    this.month.set(this.tempMonth);
    this.year.set(this.tempYear);
    this.showMiniPicker = false;
  }
  cancelMiniPicker() {
    this.showMiniPicker = false;
    this.syncMini();
  }

  private buildYearRange(start: number) {
    this.yearRangeStart = start;
    this.yearsInRange = Array.from({ length: 12 }, (_, i) => start + i);
    const prev = Array.from({ length: 5 }, (_, i) => {
      const s = start - (5 - i) * 12;
      return { start: s, end: s + 11 };
    });
    const current = [{ start, end: start + 11 }];
    const next = Array.from({ length: 5 }, (_, i) => {
      const s = start + (i + 1) * 12;
      return { start: s, end: s + 11 };
    });
    this.yearRanges = [...prev, ...current, ...next];
  }
  prevYearsBlock() { this.buildYearRange(this.yearRangeStart - 12); }
  nextYearsBlock() { this.buildYearRange(this.yearRangeStart + 12); }
  selectYear(y: number) { this.tempYear = y; }
  showRanges() { this.showRangeView = true; }
  backToYears() { this.showRangeView = false; }
  pickRange(start: number) {
    this.buildYearRange(start);
    this.showRangeView = false;
  }

  /* ===== Eventos (solo lectura para Alumno, excepto solicitud) ===== */
  showDayModal = signal(false);

  // Mapa YYYY-MM-DD -> eventos
  private _events = signal<Record<string, Evento[]>>({});

  // badge en calendario
  eventsCount(day: number): number {
    if (!day) return 0;
    const key = this.keyFor(day);
    return key ? (this._events()[key]?.length ?? 0) : 0;
  }

  private keyFor(day: number | null = this.selectedDay(), date: Date | null = null) {
    if (!day) return '';
    const base = date ?? new Date(this.year(), this.month(), day);
    const y = base.getFullYear();
    const m = base.getMonth() + 1;
    const dd = String(day).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  dayEvents = computed(() => {
    const key = this.keyFor();
    return key ? (this._events()[key] ?? []) : [];
  });

  openDayModal() { this.showDayModal.set(true); }
  closeDayModal() { this.showDayModal.set(false); }

  /* ===== Solicitar reunión (única) ===== */
  showSolicitudModal = signal(false);
  solicitudForm = {
    fecha: this.toInputDate(new Date()),
    hora: '10:00',
    titulo: '',
    lugar: '',
    descripcion: ''
  };

  openSolicitar() {
    if (this.selectedDay()) {
      this.solicitudForm.fecha = this.toInputDate(new Date(this.year(), this.month(), this.selectedDay()!));
    }
    this.solicitudForm.hora = '10:00';
    this.solicitudForm.titulo = '';
    this.solicitudForm.lugar = '';
    this.solicitudForm.descripcion = '';
    this.showSolicitudModal.set(true);
  }
  closeSolicitar() { this.showSolicitudModal.set(false); }

  submitSolicitud() {
    if (this.alumnoId === undefined) {
      this.setError('No pudimos identificar tu usuario. Vuelve a iniciar sesión.');
      return;
    }

    const motivo = this.solicitudForm.descripcion?.trim() || this.solicitudForm.titulo.trim();
    if (!motivo) {
      this.setError('Debes indicar un título o descripción para tu solicitud.');
      return;
    }

    const disponibilidad = this.buildDisponibilidad();

    this.setEnviando(true);
    this.setError(null);
    this.setMensaje(null);

    this.reunionesService
      .crearSolicitud({
        alumno: this.alumnoId,
        motivo,
        disponibilidadSugerida: disponibilidad,
      })
      .subscribe({
        next: (solicitud) => {
          this.setEnviando(false);
          this.setMensaje('Tu solicitud fue enviada al docente guía.');
          this.closeSolicitar();
          this.registrarEventoDesdeSolicitud(solicitud);
        },
        error: (err) => {
          console.error('No se pudo enviar la solicitud de reunión', err);
          this.setEnviando(false);
          const detalle = err?.error?.detail;
          if (typeof detalle === 'string') {
            this.setError(detalle);
          } else {
            this.setError('Ocurrió un error al enviar la solicitud. Intenta nuevamente.');
          }
        },
      });
  }

  /* ===== Resumen (solo lectura) ===== */
  showResumenModal = signal(false);
  openResumen() { this.showResumenModal.set(true); }
  closeResumen() { this.showResumenModal.set(false); }

  resumen = computed<SummaryItem[]>(() => {
    const from = new Date(); from.setHours(0,0,0,0);
    const to = new Date(from.getTime() + 42 * 24 * 3600 * 1000); // 6 semanas
    const out: SummaryItem[] = [];

    const allKeys = Object.keys(this._events());
    for (const key of allKeys) {
      const [y, m, d] = key.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (dt < from || dt > to) continue;
      const items = (this._events()[key] ?? []).map(ev => ({ ...ev, key }));
      out.push({ key, date: dt, items });
    }

    out.sort((a, b) => a.date.getTime() - b.date.getTime());
    out.forEach(s => s.items.sort((a, b) => a.hora.localeCompare(b.hora)));
    return out;
  });

  /* ===== Util ===== */
  private toInputDate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private cargarDatos() {
    if (this.alumnoId === undefined) {
      return;
    }

    this.setCargando(true);
    this._events.set({});

    this.reunionesService.listarSolicitudes({ alumno: this.alumnoId }).subscribe({
      next: (solicitudes) => {
        this.sincronizarSolicitudes(solicitudes);
        this.reunionesService.listarReuniones({ alumno: this.alumnoId }).subscribe({
          next: (reuniones) => {
            this.sincronizarReuniones(reuniones);
            this.setCargando(false);
          },
          error: (err) => {
            console.error('No se pudieron cargar las reuniones del alumno', err);
            this.setError('No se pudieron cargar tus reuniones.');
            this.setCargando(false);
          },
        });
      },
      error: (err) => {
        console.error('No se pudieron cargar las solicitudes del alumno', err);
        this.setError('No se pudieron cargar tus solicitudes.');
        this.setCargando(false);
      },
    });
  }

  private buildDisponibilidad(): string {
    const fecha = this.solicitudForm.fecha;
    const hora = this.solicitudForm.hora;
    const lugar = this.solicitudForm.lugar?.trim();

    const partes = [`${fecha} ${hora}`];
    if (lugar) {
      partes.push(`Lugar: ${lugar}`);
    }
    return partes.join(' | ');
  }

  private registrarEventoDesdeSolicitud(solicitud: SolicitudReunion) {
    const fecha = this.fechaDesdeDisponibilidad(solicitud.disponibilidadSugerida) ?? solicitud.creadoEn;
    const hora = this.horaDesdeDisponibilidad(solicitud.disponibilidadSugerida) ?? this.solicitudForm.hora;
    const key = this.keyFor(fecha.getDate(), fecha);

    const estado: EstadoEvento =
      solicitud.estado === 'aprobada'
        ? 'Confirmada'
        : solicitud.estado === 'rechazada'
          ? 'Rechazada'
          : 'Pendiente';

    const e: Evento = {
      id: `sol-${solicitud.id}`,
      titulo: 'Solicitud de reunión',
      hora,
      lugar: solicitud.disponibilidadSugerida ?? '',
      descripcion: solicitud.motivo,
      estado,
    };

    const list = [...(this._events()[key] ?? []).filter((ev) => !ev.id.startsWith(`sol-${solicitud.id}`)), e];
    this._events.update((map) => ({ ...map, [key]: list }));
  }

  private sincronizarSolicitudes(solicitudes: SolicitudReunion[]) {
    solicitudes.forEach((solicitud) => this.registrarEventoDesdeSolicitud(solicitud));
  }

  private sincronizarReuniones(reuniones: Reunion[]) {
    reuniones.forEach((reunion) => {
      const fecha = new Date(reunion.fecha);
      const key = this.keyFor(fecha.getDate(), fecha);
      const e: Evento = {
        id: `reunion-${reunion.id}`,
        titulo: 'Reunión con docente guía',
        hora: reunion.horaInicio.slice(0, 5),
        lugar: reunion.modalidad === 'online' ? 'Modalidad online' : 'Modalidad presencial',
        descripcion: reunion.motivo,
        estado: reunion.estado === 'aprobada' ? 'Confirmada' : 'Reprogramada',
      };

      const list = [...(this._events()[key] ?? []).filter((ev) => !ev.id.startsWith(`reunion-${reunion.id}`)), e];
      this._events.update((map) => ({ ...map, [key]: list }));
    });
  }

  private fechaDesdeDisponibilidad(valor: string | null): Date | null {
    if (!valor) return null;
    const match = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match) return null;
    const fecha = new Date(`${match[1]}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private horaDesdeDisponibilidad(valor: string | null): string | null {
    if (!valor) return null;
    const match = valor.match(/\b(\d{2}:\d{2})\b/);
    return match ? match[1] : null;
  }
}