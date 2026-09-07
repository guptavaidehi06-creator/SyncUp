import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
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
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = err.error || 'Invalid email or password.';
        this.isSubmitting = false;
      }
    });
  }

}
