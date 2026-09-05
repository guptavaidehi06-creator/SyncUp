import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
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

  isRequesting: boolean = false;
  isResetting: boolean = false;

  email: string = '';
  code: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // ================= SEND RESET CODE =================

  requestCode(): void {

    this.errorMessage = '';
    this.successMessage = '';

    this.isRequesting = true;

    console.log('Sending forgot password request...');

    this.authService
      .forgotPassword({
        email: this.email
      })
      .pipe(

        timeout(15000),

        finalize(() => {
          this.isRequesting = false;
        })

      )
      .subscribe({

        next: (response) => {

          console.log(
            'Forgot password response:',
            response
          );

          // Change to reset password screen
          this.step = 'reset';

          this.successMessage =
            'Reset code sent! Check your email and spam folder.';

          console.log(
            'Current step:',
            this.step
          );

          // Force Angular to update UI
          this.cdr.detectChanges();

        },

        error: (err) => {

          console.error(
            'Forgot password error:',
            err
          );

          if (err.name === 'TimeoutError') {

            this.errorMessage =
              'Request timed out. Please try again.';

          }
          else if (err.status === 404) {

            this.errorMessage =
              'No account found with this email.';

          }
          else {

            this.errorMessage =
              err.error ||
              'Unable to send reset code. Please try again.';

          }

        }

      });

  }


  // ================= RESET PASSWORD =================

  resetPassword(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (this.newPassword !== this.confirmPassword) {

      this.errorMessage =
        'Passwords do not match.';

      return;

    }

    this.isResetting = true;

    console.log('Resetting password...');

    this.authService
      .resetPassword({

        email: this.email,
        code: this.code,
        newPassword: this.newPassword

      })
      .pipe(

        timeout(15000),

        finalize(() => {
          this.isResetting = false;
        })

      )
      .subscribe({

        next: (response) => {

          console.log(
            'Password reset response:',
            response
          );

          this.successMessage =
            'Password reset successfully! Redirecting to login...';

          // Force UI update
          this.cdr.detectChanges();

          // Redirect after 1.5 seconds
          setTimeout(() => {

            this.router.navigate(['/login']);

          }, 1500);

        },

        error: (err) => {

          console.error(
            'Reset password error:',
            err
          );

          if (err.name === 'TimeoutError') {

            this.errorMessage =
              'Request timed out. Please try again.';

          }
          else {

            this.errorMessage =
              err.error ||
              'Invalid or expired reset code.';

          }

          this.cdr.detectChanges();

        }

      });

  }

}