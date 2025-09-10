import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';

interface LoginResponse {
  rol: string;
  redirect_url: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  login(data: { email: string; password: string }) {
    return this.http.post<LoginResponse>('/api/login/', data).pipe(
      tap((res) => {
        localStorage.setItem('rol', res.rol);
        if (res.redirect_url) {
          this.router.navigateByUrl(res.redirect_url);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return throwError(() => new Error('Usuario o contraseña incorrectos'));
        }
        return throwError(() => new Error('Error al iniciar sesión'));
      })
    );
  }

  reset(data: { email: string }) {
    return this.http.post('/api/reset', data);
  }
}
