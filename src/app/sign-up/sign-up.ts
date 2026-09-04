import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css'
})
export class SignUp {
  step: 'form' | 'verify' = 'form';
  errorMessage: string = '';

  newUser = {
    name: '',
    email: '',
    password: ''
  };

  verificationCode: string = '';
  resendMessage = '';
  isResending = false;

  constructor(private authService: AuthService, private router: Router) { }

  register(): void {
    this.errorMessage = '';
    this.authService.register(this.newUser).subscribe({
      next: () => {
        this.step = 'verify';
      },
      error: (err) => {
        this.errorMessage = err.error || 'Something went wrong. Please try again.';
      }
    });
  }

  verify(): void {
    this.errorMessage = '';
    this.authService.verify({ email: this.newUser.email, code: this.verificationCode }).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = err.error || 'Invalid code. Please try again.';
      }
    });
  }

  resendVerification(): void {
    this.errorMessage = '';
    this.resendMessage = '';
    this.isResending = true;
    this.authService.resendVerification({ email: this.newUser.email }).subscribe({
      next: (message) => {
        this.resendMessage = typeof message === 'string' ? message : 'A new code has been sent.';
        this.isResending = false;
      },
      error: (err) => {
        this.errorMessage = err.error || 'Unable to resend the code. Please try again.';
        this.isResending = false;
      }
    });
  }
}
