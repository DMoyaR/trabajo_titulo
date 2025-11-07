import { Injectable } from '@angular/core';

export interface CurrentUserProfile {
  id: number | null;
  rol: string;
  nombre: string;
  correo: string;
  rut: string | null;
  carrera: string | null;
  telefono: string | null;
}

const STORAGE_KEY = 'userProfile';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly storageKey = STORAGE_KEY;

  getProfile(): CurrentUserProfile | null {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<CurrentUserProfile>;
      return {
        id: parsed.id ?? null,
        rol: parsed.rol ?? '',
        nombre: parsed.nombre ?? '',
        correo: parsed.correo ?? '',
        rut: parsed.rut ?? null,
        carrera: parsed.carrera ?? null,
        telefono: parsed.telefono ?? null,
      };
    } catch (error) {
      console.error('No se pudo parsear la información del usuario', error);
      return null;
    }
  }

  saveProfile(profile: CurrentUserProfile): void {
    localStorage.setItem(this.storageKey, JSON.stringify(profile));
  }

  clearProfile(): void {
    localStorage.removeItem(this.storageKey);
  }
}