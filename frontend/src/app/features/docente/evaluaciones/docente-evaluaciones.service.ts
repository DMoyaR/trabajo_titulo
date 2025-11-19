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
  descripcion: string | null;
  pauta_url: string | null;
  pauta_nombre: string;
  pauta_tipo: string | null;
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
  descripcion?: string | null;
  pauta?: File | null;
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
    const formData = new FormData();
    formData.append('tema', String(payload.tema));
    formData.append('titulo', payload.titulo);

    if (payload.fecha !== undefined) {
      formData.append('fecha', payload.fecha ?? '');
    }

    if (payload.descripcion !== undefined) {
      formData.append('descripcion', payload.descripcion ?? '');
    }

    if (payload.docente != null) {
      formData.append('docente', String(payload.docente));
    }

    if (payload.pauta) {
      formData.append('pauta', payload.pauta);
    }

    return this.http.post<EvaluacionGrupoDto>(this.baseUrl, formData);
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