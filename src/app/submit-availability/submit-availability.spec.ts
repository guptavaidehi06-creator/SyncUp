import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth';

import { SubmitAvailability } from './submit-availability';

describe('SubmitAvailability', () => {
  let component: SubmitAvailability;
  let fixture: ComponentFixture<SubmitAvailability>;
  let httpMock: HttpTestingController;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    routeParams = new BehaviorSubject(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [SubmitAvailability],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: routeParams } },
        { provide: AuthService, useValue: { getUser: () => ({ id: 5, name: 'Participant' }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitAvailability);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reloads meeting details when Angular reuses the route with a new meeting id', () => {
    fixture.detectChanges();
    expect(httpMock.match(request => request.method === 'GET' && request.url.endsWith('/api/meetings'))).toHaveLength(0);

    routeParams.next(convertToParamMap({ meetingId: '41' }));
    const firstRequest = httpMock.expectOne(request => request.method === 'GET' && request.url.endsWith('/api/meetings'));
    firstRequest.flush([
      { id: 41, title: 'First meeting', meetingDate: '2026-10-12', status: 'Upcoming' },
      { id: 42, title: 'Second meeting', meetingDate: '2026-10-13', status: 'Upcoming' }
    ]);
    expect(component.meetingId).toBe(41);
    expect(component.meeting?.title).toBe('First meeting');

    routeParams.next(convertToParamMap({ meetingId: '42' }));
    const secondRequest = httpMock.expectOne(request => request.method === 'GET' && request.url.endsWith('/api/meetings'));
    secondRequest.flush([
      { id: 41, title: 'First meeting', meetingDate: '2026-10-12', status: 'Upcoming' },
      { id: 42, title: 'Second meeting', meetingDate: '2026-10-13', status: 'Upcoming' }
    ]);

    expect(component.meetingId).toBe(42);
    expect(component.meeting?.title).toBe('Second meeting');
  });
});
