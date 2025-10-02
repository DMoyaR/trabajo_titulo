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
  created_at: string;
  created_by: number | null;
}

export type CrearTemaPayload = Omit<TemaDisponible, 'id' | 'created_at' | 'created_by'> & {
  created_by?: number | null;
};

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly baseUrl = 'http://localhost:8000/api/temas/';

  constructor(private http: HttpClient) {}

  getTemas(): Observable<TemaDisponible[]> {
    return this.http.get<TemaDisponible[]>(this.baseUrl);
  }

  crearTema(payload: CrearTemaPayload): Observable<TemaDisponible> {
    return this.http.post<TemaDisponible>(this.baseUrl, payload);
  }

  eliminarTema(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}