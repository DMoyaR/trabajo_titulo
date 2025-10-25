import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Docente {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  telefono: string | null;
}

interface DocenteApi {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  telefono: string | null;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class DocentesService {
  private readonly baseUrl = 'http://localhost:8000/api/docentes/';

  constructor(private http: HttpClient) {}

  listar(carrera?: string): Observable<Docente[]> {
    let params = new HttpParams();
    if (carrera) {
      params = params.set('carrera', carrera);
    }

    return this.http.get<DocenteApi[]>(this.baseUrl, { params }).pipe(
      map(list => list.map(item => this.mapDocente(item)))
    );
  }

  private mapDocente(api: DocenteApi): Docente {
    return {
      id: api.id,
      nombre: api.nombre,
      correo: api.correo,
      carrera: api.carrera ?? null,
      telefono: api.telefono ?? null,
    };
  }
}