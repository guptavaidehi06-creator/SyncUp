import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  credentials = {
    email: '',
    password: ''
  };

  errorMessage: string = '';
  isSubmitting = false;

  constructor(private authService: AuthService, private router: Router) { }

  login(loginForm: NgForm): void {
    if (loginForm.invalid) {
      loginForm.control.markAllAsTouched();
      return;
    }

    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    this.authService.login(this.credentials).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = this.getLoginErrorMessage(err);
      }
    });
  }

  private getLoginErrorMessage(err: any): string {
    if (err?.status === 404) {
      return 'Account not found. Please sign up first.';
    }

    if (err?.status === 401) {
      return typeof err?.error === 'string' &&
        err.error.toLowerCase().includes('verify')
        ? 'Please verify your email before logging in.'
        : 'Invalid email or password.';
    }

    if (err?.status === 0 || err?.status >= 500) {
      return 'Unable to connect to the server. Please try again.';
    }

    return 'Invalid email or password.';
  }

}
