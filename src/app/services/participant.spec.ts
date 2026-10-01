import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ParticipantService } from './participant';

describe('ParticipantService', () => {
  let service: ParticipantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ParticipantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('unwraps the participant returned by the API', () => {
    const participant = { id: 3, meetingId: 23, userId: 7, isMandatory: true };
    let result: unknown;
    service.addParticipant(participant).subscribe(value => result = value);

    const request = httpMock.expectOne(request => request.url.endsWith('/api/meetingparticipants'));
    expect(request.request.method).toBe('POST');
    request.flush({ participant });

    expect(result).toEqual(participant);
  });
});
