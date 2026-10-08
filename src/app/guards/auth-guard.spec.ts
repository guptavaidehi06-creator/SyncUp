import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, RouterStateSnapshot, ActivatedRouteSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth';

import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => false } }
      ]
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('redirects anonymous users to Login and allows authenticated users', () => {
    const router = TestBed.inject(Router);
    const result = executeGuard({} as ActivatedRouteSnapshot, { url: '/my-meetings' } as RouterStateSnapshot);
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');

    vi.spyOn(TestBed.inject(AuthService), 'isLoggedIn').mockReturnValue(true);
    expect(executeGuard({} as ActivatedRouteSnapshot, { url: '/my-meetings' } as RouterStateSnapshot)).toBe(true);
  });
});
