import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  meta: Record<string, unknown>;
  createdAt: Date;
}

interface NotificacionApi {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string | null;
  leida: boolean;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly baseUrl = 'http://localhost:8000/api/notificaciones/';

  constructor(private http: HttpClient) {}

  listarPorUsuario(usuarioId: number, soloNoLeidas = false): Observable<Notificacion[]> {
    let params = new HttpParams().set('usuario', usuarioId);
    if (soloNoLeidas) {
      params = params.set('leida', 'false');
    }

    return this.http.get<NotificacionApi[]>(this.baseUrl, { params }).pipe(
      map((items) => items.map((item) => this.mapNotificacion(item)))
    );
  }

  marcarLeida(id: number): Observable<Notificacion> {
    return this.http.post<NotificacionApi>(`${this.baseUrl}${id}/leer/`, {}).pipe(
      map((item) => this.mapNotificacion(item))
    );
  }

  private mapNotificacion(api: NotificacionApi): Notificacion {
    return {
      id: api.id,
      titulo: api.titulo,
      mensaje: api.mensaje,
      tipo: api.tipo ?? 'general',
      leida: api.leida,
      meta: api.meta ?? {},
      createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    };
  }
}