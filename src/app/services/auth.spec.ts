import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const storedItems = new Map<string, string>();

  beforeEach(() => {
    storedItems.clear();
    const localStorageStub: Storage = {
      get length() {
        return storedItems.size;
      },
      getItem: (key: string) => storedItems.get(key) ?? null,
      key: (index: number) => Array.from(storedItems.keys())[index] ?? null,
      setItem: (key: string, value: string) => {
        storedItems.set(key, String(value));
      },
      removeItem: (key: string) => {
        storedItems.delete(key);
      },
      clear: () => {
        storedItems.clear();
      }
    };
    vi.stubGlobal('localStorage', localStorageStub);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('logs in and stores the returned session', () => {
    service.login({ email: 'person@example.com', password: 'secret' }).subscribe();

    const request = httpMock.expectOne(request => request.url.endsWith('/api/auth/login'));
    expect(request.request.method).toBe('POST');
    request.flush({ token: 'jwt', user: { id: 7, isAdmin: false } });

    expect(storedItems.get('token')).toBe('jwt');
    expect(service.getUser()).toEqual({ id: 7, isAdmin: false });
  });

  it('clears the session and redirects to Login through the shared logout flow', () => {
    storedItems.set('token', 'jwt');
    storedItems.set('user', JSON.stringify({ id: 7, isAdmin: true }));
    const router = { navigate: vi.fn().mockResolvedValue(true) } as unknown as Router;

    service.logoutAndRedirect(router);

    expect(storedItems.has('token')).toBe(false);
    expect(storedItems.has('user')).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
