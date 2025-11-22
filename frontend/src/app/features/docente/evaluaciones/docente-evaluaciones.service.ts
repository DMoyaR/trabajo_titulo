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
  rubrica_url: string | null;
  rubrica_nombre: string | null;
  rubrica_tipo: string | null;
  fecha: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
  grupo: {
    id: number;
    nombre: string;
    integrantes: string[];
  } | null;
  entregas: EvaluacionEntregaDto[];
  ultima_entrega: EvaluacionEntregaDto | null;
}

export type CrearEvaluacionPayload = {
  docente?: number | null;
  tema: number;
  titulo: string;
  comentario: string;
  rubrica?: File | null;
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
    const usarFormData = Boolean(payload.rubrica instanceof File);

    if (!usarFormData) {
      const body: Record<string, unknown> = {
        tema: payload.tema,
        titulo: payload.titulo,
        comentario: payload.comentario,
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

    const form = new FormData();
    form.append('tema', String(payload.tema));
    form.append('titulo', payload.titulo);
    form.append('comentario', payload.comentario);

    if (payload.fecha) {
      form.append('fecha', payload.fecha);
    }

    if (payload.docente != null) {
      form.append('docente', String(payload.docente));
    }

    if (payload.rubrica instanceof File) {
      form.append('rubrica', payload.rubrica);
    }

    return this.http.post<EvaluacionGrupoDto>(this.baseUrl, form);
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