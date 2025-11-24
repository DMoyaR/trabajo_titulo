import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TemaUsuarioBasico {
  id?: number | null;
  nombre?: string | null;
  rol?: string | null;
  carrera?: string | null;
}

export interface TemaInscripcionActiva {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  rut: string | null;
  telefono: string | null;
  reservadoEn: string;
  esResponsable?: boolean;
}

export interface TemaDisponible {
  id: number;
  titulo: string;
  carrera: string;
  descripcion: string;
  requisitos?: string[];
  cupos: number;
  cuposDisponibles?: number;
  created_at?: string;
  created_by?: number | null;
  rama?: string | null;
  creadoPor?: TemaUsuarioBasico | null;
  docenteACargo?: TemaUsuarioBasico | null;
  docente_responsable?: number | null;
  inscripcionesActivas?: TemaInscripcionActiva[];
  tieneCupoPropio?: boolean;
}

export type CrearTemaPayload = Omit<
  TemaDisponible,
  'id' | 'created_at' | 'created_by' | 'inscripcionesActivas' | 'tieneCupoPropio'
> & { created_by?: number | null };

export interface TemaQueryParams {
  usuarioId?: number;
  alumnoId?: number;
}

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly baseUrl = '/api/temas/';

  constructor(private http: HttpClient) {}

  getTemas(params?: TemaQueryParams): Observable<TemaDisponible[]> {
    const httpParams = this.buildParams(params);
    return this.http.get<TemaDisponible[]>(this.baseUrl, { params: httpParams });
  }

  obtenerTema(id: number, params?: TemaQueryParams): Observable<TemaDisponible> {
    const httpParams = this.buildParams(params);
    return this.http.get<TemaDisponible>(`${this.baseUrl}${id}/`, { params: httpParams });
  }

  crearTema(payload: CrearTemaPayload): Observable<TemaDisponible> {
    return this.http.post<TemaDisponible>(this.baseUrl, payload);
  }

  eliminarTema(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }

  pedirTema(temaId: number, alumnoId: number): Observable<TemaDisponible> {
    return this.http.post<TemaDisponible>(`${this.baseUrl}${temaId}/postular/`, {
      alumnoId,
    });
  }

  asignarCompaneros(temaId: number, alumnoId: number, correos: string[]): Observable<TemaDisponible> {
    return this.http.post<TemaDisponible>(`${this.baseUrl}${temaId}/companeros/`, {
      alumnoId,
      correos,
    });
  }

  private buildParams(params?: TemaQueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (params?.usuarioId != null) {
      httpParams = httpParams.set('usuarioId', params.usuarioId);
    }
    if (params?.alumnoId != null) {
      httpParams = httpParams.set('alumnoId', params.alumnoId);
    }
    return httpParams;
  }
}
