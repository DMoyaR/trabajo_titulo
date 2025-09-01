import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  login(data: { email: string; password: string }) {
    return this.http.post('/api/login', data);
  }

  reset(data: { email: string }) {
    return this.http.post('/api/reset', data);
  }
}