import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  step: 'request' | 'reset' = 'request';
  errorMessage: string = '';
  successMessage: string = '';
  resetCode: string = '';
  isResetting: boolean = false;

  email: string = '';
  code: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  requestCode(): void {
    this.errorMessage = '';
    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: (response) => {
        this.step = 'reset';
        this.resetCode = response.resetCode || '';
        this.successMessage = this.resetCode
          ? `Your reset code is ${this.resetCode}`
          : 'If this email exists, a code has been sent.';
      },
      error: (err) => {
        this.errorMessage = err.status === 404
          ? 'No account found with this email. Please sign up first.'
          : 'Unable to send the reset code. Please try again.';
      }
    });
  }

  resetPassword(): void {
    this.errorMessage = '';

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isResetting = true;

    this.authService.resetPassword({
      email: this.email,
      code: this.code,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.successMessage = 'Password reset successfully. Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.isResetting = false;
        this.errorMessage = err.error || 'Invalid or expired code.';
      }
    });
  }
}