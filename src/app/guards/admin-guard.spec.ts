import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth';

import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => false, isAdmin: () => false } }
      ]
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('routes anonymous users to Login, non-admins to My Meetings, and allows admins', () => {
    const router = TestBed.inject(Router);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/admin/home' } as RouterStateSnapshot;

    const anonymousResult = executeGuard(route, state);
    expect(anonymousResult instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(anonymousResult as UrlTree)).toBe('/login');

    const authService = TestBed.inject(AuthService);
    vi.spyOn(authService, 'isLoggedIn').mockReturnValue(true);
    const participantResult = executeGuard(route, state);
    expect(participantResult instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(participantResult as UrlTree)).toBe('/my-meetings');

    vi.spyOn(authService, 'isAdmin').mockReturnValue(true);
    expect(executeGuard(route, state)).toBe(true);
  });
});
