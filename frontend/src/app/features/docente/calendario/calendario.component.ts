import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CurrentUserService } from '../../../shared/services/current-user.service';
import {
  ReunionesService,
  Reunion,
  SolicitudReunion,
} from '../../../shared/services/reuniones.service';

type Evento = {
  id: string;
  titulo: string;
  hora: string;         // "HH:mm"
  lugar: string;
  descripcion: string;
  alumno?: string | null;
  proyecto?: string | null;
  grupo?: string | null;
  estado?: string;
  origen?: 'manual' | 'reunion';
};

type SummaryItem = {
  key: string;          // YYYY-MM-DD
  date: Date;
  items: (Evento & { key: string })[];
};

@Component({
  selector: 'docente-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit {
  /* ===== Estado base ===== */
  private ref = new Date();
  month = signal(this.ref.getMonth());
  year  = signal(this.ref.getFullYear());
  selectedDay = signal<number | null>(this.ref.getDate());
  today = new Date();

  private readonly currentUserService = inject(CurrentUserService);
  private readonly reunionesService = inject(ReunionesService);
  private readonly fb = inject(FormBuilder);

  private docenteId: number | null = null;

  solicitudes: SolicitudReunion[] = [];
  solicitudesCargando = false;
  solicitudesError: string | null = null;
  solicitudesMensaje: string | null = null;
  procesandoSolicitud = false;
  seleccionada: SolicitudReunion | null = null;
  modo: 'aprobar' | 'rechazar' | null = null;

  showSolicitudesModal = signal(false);

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
    const profile = this.currentUserService.getProfile();
    if (!profile?.id) {
      return;
    }

    this.docenteId = profile.id;
    this.cargarReuniones();
    this.cargarSolicitudes();
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

  // CORRECCIÓN: Ahora acepta una fecha completa como parámetro opcional
  private keyFor(day: number | null = this.selectedDay(), date?: Date) {
    if (!day && !date) return '';
    
    let y: number, m: number, d: number;
    
    if (date) {
      // Si se proporciona una fecha completa, usar sus valores
      y = date.getFullYear();
      m = date.getMonth() + 1;
      d = date.getDate();
    } else {
      // Usar el mes/año actual del calendario
      y = this.year();
      m = this.month() + 1;
      d = day!;
    }
    
    const dd = String(d).padStart(2, '0');
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

  private proyectosSet = new Set<string>();
  proyectosDisponibles: string[] = [];

  private registrarProyecto(nombre?: string | null) {
    const normalizado = nombre?.trim();
    if (!normalizado) {
      return;
    }

    if (!this.proyectosSet.has(normalizado)) {
      this.proyectosSet.add(normalizado);
      this.proyectosDisponibles = Array.from(this.proyectosSet).sort((a, b) => a.localeCompare(b));
    }
  }

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
    proyecto: '',
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
    this.singleForm.proyecto = '';
    this.singleForm.titulo = '';
    this.singleForm.lugar = '';
    this.singleForm.descripcion = '';
    this.showAgendarModal.set(true);
  }
  closeAgendar() { this.showAgendarModal.set(false); }

  submitAgendar() {
    const d = new Date(this.singleForm.fecha);
    // CORRECCIÓN: Pasar la fecha completa al keyFor
    const key = this.keyFor(d.getDate(), d);
    if (!key) return;
    const proyecto = this.singleForm.proyecto?.trim() || null;
    this.registrarProyecto(proyecto);
    const evento: Evento = {
      id: (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2),
      proyecto,
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
    proyecto: '',
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
    this.recurForm.proyecto = '';
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

    const proyecto = this.recurForm.proyecto?.trim() || null;
    this.registrarProyecto(proyecto);

    // Genera ocurrencias día por día, pero valida semana / intervalo
    const firstMondayBasedIndex = (d: Date) => Math.floor((d.getTime() - inicio.getTime()) / (7 * 24 * 3600 * 1000));
    
    // CORRECCIÓN: Iterar sobre todas las fechas entre inicio y fin
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const dow = (d.getDay() + 6) % 7; // 0=lun .. 6=dom
      if (!this.recurForm.dias.has(dow)) continue;

      // validar intervalo semanal (cada N semanas)
      const weeksFromStart = firstMondayBasedIndex(d);
      if (weeksFromStart % this.recurForm.intervaloSemanas !== 0) continue;

      // CORRECCIÓN: Pasar la fecha completa al keyFor
      const key = this.keyFor(d.getDate(), new Date(d)); // Crear nueva instancia de la fecha
      if (!key) continue;

      const evento: Evento = {
        id: (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2),
        proyecto,
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

  exportResumenCsv() {
    const summary = this.resumen();
    if (!summary.length || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const lines: string[] = ['Fecha,Hora,Título,Lugar,Descripción'];
    for (const day of summary) {
      const dateLabel = this.toInputDate(day.date);
      for (const ev of day.items) {
        const row = [
          this.csvCell(dateLabel),
          this.csvCell(ev.hora),
          this.csvCell(ev.titulo),
          this.csvCell(ev.lugar),
          this.csvCell(ev.descripcion)
        ].join(',');
        lines.push(row);
      }
    }

    if (lines.length === 1) {
      return;
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `resumen-reuniones-${this.timestamp()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private csvCell(value: string | undefined) {
    const normalized = (value ?? '').replace(/\r?\n|\r/g, ' ').trim();
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  private timestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${min}`;
  }

  /* ===== Solicitudes de reunión ===== */
  get solicitudesPendientes(): SolicitudReunion[] {
    return this.solicitudes.filter((item) => item.estado === 'pendiente');
  }

  get solicitudesResueltas(): SolicitudReunion[] {
    return this.solicitudes.filter((item) => item.estado !== 'pendiente');
  }

  toggleSolicitudes(): void {
    this.showSolicitudesModal.update((value) => !value);
    this.solicitudesMensaje = null;
    this.solicitudesError = null;
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
        items.forEach((item) => this.registrarProyecto(item.proyectoNombre));
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
        next: (reunion) => {
          this.procesandoSolicitud = false;
          this.solicitudesMensaje = 'La reunión fue agendada correctamente.';
          this.cancelarAccion();
          this.cargarSolicitudes();
          this.agregarReunionAlCalendario(reunion);
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

  estadoReunionLabel(estado: string | undefined): string {
    switch (estado) {
      case 'aprobada':
        return 'Agendada';
      case 'finalizada':
        return 'Finalizada';
      case 'no_realizada':
        return 'No realizada';
      case 'reprogramada':
        return 'Reprogramada';
      default:
        return estado ?? '';
    }
  }

  fechaHora(valor: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(valor);
  }

  /* ===== Sincronización de reuniones ===== */
  private cargarReuniones(): void {
    if (!this.docenteId) {
      return;
    }

    this.reunionesService.listarReuniones({ docente: this.docenteId }).subscribe({
      next: (items) => {
        const mapa: Record<string, Evento[]> = {};
        items.forEach((reunion) => {
          this.registrarProyecto(reunion.proyectoNombre);
          this.agregarReunionAlCalendario(reunion, mapa);
        });
        this._events.set(mapa);
      },
      error: (err) => {
        console.error('No se pudieron cargar las reuniones del docente', err);
      },
    });
  }

  private agregarReunionAlCalendario(reunion: Reunion, mapa?: Record<string, Evento[]>): void {
    const date = this.parseDateOnly(reunion.fecha);
    const key = this.keyFor(date.getDate(), date);
    if (!key) {
      return;
    }

    this.registrarProyecto(reunion.proyectoNombre);

    const evento: Evento = {
      id: `reunion-${reunion.id}`,
      titulo: reunion.motivo || 'Reunión agendada',
      hora: reunion.horaInicio,
      lugar: reunion.modalidad === 'online' ? 'Online' : 'Presencial',
      descripcion: reunion.observaciones || '',
      alumno: reunion.alumno?.nombre ?? null,
      proyecto: reunion.proyectoNombre ?? null,
      grupo: reunion.grupoNombre ?? null,
      estado: reunion.estado,
      origen: 'reunion',
    };

    const targetMap = mapa ?? this._events();
    const list = [...(targetMap[key] ?? [])].filter((item) => item.id !== evento.id);
    list.push(evento);
    list.sort((a, b) => a.hora.localeCompare(b.hora));

    if (mapa) {
      mapa[key] = list;
    } else {
      this._events.update((map) => ({ ...map, [key]: list }));
    }
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
  }

  /* ===== Util ===== */
  private toInputDate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

}