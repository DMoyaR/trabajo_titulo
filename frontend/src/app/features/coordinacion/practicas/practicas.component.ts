import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type Estado = 'pendiente' | 'aprobado' | 'rechazado';

interface Escuela {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}

interface SolicitudCarta {
  id: string;
  creadoEn: string;
  alumno: {
    rut: string;
    nombres: string;
    apellidos: string;
    carrera: string;
  };
  practica: {
    jefeDirecto: string;
    cargoAlumno: string;
    fechaInicio: string;
    empresaRut: string;
    sectorEmpresa: string;
    duracionHoras: number;
  };
  destinatario: {
    nombres: string;
    apellidos: string;
    cargo: string;
    empresa: string;
  };
  escuela: Escuela;
  estado: Estado;
  url?: string | null;
  motivoRechazo?: string | null;
}

@Component({
  selector: 'app-practicas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './practicas.component.html',
  styleUrls: ['./practicas.component.css'],
})
export class PracticasComponent {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  estado = signal<Estado>('pendiente');
  query = signal<string>('');
  page = signal(1);
  size = signal(10);
  total = signal(0);

  loading = signal(false);
  error = signal<string | null>(null);
  toast = signal<string | null>(null);

  solicitudes = signal<SolicitudCarta[]>([]);
  current = signal<SolicitudCarta | null>(null);
  showDetalle = signal(false);

  aprobarForm = this.fb.group({ urlFirmado: [''] });
  rechazarForm = this.fb.group({ motivo: ['', Validators.required] });

  // ====== Cargar datos ======
  ngOnInit() {
    this.cargarSolicitudes();
  }

  cargarSolicitudes() {
    this.loading.set(true);
    const params = {
      estado: this.estado(),
      q: this.query(),
      page: String(this.page()),
      size: String(this.size()),
    };
    this.http.get<{ items: SolicitudCarta[]; total: number }>(
      '/api/coordinacion/solicitudes-carta',
      { params }
    ).subscribe({
      next: (res) => {
        this.solicitudes.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las solicitudes');
        this.loading.set(false);
      },
    });
  }

  setEstado(est: Estado) {
    this.estado.set(est);
    this.page.set(1);
    this.cargarSolicitudes();
  }

  buscar() {
    this.page.set(1);
    this.cargarSolicitudes();
  }

  nextPage() {
    if (this.page() * this.size() < this.total()) {
      this.page.update((v) => v + 1);
      this.cargarSolicitudes();
    }
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update((v) => v - 1);
      this.cargarSolicitudes();
    }
  }

  // ====== Detalle ======
  abrirDetalle(s: SolicitudCarta) {
    this.current.set(s);
    this.showDetalle.set(true);
    document.body.classList.add('no-scroll');
  }

  cerrarDetalle() {
    this.showDetalle.set(false);
    this.current.set(null);
    document.body.classList.remove('no-scroll');
  }

  // ====== Acciones ======
  aprobar() {
    const c = this.current();
    if (!c) return;

    const body = this.aprobarForm.value.urlFirmado
      ? { url: this.aprobarForm.value.urlFirmado }
      : {};

    this.http.post(`/api/coordinacion/solicitudes-carta/${c.id}/aprobar`, body).subscribe({
      next: () => {
        this.toast.set('Solicitud aprobada correctamente.');
        this.actualizarEstadoLocal(c.id, 'aprobado', body['url']);
        this.cerrarDetalle();
      },
      error: () => this.toast.set('Error al aprobar solicitud.'),
    });
  }

  rechazar() {
    const c = this.current();
    if (!c) return;

    if (this.rechazarForm.invalid) {
      this.rechazarForm.markAllAsTouched();
      return;
    }

    const body = { motivo: this.rechazarForm.value.motivo || '' };
    this.http.post(`/api/coordinacion/solicitudes-carta/${c.id}/rechazar`, body).subscribe({
      next: () => {
        this.toast.set('Solicitud rechazada.');
        this.actualizarEstadoLocal(c.id, 'rechazado', null, body.motivo);
        this.cerrarDetalle();
      },
      error: () => this.toast.set('Error al rechazar solicitud.'),
    });
  }

  actualizarEstadoLocal(id: string, estado: Estado, url?: string | null, motivo?: string) {
    const arr = this.solicitudes();
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) {
      arr[i] = { ...arr[i], estado, url: url || arr[i].url, motivoRechazo: motivo || arr[i].motivoRechazo };
      this.solicitudes.set([...arr]);
    }
  }

  formatFecha(fecha: string | null | undefined): string {
    if (!fecha) return '';

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) {
      return fecha;
    }

    return parsed.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    });
  }

  fechaHoy = computed(() => {
    const d = new Date();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `Santiago, ${meses[d.getMonth()]} ${d.getDate()} del ${d.getFullYear()}.`;
  });
}
