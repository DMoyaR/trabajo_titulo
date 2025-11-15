import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EvaluacionGrupoDto {
  id: number;
  docente: number | null;
  tema: number | null;
  grupo_nombre: string;
  titulo: string;
  fecha: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
  grupo: {
    id: number;
    nombre: string;
    integrantes: string[];
  } | null;
}

@Injectable({ providedIn: 'root' })
export class AlumnoEntregasService {
  private readonly baseUrl = 'http://localhost:8000/api/alumnos/evaluaciones/';

  constructor(private readonly http: HttpClient) {}

  listarEvaluaciones(alumnoId: number): Observable<EvaluacionGrupoDto[]> {
    const params = new HttpParams().set('alumno', String(alumnoId));
    return this.http.get<EvaluacionGrupoDto[]>(this.baseUrl, { params });
  }
}