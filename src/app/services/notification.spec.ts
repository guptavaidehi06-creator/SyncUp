import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('marks all notifications for a user as read', () => {
    service.markAllAsRead(7).subscribe();

    const request = httpMock.expectOne(request => request.url.endsWith('/api/notification/user/7/read-all'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({});
    request.flush({});
  });
});
