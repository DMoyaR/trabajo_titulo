
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

/** Login screen (email + password) with UTEM styling; frontend-only */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit(){
    if (this.form.invalid) { this.router.navigateByUrl('/auth/status/missing-fields'); return; }
    this.loading.set(true); this.error.set(null);
    setTimeout(() => { this.loading.set(false); this.router.navigateByUrl('/auth/status/login-success'); }, 700);
  }
}
