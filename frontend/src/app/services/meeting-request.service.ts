import { Injectable, computed, signal } from '@angular/core';

export type MeetingStatus = 'Pendiente' | 'Aprobada' | 'Rechazada';

export interface MeetingRequest {
  id: string;
  studentName: string;
  date: string;
  time: string;
  title: string;
  location: string;
  description: string;
  status: MeetingStatus;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MeetingRequestService {
  private readonly storageKey = 'meetingRequests';
  private readonly requests = signal<MeetingRequest[]>(this.loadFromStorage());

  readonly requestsByStatus = computed(() => {
    const current = this.requests();
    return {
      pending: current.filter((req) => req.status === 'Pendiente'),
      approved: current.filter((req) => req.status === 'Aprobada'),
      rejected: current.filter((req) => req.status === 'Rechazada')
    };
  });

  get allRequests() {
    return this.requests.asReadonly();
  }

  addRequest(payload: Omit<MeetingRequest, 'id' | 'status' | 'createdAt'>) {
    const newRequest: MeetingRequest = {
      ...payload,
      id: this.createId(),
      status: 'Pendiente',
      createdAt: new Date().toISOString()
    };

    this.requests.update((current) => {
      const updated = [...current, newRequest];
      this.saveToStorage(updated);
      return updated;
    });
  }

  updateStatus(id: string, status: MeetingStatus) {
    this.requests.update((current) => {
      const updated = current.map((req) =>
        req.id === id ? { ...req, status } : req
      );
      this.saveToStorage(updated);
      return updated;
    });
  }

  private createId() {
    return `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
  }

  private loadFromStorage(): MeetingRequest[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as MeetingRequest[];
    } catch (error) {
      console.error('No se pudo cargar las solicitudes almacenadas', error);
      return [];
    }
  }

  private saveToStorage(requests: MeetingRequest[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(requests));
    } catch (error) {
      console.error('No se pudo guardar la solicitud', error);
    }
  }
}
