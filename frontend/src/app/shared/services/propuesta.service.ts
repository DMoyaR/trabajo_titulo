import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface PersonaResumen {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  telefono: string | null;
  rol: string;
}

export interface Propuesta {
  id: number;
  titulo: string;
  objetivo: string;
  descripcion: string;
  rama: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  comentarioDecision: string | null;
  preferenciasDocentes: number[];
  cuposRequeridos: number;
  correosCompaneros: string[];
  createdAt: Date;
  updatedAt: Date;
  alumno: PersonaResumen | null;
  docente: PersonaResumen | null;
}

interface PropuestaApi {
  id: number;
  titulo: string;
  objetivo: string;
  descripcion: string;
  rama: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  comentario_decision: string | null;
  preferencias_docentes: number[];
  cupos_requeridos: number;
  correos_companeros: string[];
  created_at: string;
  updated_at: string;
  alumno: PersonaApi | null;
  docente: PersonaApi | null;
}

interface PersonaApi {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  telefono: string | null;
  rol: string;
}

export interface CrearPropuestaPayload {
  alumnoId: number | null;
  titulo: string;
  objetivo: string;
  descripcion: string;
  rama: string;
  preferenciasDocentes: number[];
  cuposRequeridos: number;
  correosCompaneros: string[];
  docenteId?: number | null;
}

export interface ActualizarPropuestaPayload {
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  comentarioDecision?: string | null;
  docenteId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PropuestaService {
  private readonly baseUrl = 'http://localhost:8000/api/propuestas/';

  constructor(private http: HttpClient) {}

  crearPropuesta(payload: CrearPropuestaPayload): Observable<Propuesta> {
    const body: Record<string, unknown> = {
      titulo: payload.titulo,
      objetivo: payload.objetivo,
      descripcion: payload.descripcion,
      rama: payload.rama,
      preferencias_docentes: payload.preferenciasDocentes,
      cupos_requeridos: payload.cuposRequeridos,
      correos_companeros: payload.correosCompaneros,
    };

    if (payload.alumnoId != null) {
      body['alumno_id'] = payload.alumnoId;
    }

    if (payload.docenteId != null) {
      body['docente_id'] = payload.docenteId;
    }

    return this.http.post<PropuestaApi>(this.baseUrl, body).pipe(
      map(api => this.mapPropuesta(api))
    );
  }

  listarPorDocente(docenteId: number): Observable<Propuesta[]> {
    const params = new HttpParams().set('docente', docenteId);
    return this.http.get<PropuestaApi[]>(this.baseUrl, { params }).pipe(
      map(list => list.map(item => this.mapPropuesta(item)))
    );
  }

  listarPorAlumno(alumnoId: number): Observable<Propuesta[]> {
    const params = new HttpParams().set('alumno', alumnoId);
    return this.http.get<PropuestaApi[]>(this.baseUrl, { params }).pipe(
      map(list => list.map(item => this.mapPropuesta(item)))
    );
  }

  actualizarPropuesta(id: number, payload: ActualizarPropuestaPayload): Observable<Propuesta> {
    const body: Record<string, unknown> = {
      estado: payload.estado,
    };

    if (payload.comentarioDecision !== undefined) {
      body['comentario_decision'] = payload.comentarioDecision;
    }

    if (payload.docenteId != null) {
      body['docente_id'] = payload.docenteId;
    }

    return this.http.patch<PropuestaApi>(`${this.baseUrl}${id}/`, body).pipe(
      map(api => this.mapPropuesta(api))
    );
  }

  private mapPropuesta(api: PropuestaApi): Propuesta {
    return {
      id: api.id,
      titulo: api.titulo,
      objetivo: api.objetivo,
      descripcion: api.descripcion,
      rama: api.rama,
      estado: api.estado,
      comentarioDecision: api.comentario_decision,
      preferenciasDocentes: api.preferencias_docentes ?? [],
      cuposRequeridos: api.cupos_requeridos ?? 1,
      correosCompaneros: api.correos_companeros ?? [],
      createdAt: api.created_at ? new Date(api.created_at) : new Date(),
      updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
      alumno: this.mapPersona(api.alumno),
      docente: this.mapPersona(api.docente),
    };
  }

  private mapPersona(persona: PersonaApi | null): PersonaResumen | null {
    if (!persona) {
      return null;
    }

    return {
      id: persona.id,
      nombre: persona.nombre,
      correo: persona.correo,
      carrera: persona.carrera ?? null,
      telefono: persona.telefono ?? null,
      rol: persona.rol,
    };
  }
}