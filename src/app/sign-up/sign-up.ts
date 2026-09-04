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
  verificationMessage: string = '';

  newUser = {
    name: '',
    email: '',
    password: ''
  };

  verificationCode: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  register(): void {
    this.errorMessage = '';
    this.authService.register(this.newUser).subscribe({
      next: (response) => {
        this.step = 'verify';
        this.verificationMessage = response.verificationCode
          ? `Your verification code is ${response.verificationCode}`
          : 'Check your email for the verification code.';
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
}