import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface GrupoTitulo {
  id: number;
  nombre: string;
  integrantes: string[];
}

interface PromedioTitulo {
  id: number;
  grupo_nombre: string;
  titulo: string;
  docente: number | null;
  docente_nombre: string | null;
  promedio: number;
  cantidad_entregas: number;
  grupo: GrupoTitulo | null;
}

@Component({
  selector: 'app-titulo-coordinacion',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './titulo.component.html',
  styleUrls: ['./titulo.component.css'],
})
export class CoordinacionTituloComponent implements OnInit {
  promedios: PromedioTitulo[] = [];
  loading = false;
  error: string | null = null;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.cargarPromedios();
  }

  cargarPromedios(): void {
    this.loading = true;
    this.error = null;
    this.http.get<PromedioTitulo[]>(`/api/coordinacion/titulo/promedios/`).subscribe({
      next: data => {
        this.promedios = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los promedios. Intenta nuevamente más tarde.';
        this.loading = false;
      },
    });
  }

  descargarCsv(): void {
    if (!this.promedios.length) {
      return;
    }

    const headers = [
    'Grupo',
    'Título',
    'Docente',
    'Integrantes',
    'Nota',
    ];

    const rows = this.promedios.map(p => {
    const integrantes = p.grupo?.integrantes?.length
        ? p.grupo.integrantes.join(' | ')
        : 'Sin integrantes registrados';

    const docente = p.docente_nombre || 'Sin docente asignado';

    const promedio = Number.isFinite(p.promedio)
        ? p.promedio.toFixed(2)
        : String(p.promedio ?? '');

    return [p.grupo_nombre, p.titulo, docente, integrantes, promedio];
    });

    const contenido = [headers, ...rows]
      .map(row => row.map(valor => `"${(valor ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'promedios_trabajo_titulo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}