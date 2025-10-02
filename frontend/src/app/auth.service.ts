import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface LoginResponse {
  status: string;
  rol: string;
  redirect_url: string;
  nombre: string;
  correo: string;
}
// ... other imports and code

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, { email, password });
  }

   /** Simulate password reset request */
  reset(data: { email: string }): Observable<void> {
    // Replace this with a real HTTP request if available
    return of(void 0);
  }

  logout(): Observable<void> {
    sessionStorage.removeItem('rol');
    sessionStorage.removeItem('usuario');

    return this.http.post<void>(`${this.base}/logout`, {}).pipe(
      catchError(() => of(void 0)),
    );
  }
}