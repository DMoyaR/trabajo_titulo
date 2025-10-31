import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TemaInscripcionActiva {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  rut: string | null;
  telefono: string | null;
  reservadoEn: string;
}

export interface TemaDisponible {
  id: number;
  titulo: string;
  carrera: string;
  descripcion: string;
  requisitos: string[];
  cupos: number;
  cuposDisponibles: number;
  tieneCupoPropio: boolean;
  created_at: string;
  created_by: number | null;
  creadoPor: {
    nombre: string;
    rol: string;
    carrera: string | null;
  } | null;
  inscripcionesActivas: TemaInscripcionActiva[];
}

export type CrearTemaPayload = Omit<
  TemaDisponible,
  'id' | 'created_at' | 'created_by' | 'creadoPor' | 'cuposDisponibles' | 'tieneCupoPropio'
> & {
  created_by?: number | null;
};

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly baseUrl = 'http://localhost:8000/api/temas/';

  constructor(private http: HttpClient) {}

  getTemas(options?: {
    usuarioId?: number | null;
    alumnoId?: number | null;
    carrera?: string | null;
  }): Observable<TemaDisponible[]> {
    const params: Record<string, string> = {};
    const { usuarioId, alumnoId, carrera } = options ?? {};

    if (usuarioId != null) {
      params['usuario'] = String(usuarioId);
    }
    if (alumnoId != null) {
      params['alumno'] = String(alumnoId);
    }
    if (carrera) {
      params['carrera'] = carrera;
    }

    const httpOptions = Object.keys(params).length ? { params } : {};
    return this.http.get<TemaDisponible[]>(this.baseUrl, httpOptions);
  }

  crearTema(payload: CrearTemaPayload): Observable<TemaDisponible> {
    return this.http.post<TemaDisponible>(this.baseUrl, payload);
  }

  obtenerTema(
    id: number,
    options?: { usuarioId?: number | null; alumnoId?: number | null; carrera?: string | null }
  ): Observable<TemaDisponible> {
    const params: Record<string, string> = {};
    const { usuarioId, alumnoId, carrera } = options ?? {};

    if (usuarioId != null) {
      params['usuario'] = String(usuarioId);
    }
    if (alumnoId != null) {
      params['alumno'] = String(alumnoId);
    }
    if (carrera) {
      params['carrera'] = carrera;
    }

    const httpOptions = Object.keys(params).length ? { params } : {};
    return this.http.get<TemaDisponible>(`${this.baseUrl}${id}/`, httpOptions);
  }

  pedirTema(temaId: number, alumnoId: number): Observable<TemaDisponible> {
    return this.http.post<TemaDisponible>(`${this.baseUrl}${temaId}/reservas/`, {
      alumno: alumnoId,
    });
  }

  eliminarTema(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}