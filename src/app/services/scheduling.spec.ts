import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SchedulingService } from './scheduling';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SchedulingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts slot suggestions to the scheduling endpoint', () => {
    const requestBody = { meetingId: 23, durationMinutes: 60 };
    service.suggestSlot(requestBody).subscribe(result => expect(result.success).toBe(true));

    const request = httpMock.expectOne(request => request.url.endsWith('/api/scheduling/suggest'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush({ success: true });
  });
});
