import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MeetingService } from './meeting';

describe('MeetingService', () => {
  let service: MeetingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(MeetingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts a new meeting to the meetings endpoint', () => {
    const meeting = { title: 'Planning', meetingDate: '2030-04-10', priority: 'High' };
    service.addMeeting(meeting).subscribe(result => expect(result.id).toBe(23));

    const request = httpMock.expectOne(request => request.url.endsWith('/api/meetings'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(meeting);
    request.flush({ ...meeting, id: 23, status: 'Upcoming', createdBy: 7 });
  });
});
