import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Evento = {
  id: string;
  titulo: string;
  hora: string;         // "HH:mm"
  lugar: string;
  descripcion: string;
};

type SummaryItem = {
  key: string;          // YYYY-MM-DD
  date: Date;
  items: (Evento & { key: string })[];
};

@Component({
  selector: 'docente-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent {
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

  /* ===== Eventos ===== */
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

  // CRUD local del modal "Eventos del día"
  form: Omit<Evento, 'id'> = { titulo: '', hora: '10:00', lugar: '', descripcion: '' };
  editId: string | null = null;

  openDayModal() {
    this.showDayModal.set(true);
    this.resetForm();
  }
  closeDayModal() {
    this.showDayModal.set(false);
    this.resetForm();
  }
  resetForm() {
    this.form = { titulo: '', hora: '10:00', lugar: '', descripcion: '' };
    this.editId = null;
  }
  addOrUpdateEvent() {
    const key = this.keyFor();
    if (!key) return;
    const list = [...(this._events()[key] ?? [])];
    if (this.editId) {
      const idx = list.findIndex(e => e.id === this.editId);
      if (idx >= 0) list[idx] = { id: this.editId, ...this.form };
    } else {
      list.push({ id: (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2), ...this.form });
    }
    this._events.update(map => ({ ...map, [key]: list }));
    this.resetForm();
  }
  editEvent(ev: Evento) {
    this.form = { titulo: ev.titulo, hora: ev.hora, lugar: ev.lugar, descripcion: ev.descripcion };
    this.editId = ev.id;
  }
  deleteEvent(id: string) {
    const key = this.keyFor();
    if (!key) return;
    const list = (this._events()[key] ?? []).filter(e => e.id !== id);
    this._events.update(map => ({ ...map, [key]: list }));
    if (this.editId === id) this.resetForm();
  }

  /* ===== Agendar reunión (única) ===== */
  showAgendarModal = signal(false);
  singleForm = {
    fecha: this.toInputDate(new Date()),
    hora: '10:00',
    titulo: '',
    lugar: '',
    descripcion: ''
  };

  openAgendar() {
    // si hay día seleccionado, precargo la fecha
    if (this.selectedDay()) {
      this.singleForm.fecha = this.toInputDate(new Date(this.year(), this.month(), this.selectedDay()!));
    }
    this.singleForm.hora = '10:00';
    this.singleForm.titulo = '';
    this.singleForm.lugar = '';
    this.singleForm.descripcion = '';
    this.showAgendarModal.set(true);
  }
  closeAgendar() { this.showAgendarModal.set(false); }

  submitAgendar() {
    const d = new Date(this.singleForm.fecha);
    const key = this.keyFor(d.getDate());
    if (!key) return;
    const evento: Evento = {
      id: (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2),
      titulo: this.singleForm.titulo,
      hora: this.singleForm.hora,
      lugar: this.singleForm.lugar,
      descripcion: this.singleForm.descripcion
    };
    const list = [...(this._events()[key] ?? []), evento];
    this._events.update(map => ({ ...map, [key]: list }));
    this.closeAgendar();
  }

  /* ===== Reunión continua (recurrente semanal) ===== */
  showContinuasModal = signal(false);
  recurForm = {
    inicio: this.toInputDate(new Date()),
    fin: this.toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 28)),
    // días de la semana seleccionados (0=lun ... 6=dom)
    dias: new Set<number>([(new Date().getDay() + 6) % 7]),
    intervaloSemanas: 1,
    hora: '10:00',
    titulo: '',
    lugar: '',
    descripcion: ''
  };

  openContinuas() {
    // set default al día seleccionado si hay
    if (this.selectedDay()) {
      const base = new Date(this.year(), this.month(), this.selectedDay()!);
      this.recurForm.inicio = this.toInputDate(base);
      this.recurForm.fin    = this.toInputDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 28));
      this.recurForm.dias = new Set<number>([(base.getDay() + 6) % 7]);
    }
    this.recurForm.intervaloSemanas = 1;
    this.recurForm.hora = '10:00';
    this.recurForm.titulo = '';
    this.recurForm.lugar = '';
    this.recurForm.descripcion = '';
    this.showContinuasModal.set(true);
  }
  closeContinuas() { this.showContinuasModal.set(false); }

  toggleDia(dow: number, checked: boolean) {
    if (checked) this.recurForm.dias.add(dow);
    else this.recurForm.dias.delete(dow);
    // fuerza nueva instancia para Angular (si lo necesitas)
    this.recurForm.dias = new Set(this.recurForm.dias);
  }

  submitContinuas() {
    const inicio = new Date(this.recurForm.inicio);
    const fin = new Date(this.recurForm.fin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio || this.recurForm.dias.size === 0) return;

    // Genera ocurrencias día por día, pero valida semana / intervalo
    const firstMondayBasedIndex = (d: Date) => Math.floor((d.getTime() - inicio.getTime()) / (7 * 24 * 3600 * 1000));
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const dow = (d.getDay() + 6) % 7; // 0=lun .. 6=dom
      if (!this.recurForm.dias.has(dow)) continue;

      // validar intervalo semanal (cada N semanas)
      const weeksFromStart = firstMondayBasedIndex(d);
      if (weeksFromStart % this.recurForm.intervaloSemanas !== 0) continue;

      const key = this.keyFor(d.getDate());
      if (!key) continue;

      const evento: Evento = {
        id: (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2),
        titulo: this.recurForm.titulo,
        hora: this.recurForm.hora,
        lugar: this.recurForm.lugar,
        descripcion: this.recurForm.descripcion
      };
      const list = [...(this._events()[key] ?? []), evento];
      this._events.update(map => ({ ...map, [key]: list }));
    }
    this.closeContinuas();
  }

  /* ===== Resumen de reuniones ===== */
  showResumenModal = signal(false);

  openResumen() { this.showResumenModal.set(true); }
  closeResumen() { this.showResumenModal.set(false); }

  // Resumen: próxima(s) 6 semanas desde hoy
  resumen = computed<SummaryItem[]>(() => {
    const from = new Date(); from.setHours(0,0,0,0);
    const to = new Date(from.getTime() + 42 * 24 * 3600 * 1000); // 6 semanas
    const out: { key: string; date: Date; items: (Evento & { key: string })[] }[] = [];

    const allKeys = Object.keys(this._events());
    for (const key of allKeys) {
      const [y, m, d] = key.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (dt < from || dt > to) continue;
      const items = (this._events()[key] ?? []).map(ev => ({ ...ev, key }));
      out.push({ key, date: dt, items });
    }

    // Ordena por fecha y por hora dentro de cada día
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

  // Demo para ver datos
  private seedDemoEvents() {
    const kToday = this.keyFor(this.selectedDay());
    const k15 = this.keyFor(15);
    const demo: Record<string, Evento[]> = {};
    if (kToday) {
      demo[kToday] = [
        { id: (crypto as any).randomUUID?.() ?? 'a1', titulo:'Reunión con guía', hora:'10:00', lugar:'Sala 204', descripcion:'Avance capítulo 2' },
        { id: (crypto as any).randomUUID?.() ?? 'a2', titulo:'Feedback documento', hora:'16:30', lugar:'Teams', descripcion:'Observaciones del borrador' }
      ];
    }
    demo[k15] = [
      { id: (crypto as any).randomUUID?.() ?? 'a3', titulo:'Corrección Informe 1', hora:'09:00', lugar:'Oficina 3', descripcion:'Correcciones de estilo' }
    ];
    this._events.set(demo);
  }
}