import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EvaluacionEntregaDto {
  id: number;
  titulo: string;
  comentario: string | null;
  archivo_url: string | null;
  archivo_nombre: string;
  archivo_tipo: string | null;
  rubrica_docente_url: string | null;
  rubrica_docente_nombre: string;
  rubrica_docente_tipo: string | null;
  informe_corregido_url: string | null;
  informe_corregido_nombre: string;
  informe_corregido_tipo: string | null;
  nota: number | null;
  estado_revision: 'pendiente' | 'revisada';
  creado_en: string;
  actualizado_en: string;
  alumno: {
    id: number;
    nombre: string;
    correo: string;
  } | null;
}

export interface EvaluacionGrupoDto {
  id: number;
  docente: number | null;
  tema: number | null;
  grupo_nombre: string;
  titulo: string;
  comentario: string | null;
  fecha: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
  rubrica_url: string | null;
  rubrica_nombre: string | null;
  rubrica_tipo: string | null;
  grupo: {
    id: number;
    nombre: string;
    integrantes: string[];
  } | null;
  entregas: EvaluacionEntregaDto[];
  ultima_entrega: EvaluacionEntregaDto | null;
}

@Injectable({ providedIn: 'root' })
export class AlumnoEntregasService {
  private readonly baseUrl = 'http://localhost:8000/api/alumnos/evaluaciones/';

  constructor(private readonly http: HttpClient) {}

  listarEvaluaciones(alumnoId: number): Observable<EvaluacionGrupoDto[]> {
    const params = new HttpParams().set('alumno', String(alumnoId));
    return this.http.get<EvaluacionGrupoDto[]>(this.baseUrl, { params });
  }

  enviarEntrega(
    evaluacionId: number,
    alumnoId: number,
    payload: { titulo: string; comentario?: string | null; archivo: File }
  ): Observable<EvaluacionEntregaDto> {
    const url = `${this.baseUrl}${evaluacionId}/entregas/`;
    const formData = new FormData();
    formData.append('titulo', payload.titulo);
    if (payload.comentario != null && payload.comentario !== '') {
      formData.append('comentario', payload.comentario);
    }
    formData.append('archivo', payload.archivo);
    formData.append('alumno', String(alumnoId));

    return this.http.post<EvaluacionEntregaDto>(url, formData);
  }
}