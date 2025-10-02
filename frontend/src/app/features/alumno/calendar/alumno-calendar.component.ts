import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

type EstadoEvento = 'Pendiente' | 'Confirmada';

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
export class AlumnoCalendarComponent {
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
    this.seedDemoEvents(); // demo para ver datos
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

  private keyFor(day: number | null = this.selectedDay()) {
    if (!day) return '';
    const y = this.year();
    const m = this.month() + 1;
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
    // Alumno NO crea evento confirmado; solo registra "Pendiente" (placeholder)
    const d = new Date(this.solicitudForm.fecha);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const e: Evento = {
      id: (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2),
      titulo: this.solicitudForm.titulo,
      hora: this.solicitudForm.hora,
      lugar: this.solicitudForm.lugar,
      descripcion: this.solicitudForm.descripcion,
      estado: 'Pendiente'
    };
    const list = [...(this._events()[key] ?? []), e];
    this._events.update(map => ({ ...map, [key]: list }));
    this.closeSolicitar();

    // En producción: POST /solicitudes (aprobación docente)
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

  // Demo: mezcla Confirmada y Pendiente
  private seedDemoEvents() {
    const kToday = this.keyFor(this.selectedDay());
    const k18 = `${this.year()}-${String(this.month()+1).padStart(2,'0')}-18`;
    const demo: Record<string, Evento[]> = {};

    if (kToday) {
      demo[kToday] = [
        { id: 'e1', titulo:'Reunión con guía', hora:'10:00', lugar:'Sala 204', descripcion:'Avance capítulo 2', estado:'Confirmada' },
        { id: 'e2', titulo:'Solicitud retroalimentación', hora:'16:30', lugar:'Teams', descripcion:'Feedback del borrador', estado:'Pendiente' }
      ];
    }
    demo[k18] = [
      { id:'e3', titulo:'Corrección Informe 1', hora:'09:00', lugar:'Oficina 3', descripcion:'Correcciones de estilo', estado:'Confirmada' }
    ];
    this._events.set(demo);
  }
}
