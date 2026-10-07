import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { Login } from './login';
import { AuthService } from '../services/auth';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let storageValues: Map<string, string>;

  beforeEach(async () => {
    storageValues = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageValues.get(key) ?? null,
      setItem: (key: string, value: string) => storageValues.set(key, value),
      removeItem: (key: string) => storageValues.delete(key)
    });
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggles password visibility from the form control', () => {
    fixture.detectChanges();
    const password = fixture.debugElement.query(By.css('#password')).nativeElement as HTMLInputElement;
    const visibility = fixture.debugElement.query(By.css('.password-visibility')).nativeElement as HTMLButtonElement;

    expect(password.type).toBe('password');
    visibility.click();
    fixture.detectChanges();

    expect(password.type).toBe('text');
    expect(visibility.getAttribute('aria-label')).toBe('Hide password');
  });

  it('keeps the recovery and signup links on their Angular routes', () => {
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(links.find(link => link.textContent?.includes('Forgot Password'))?.getAttribute('href')).toBe('/forgot-password');
    expect(links.find(link => link.textContent?.includes('Create Account'))?.getAttribute('href')).toBe('/sign-up');
  });

  it('validates before calling the API', () => {
    const authService = TestBed.inject(AuthService);
    const loginSpy = vi.spyOn(authService, 'login');
    const markAllAsTouched = vi.fn();

    component.login({ invalid: true, control: { markAllAsTouched } } as unknown as NgForm);

    expect(loginSpy).not.toHaveBeenCalled();
    expect(markAllAsTouched).toHaveBeenCalled();
  });

  it('remembers the email and keeps the existing successful redirect', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    vi.spyOn(authService, 'login').mockReturnValue(of({ token: 'test-token' }));
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.credentials = { email: 'vaidehi@example.com', password: 'secure-password' };
    component.rememberMe = true;

    component.login({ invalid: false } as NgForm);

    expect(storageValues.get('syncupRememberedEmail')).toBe('vaidehi@example.com');
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(component.isSubmitting).toBe(false);
  });

  it('shows API errors and clears the loading state', () => {
    const authService = TestBed.inject(AuthService);
    vi.spyOn(authService, 'login').mockReturnValue(throwError(() => ({ status: 401 })));
    component.credentials = { email: 'vaidehi@example.com', password: 'wrong-password' };

    component.login({ invalid: false } as NgForm);

    expect(component.errorMessage).toBe('Incorrect email or password. Please try again.');
    expect(component.isSubmitting).toBe(false);
  });
});
