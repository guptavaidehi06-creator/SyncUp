import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sends a reset code and opens the reset step after the API responds', () => {
    component.email = 'person@example.com';
    component.requestCode();
    const request = httpMock.expectOne(request => request.method === 'POST' && request.url.endsWith('/api/auth/forgot-password'));
    expect(request.request.body).toEqual({ email: 'person@example.com' });
    request.flush('Reset code sent');

    expect(component.step).toBe('reset');
    expect(component.isRequesting).toBe(false);
  });

  it('rejects mismatched reset passwords without calling the reset endpoint', () => {
    component.email = 'person@example.com';
    component.code = '123456';
    component.newPassword = 'new-password';
    component.confirmPassword = 'different-password';

    component.resetPassword();

    expect(component.errorMessage).toBe('Passwords do not match.');
    httpMock.expectNone(request => request.url.endsWith('/api/auth/reset-password'));
  });
});
