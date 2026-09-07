import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule, NgForm } from '@angular/forms';

import { Router } from '@angular/router';
import { finalize } from 'rxjs';

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
  successMessage: string = '';
  isSubmitting = false;
  isVerifying = false;

  newUser = {

    name: '',

    email: '',

    password: ''

  };

  verificationCode: string = '';

  resendMessage = '';

  isResending = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  register(signUpForm: NgForm): void {
    if (signUpForm.invalid) {
      signUpForm.control.markAllAsTouched();
      return;
    }

    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    this.authService.register(this.newUser).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({

      next: () => {

        this.successMessage =
          'Account created successfully! Verification code sent to your email.';

        this.step = 'verify';

      },

      error: (err) => {

        this.errorMessage = this.getSignupErrorMessage(err);

        // The account and its verification code are persisted before Brevo is
        // called. Keep the user on the verification step so they can resend.
        if (err?.status === 503 || this.isUnverifiedAccountError(err)) {
          this.step = 'verify';
        }

      }

    });

  }

  private getSignupErrorMessage(err: any): string {
    if (err?.status === 503) {
      return "Account created, but we couldn't send the verification email. Please try again.";
    }

    if (this.isUnverifiedAccountError(err)) {
      return 'An account with this email already exists but is not verified. Please verify your email or resend the verification code.';
    }

    if (err?.status === 400 && typeof err?.error === 'string' &&
      err.error.toLowerCase().includes('already exists')) {
      return 'An account with this email already exists. Please log in.';
    }

    if (err?.status === 0 || err?.status >= 500) {
      return 'Unable to connect to the server. Please try again.';
    }

    return 'Unable to create your account. Please check your details and try again.';
  }

  private isUnverifiedAccountError(err: any): boolean {
    return err?.status === 400 &&
      typeof err?.error === 'string' &&
      err.error.toLowerCase().includes('not verified');
  }

  verify(verifyForm: NgForm): void {
    if (verifyForm.invalid) {
      verifyForm.control.markAllAsTouched();
      return;
    }

    if (this.isVerifying) {
      return;
    }

    this.errorMessage = '';
    this.isVerifying = true;

    this.authService.verify({
      email: this.newUser.email,
      code: this.verificationCode
    }).subscribe({

      next: () => {

        this.isVerifying = false;

        this.router.navigate(['/']);

      },

      error: (err) => {

        this.errorMessage =
          err.error ||
          'Invalid code. Please try again.';

        this.isVerifying = false;

      }

    });

  }

  resendVerification(): void {

    this.errorMessage = '';

    this.resendMessage = '';

    this.isResending = true;

    this.authService
      .resendVerification({
        email: this.newUser.email
      })
      .subscribe({

        next: (message) => {

          this.resendMessage =
            typeof message === 'string'
              ? message
              : 'A new code has been sent.';

          this.isResending = false;

        },

        error: (err) => {

          this.errorMessage =
            err.error ||
            'Unable to resend the code. Please try again.';

          this.isResending = false;

        }

      });

  }

}
