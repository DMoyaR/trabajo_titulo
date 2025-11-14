import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface UsuarioResumen {
  id: number;
  nombre: string;
  correo: string;
  carrera: string | null;
  telefono: string | null;
  rol: string;
}

export interface TrazabilidadEvento {
  id: number;
  tipo: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  comentario: string | null;
  datos: Record<string, unknown>;
  fecha: Date;
  usuario: UsuarioResumen | null;
}

export interface SolicitudReunion {
  id: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo: string;
  disponibilidadSugerida: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
  alumno: UsuarioResumen | null;
  docente: UsuarioResumen | null;
  trazabilidad: TrazabilidadEvento[];
}

export interface Reunion {
  id: number;
  estado: 'aprobada' | 'finalizada' | 'no_realizada' | 'reprogramada';
  motivo: string;
  observaciones: string | null;
  fecha: string;
  horaInicio: string;
  horaTermino: string;
  modalidad: string;
  creadoEn: Date;
  actualizadoEn: Date;
  alumno: UsuarioResumen | null;
  docente: UsuarioResumen | null;
  solicitudId: number | null;
  trazabilidad: TrazabilidadEvento[];
}

export interface SolicitudReunionQuery {
  alumno?: number;
  docente?: number;
  coordinador?: number;
  estado?: 'pendiente' | 'aprobada' | 'rechazada';
}

export interface CrearSolicitudPayload {
  alumno: number;
  motivo: string;
  disponibilidadSugerida?: string | null;
}

export interface AprobarSolicitudPayload {
  docente: number;
  fecha: string;
  horaInicio: string;
  horaTermino: string;
  modalidad: 'presencial' | 'online';
  comentario?: string | null;
}

export interface RechazarSolicitudPayload {
  docente: number;
  comentario?: string | null;
}

export interface ReunionQuery {
  alumno?: number;
  docente?: number;
  coordinador?: number;
  estado?: 'aprobada' | 'finalizada' | 'no_realizada' | 'reprogramada';
}

export interface CrearReunionPayload {
  alumno: number;
  docente: number;
  fecha: string;
  horaInicio: string;
  horaTermino: string;
  modalidad: 'presencial' | 'online';
  motivo: string;
  observaciones?: string | null;
}

export interface CerrarReunionPayload {
  docente: number;
  estado: 'finalizada' | 'no_realizada';
  comentario?: string | null;
}

interface TrazabilidadEventoApi {
  id: number;
  tipo: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  comentario: string | null;
  datos: Record<string, unknown> | null;
  fecha: string;
  usuario: UsuarioResumen | null;
}

interface SolicitudReunionApi {
  id: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo: string;
  disponibilidadSugerida: string | null;
  creadoEn: string;
  actualizadoEn: string;
  alumno: UsuarioResumen | null;
  docente: UsuarioResumen | null;
  trazabilidad: TrazabilidadEventoApi[] | null;
}

interface ReunionApi {
  id: number;
  estado: 'aprobada' | 'finalizada' | 'no_realizada' | 'reprogramada';
  motivo: string;
  observaciones: string | null;
  fecha: string;
  horaInicio: string;
  horaTermino: string;
  modalidad: string;
  creadoEn: string;
  actualizadoEn: string;
  alumno: UsuarioResumen | null;
  docente: UsuarioResumen | null;
  solicitudId: number | null;
  trazabilidad: TrazabilidadEventoApi[] | null;
}

@Injectable({ providedIn: 'root' })
export class ReunionesService {
  private readonly baseUrl = 'http://localhost:8000/api';

  constructor(private readonly http: HttpClient) {}

  listarSolicitudes(params: SolicitudReunionQuery): Observable<SolicitudReunion[]> {
    const httpParams = this.buildParams(params as Record<string, unknown>);
    return this.http
      .get<SolicitudReunionApi[]>(`${this.baseUrl}/reuniones/solicitudes/`, { params: httpParams })
      .pipe(map((items) => items.map((item) => this.mapSolicitud(item))));
  }

  crearSolicitud(payload: CrearSolicitudPayload): Observable<SolicitudReunion> {
    return this.http
      .post<SolicitudReunionApi>(`${this.baseUrl}/reuniones/solicitudes/`, payload)
      .pipe(map((item) => this.mapSolicitud(item)));
  }

  aprobarSolicitud(id: number, payload: AprobarSolicitudPayload): Observable<Reunion> {
    return this.http
      .post<ReunionApi>(`${this.baseUrl}/reuniones/solicitudes/${id}/aprobar/`, payload)
      .pipe(map((item) => this.mapReunion(item)));
  }

  rechazarSolicitud(id: number, payload: RechazarSolicitudPayload): Observable<SolicitudReunion> {
    return this.http
      .post<SolicitudReunionApi>(`${this.baseUrl}/reuniones/solicitudes/${id}/rechazar/`, payload)
      .pipe(map((item) => this.mapSolicitud(item)));
  }

  listarReuniones(params: ReunionQuery): Observable<Reunion[]> {
    const httpParams = this.buildParams(params as Record<string, unknown>);
    return this.http
      .get<ReunionApi[]>(`${this.baseUrl}/reuniones/`, { params: httpParams })
      .pipe(map((items) => items.map((item) => this.mapReunion(item))));
  }

  agendarReunion(payload: CrearReunionPayload): Observable<Reunion> {
    return this.http
      .post<ReunionApi>(`${this.baseUrl}/reuniones/`, payload)
      .pipe(map((item) => this.mapReunion(item)));
  }

  cerrarReunion(id: number, payload: CerrarReunionPayload): Observable<Reunion> {
    return this.http
      .post<ReunionApi>(`${this.baseUrl}/reuniones/${id}/cerrar/`, payload)
      .pipe(map((item) => this.mapReunion(item)));
  }

  private buildParams(params: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private mapSolicitud(api: SolicitudReunionApi): SolicitudReunion {
    const trazabilidad = (api.trazabilidad ?? []).map((item) => this.mapEvento(item));
    trazabilidad.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return {
      id: api.id,
      estado: api.estado,
      motivo: api.motivo,
      disponibilidadSugerida: api.disponibilidadSugerida ?? null,
      creadoEn: this.parseDate(api.creadoEn),
      actualizadoEn: this.parseDate(api.actualizadoEn),
      alumno: api.alumno ?? null,
      docente: api.docente ?? null,
      trazabilidad,
    };
  }

  private mapReunion(api: ReunionApi): Reunion {
    const trazabilidad = (api.trazabilidad ?? []).map((item) => this.mapEvento(item));
    trazabilidad.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return {
      id: api.id,
      estado: api.estado,
      motivo: api.motivo,
      observaciones: api.observaciones ?? null,
      fecha: api.fecha,
      horaInicio: api.horaInicio,
      horaTermino: api.horaTermino,
      modalidad: api.modalidad,
      creadoEn: this.parseDate(api.creadoEn),
      actualizadoEn: this.parseDate(api.actualizadoEn),
      alumno: api.alumno ?? null,
      docente: api.docente ?? null,
      solicitudId: api.solicitudId ?? null,
      trazabilidad,
    };
  }

  private mapEvento(api: TrazabilidadEventoApi): TrazabilidadEvento {
    return {
      id: api.id,
      tipo: api.tipo,
      estadoAnterior: api.estadoAnterior,
      estadoNuevo: api.estadoNuevo,
      comentario: api.comentario,
      datos: api.datos ?? {},
      fecha: this.parseDate(api.fecha),
      usuario: api.usuario ?? null,
    };
  }

  private parseDate(value: string | null | undefined): Date {
    if (!value) {
      return new Date();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  }
}