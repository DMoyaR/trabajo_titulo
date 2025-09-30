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

  // Selector temporal para mini calendario
  showModal = signal(false);
  tempMiniMonth = this.miniMonth();
  tempMiniYear = this.miniYear();
  showMiniPicker = false;

  // Día seleccionado
  selectedDay = signal<number | null>(null);

  nombresMeses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  diasSemana = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  constructor() {
    this.generarCalendario(this.month(), this.year());
    this.generarMiniCalendario(this.miniMonth(), this.miniYear());
  }

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

  generarMiniCalendario(m: number, y: number) {
    const cantDias = new Date(y, m+1, 0).getDate();
    this.miniStartDay.set(this.getOffsetDay(y,m));
    this.miniDays.set(Array.from({length:cantDias},(_,i)=>i+1));
  }

  prevMiniMonth(){ let m=this.tempMiniMonth-1; if(m<0)m=11; this.tempMiniMonth=m; }
  nextMiniMonth(){ let m=this.tempMiniMonth+1; if(m>11)m=0; this.tempMiniMonth=m; }

  toggleMiniPicker(){ this.showMiniPicker = !this.showMiniPicker; }

  applyMiniPicker() {
    this.miniMonth.set(this.tempMiniMonth);
    this.miniYear.set(this.tempMiniYear);
    this.generarMiniCalendario(this.miniMonth(), this.miniYear());
    this.showMiniPicker = false;
  }

  cancelMiniPicker() { this.tempMiniMonth=this.miniMonth(); this.tempMiniYear=this.miniYear(); this.showMiniPicker=false; }

  selectDay(d:number){
    this.selectedDay.set(d);
    this.month.set(this.miniMonth());
    this.year.set(this.miniYear());
    this.generarCalendario(this.month(), this.year());
  }
}
