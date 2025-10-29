import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  getTemas(alumnoId?: number | null): Observable<TemaDisponible[]> {
    const params = alumnoId ? { alumno: alumnoId } : undefined;
    return this.http.get<TemaDisponible[]>(this.baseUrl, { params });
  }

  crearTema(payload: CrearTemaPayload): Observable<TemaDisponible> {
    return this.http.post<TemaDisponible>(this.baseUrl, payload);
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