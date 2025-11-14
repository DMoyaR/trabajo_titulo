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

export type CrearEvaluacionPayload = {
  docente?: number | null;
  tema: number;
  titulo: string;
  fecha?: string | null;
};

export interface GrupoActivoDto {
  id: number;
  nombre: string;
  integrantes: string[];
}

@Injectable({ providedIn: 'root' })
export class DocenteEvaluacionesService {
  private readonly baseUrl = 'http://localhost:8000/api/docentes/evaluaciones/';
  private readonly gruposActivosUrl = 'http://localhost:8000/api/docentes/grupos/activos/';

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
      tema: payload.tema,
      titulo: payload.titulo,
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

  listarGruposActivos(docenteId?: number | null): Observable<GrupoActivoDto[]> {
    let params = new HttpParams();

    if (docenteId != null) {
      params = params.set('docente', String(docenteId));
    }

    const options = params.keys().length ? { params } : {};
    return this.http.get<GrupoActivoDto[]>(this.gruposActivosUrl, options);
  }
}