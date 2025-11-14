import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EvaluacionGrupoDto {
  id: number;
  docente: number | null;
  grupo_nombre: string;
  titulo: string;
  fecha: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
}

export type CrearEvaluacionPayload = {
  docente?: number | null;
  grupo_nombre: string;
  titulo: string;
  fecha?: string | null;
  estado: string;
};

@Injectable({ providedIn: 'root' })
export class DocenteEvaluacionesService {
  private readonly baseUrl = 'http://localhost:8000/api/docentes/evaluaciones/';

  constructor(private readonly http: HttpClient) {}

  listar(docenteId?: number | null): Observable<EvaluacionGrupoDto[]> {
    let params = new HttpParams();

    if (docenteId != null) {
      params = params.set('docente', String(docenteId));
    }

    const options = params.keys().length ? { params } : {};
    return this.http.get<EvaluacionGrupoDto[]>(this.baseUrl, options);
  }

  crear(payload: CrearEvaluacionPayload): Observable<EvaluacionGrupoDto> {
    const body: Record<string, unknown> = {
      grupo_nombre: payload.grupo_nombre,
      titulo: payload.titulo,
      estado: payload.estado,
    };

    if (payload.fecha) {
      body['fecha'] = payload.fecha;
    } else if (payload.fecha === null) {
      body['fecha'] = null;
    }

    if (payload.docente != null) {
      body['docente'] = payload.docente;
    }

    return this.http.post<EvaluacionGrupoDto>(this.baseUrl, body);
  }
}