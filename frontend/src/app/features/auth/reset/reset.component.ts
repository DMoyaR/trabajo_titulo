
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StatusCardComponent } from '../status-card/status-card.component';
import { AuthService } from '../auth.service';

/** Password reset request - frontend only */
@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.css'],
})

export class ResetComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit(){
    if (this.form.invalid) return;
    this.loading.set(true); this.error.set(null);
    this.auth.reset(this.form.getRawValue() as { email: string }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/auth/status/email-sent-success');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al enviar correo');
      }
    });
  }
}