import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ResetComponent } from './features/auth/reset/reset.component';
import { BadCredentialsComponent } from './features/auth/status/bad-credentials/bad-credentials.component';
import { EmailNotLinkedComponent } from './features/auth/status/email-not-linked/email-not-linked.component';
import { InvalidFormatComponent } from './features/auth/status/invalid-format/invalid-format.component';
import { LoginSuccessComponent } from './features/auth/status/login-success/login-success.component';
import { MissingFieldsComponent } from './features/auth/status/missing-fields/missing-fields.component';
import { EmailSentSuccessComponent } from './features/auth/status/email-sent-success/email-sent-success.component';
import { LockedComponent } from './features/auth/status/locked/locked.component';
import { LogoutSuccessComponent } from './features/auth/status/logout-success/logout-success.component';
import { TempDisabledComponent } from './features/auth/status/temp-disabled/temp-disabled.component';
import { TempErrorComponent } from './features/auth/status/temp-error/temp-error.component';

export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/reset', component: ResetComponent },
  { path: 'auth/status/bad-credentials', component: BadCredentialsComponent },
  { path: 'auth/status/email-not-linked', component: EmailNotLinkedComponent },
  { path: 'auth/status/invalid-format', component: InvalidFormatComponent },
  { path: 'auth/status/login-success', component: LoginSuccessComponent },
  { path: 'auth/status/missing-fields', component: MissingFieldsComponent },
  { path: 'auth/status/email-sent-success', component: EmailSentSuccessComponent },
  { path: 'auth/status/locked', component: LockedComponent },
  { path: 'auth/status/logout-success', component: LogoutSuccessComponent },
  { path: 'auth/status/temp-disabled', component: TempDisabledComponent },
  { path: 'auth/status/temp-error', component: TempErrorComponent }
];