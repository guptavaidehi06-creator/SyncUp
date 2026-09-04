import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  verificationMessage: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  login(): void {
    this.errorMessage = '';
    this.verificationMessage = '';
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = err.error || 'Invalid email or password.';
      }
    });
  }

  resendVerification(): void {
    this.errorMessage = '';
    this.authService.resendVerification({ email: this.credentials.email }).subscribe({
      next: (response) => {
        this.verificationMessage = `Your verification code is ${response.verificationCode}`;
      },
      error: (err) => {
        this.errorMessage = err.error || 'Unable to generate a verification code.';
      }
    });
  }
}