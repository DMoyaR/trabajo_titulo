import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface LoginResponse {
  status: string;
  rol: string;
  redirect_url: string;
  nombre: string;
  correo: string;
  rut?: string | null;
  carrera?: string | null;
  id?: number;
}


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  form!: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.value;
    this.http.post<LoginResponse>('http://localhost:8000/api/login', { email, password })
      .subscribe({
        next: (res) => {
          console.log('login OK:', res);
          localStorage.setItem('rol', res.rol);
          localStorage.setItem('usuario', res.nombre);

          if (res.rol === 'alumno') {
            if (res.rut) {
              localStorage.setItem('alumnoRut', res.rut);
            } else {
              localStorage.removeItem('alumnoRut');
            }
            if (res.carrera) {
              localStorage.setItem('alumnoCarrera', res.carrera);
            } else {
              localStorage.removeItem('alumnoCarrera');
            }
          } else {
            localStorage.removeItem('alumnoRut');
            localStorage.removeItem('alumnoCarrera');
          }

          if (res.rol === 'alumno') {
            this.router.navigateByUrl('/alumno/dashboard');
          } else if (res.rol === 'docente') {
            
            this.router.navigateByUrl('/docente/dashboard');

          } else if (res.rol === 'coordinador') {
            this.router.navigateByUrl('/coordinacion/inicio');
          }
},
        error: () => {
          console.log('Problemas de login'); // Error
          this.error.set('Credenciales inválidas');
        }
      }).add(() => this.loading.set(false));
      
  }
}
