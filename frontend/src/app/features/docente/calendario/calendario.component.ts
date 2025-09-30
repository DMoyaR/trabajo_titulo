import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent {
  today = new Date();
  menuOpen = true;

  // Calendario grande
  year = signal(this.today.getFullYear());
  month = signal(this.today.getMonth());
  days = signal<number[]>([]);
  startDay = signal(0);

  // Mini calendario
  miniMonth = signal(this.today.getMonth());
  miniYear = signal(this.today.getFullYear());
  miniDays = signal<number[]>([]);
  miniStartDay = signal(0);

  // Selector temporal
  showModal = signal(false);
  showMiniPicker = false;
  tempMiniMonth = this.miniMonth();
  tempMiniYear = this.miniYear();

  // Backup para cancelar
  backupMonth = this.miniMonth();
  backupYear = this.miniYear();

  // Selector de años
  showYearRanges = false;
  showRangeView = false;
  rangeStart = Math.floor(this.tempMiniYear / 10) * 10;
  rangeEnd = this.rangeStart + 9;

  // Día seleccionado
  selectedDay = signal<number | null>(null);

  nombresMeses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  diasSemana = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  constructor() {
    this.generarCalendario(this.month(), this.year());
    this.generarMiniCalendario(this.miniMonth(), this.miniYear());
  }

  // --- Calendario grande ---
  getOffsetDay(year: number, month: number): number {
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7; // lunes=0
  }

  mes(): string { return `${this.nombresMeses[this.month()]} ${this.year()}`; }

  generarCalendario(m: number, y: number) {
    const cantDias = new Date(y, m+1, 0).getDate();
    this.startDay.set(this.getOffsetDay(y, m));
    this.days.set(Array.from({length:cantDias}, (_,i)=>i+1));
  }

  prevMonth() {
    let m = this.month()-1, y=this.year();
    if(m<0){ m=11; y--; }
    this.month.set(m); this.year.set(y); this.generarCalendario(m,y);
  }

  nextMonth() {
    let m = this.month()+1, y=this.year();
    if(m>11){ m=0; y++; }
    this.month.set(m); this.year.set(y); this.generarCalendario(m,y);
  }

  goToday() {
    this.month.set(this.today.getMonth());
    this.year.set(this.today.getFullYear());
    this.selectedDay.set(this.today.getDate());
    this.generarCalendario(this.month(), this.year());
  }

  // --- Mini calendario ---
  generarMiniCalendario(m: number, y: number) {
    const cantDias = new Date(y, m+1, 0).getDate();
    this.miniStartDay.set(this.getOffsetDay(y,m));
    this.miniDays.set(Array.from({length:cantDias},(_,i)=>i+1));
  }

  prevMiniMonth() {
    let m = this.tempMiniMonth - 1;
    let y = this.tempMiniYear;
    if (m < 0) { m = 11; y--; }
    this.tempMiniMonth = m;
    this.tempMiniYear = y;
    this.miniMonth.set(m);
    this.miniYear.set(y);
    this.generarMiniCalendario(m, y);
  }

  nextMiniMonth() {
    let m = this.tempMiniMonth + 1;
    let y = this.tempMiniYear;
    if (m > 11) { m = 0; y++; }
    this.tempMiniMonth = m;
    this.tempMiniYear = y;
    this.miniMonth.set(m);
    this.miniYear.set(y);
    this.generarMiniCalendario(m, y);
  }

  toggleMiniPicker() {
    this.showMiniPicker = !this.showMiniPicker;
    this.showYearRanges = false;
    this.showRangeView = false;

    // Guardar estado actual
    this.backupMonth = this.tempMiniMonth;
    this.backupYear = this.tempMiniYear;
  }

  applyMiniPicker() {
    this.miniMonth.set(this.tempMiniMonth);
    this.miniYear.set(this.tempMiniYear);
    this.generarMiniCalendario(this.miniMonth(), this.miniYear());
    this.showMiniPicker = false;
    this.showYearRanges = false;
    this.showRangeView = false;
  }

  cancelMiniPicker() {
    // Restaurar valores anteriores
    this.tempMiniMonth = this.backupMonth;
    this.tempMiniYear = this.backupYear;

    this.showMiniPicker = false;
    this.showYearRanges = false;
    this.showRangeView = false;

    this.miniMonth.set(this.tempMiniMonth);
    this.miniYear.set(this.tempMiniYear);
    this.generarMiniCalendario(this.tempMiniMonth, this.tempMiniYear);
  }

  // --- Años y rangos ---
  get yearRanges(): {start:number,end:number}[] {
    const ranges = [];
    for (let i = this.rangeStart - 50; i <= this.rangeStart + 50; i += 10) {
      ranges.push({ start: i, end: i + 9 });
    }
    return ranges;
  }

  get yearsInRange(): number[] {
    const years = [];
    for(let y=this.rangeStart; y<=this.rangeEnd; y++) years.push(y);
    return years;
  }

  toggleYearSelector() {
    this.showYearRanges = !this.showYearRanges;
    this.showRangeView = false;
  }

  selectYear(y: number) {
    this.tempMiniYear = y;
    this.miniYear.set(y);
    this.generarMiniCalendario(this.tempMiniMonth, y);
    this.showYearRanges = false;
    this.showRangeView = false;
  }

  selectRange(start: number) {
    this.rangeStart = start;
    this.rangeEnd = start + 9;
    this.showRangeView = false;
  }

  // Navegación de rangos
  prevRange(){ this.rangeStart -= 100; this.rangeEnd = this.rangeStart + 9; }
  nextRange(){ this.rangeStart += 100; this.rangeEnd = this.rangeStart + 9; }

  // Navegación de años individuales
  prevYearsBlock(){ this.rangeStart -= 10; this.rangeEnd = this.rangeStart + 9; }
  nextYearsBlock(){ this.rangeStart += 10; this.rangeEnd = this.rangeStart + 9; }

  selectDay(d: number) {
    this.selectedDay.set(d);
    this.month.set(this.miniMonth());
    this.year.set(this.miniYear());
    this.generarCalendario(this.month(), this.year());
  }
}