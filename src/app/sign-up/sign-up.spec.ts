import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgForm } from '@angular/forms';

import { SignUp } from './sign-up';

describe('SignUp', () => {
  let component: SignUp;
  let fixture: ComponentFixture<SignUp>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUp],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SignUp);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('creates the account and advances to email verification after the API response', () => {
    component.newUser = { name: 'Avery Example', email: 'avery@example.com', password: 'Secure!123' };
    component.register({ invalid: false } as NgForm);

    const request = httpMock.expectOne(request => request.method === 'POST' && request.url.endsWith('/api/auth/register'));
    expect(request.request.body).toEqual(component.newUser);
    request.flush('Verification code sent');

    expect(component.step).toBe('verify');
    expect(component.isSubmitting).toBe(false);
  });
});
