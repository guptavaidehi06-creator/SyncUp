import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AvailabilityService } from './availability';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AvailabilityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loads availability for a meeting', () => {
    service.getAvailabilitiesByMeeting(17).subscribe(result => expect(result).toEqual([]));

    const request = httpMock.expectOne(request => request.url.endsWith('/api/availability/meeting/17'));
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
