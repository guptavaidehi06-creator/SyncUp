import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../services/auth';

import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    navigateSpy = vi.fn();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ view: 'home' })) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => null } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('excludes scheduled and cancelled meetings from Best Slot eligibility', () => {
    const tomorrow = component.getTomorrowDate();
    component.meetings = [
      { id: 1, title: 'Open', meetingDate: tomorrow, priority: 'Medium', status: 'Upcoming', createdBy: 1 },
      { id: 2, title: 'Scheduled', meetingDate: tomorrow, priority: 'Medium', status: 'Scheduled', createdBy: 1 },
      { id: 3, title: 'Rescheduled', meetingDate: tomorrow, priority: 'Medium', status: 'Rescheduled', createdBy: 1 },
      { id: 4, title: 'Cancelled', meetingDate: tomorrow, priority: 'Medium', status: 'Cancelled', createdBy: 1 }
    ];

    expect(component.getMeetingsEligibleForBestSlot().map(meeting => meeting.id)).toEqual([1, 3]);
  });

  it('starts with a collapsed sidebar on a narrow viewport', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    try {
      const mobileFixture = TestBed.createComponent(Dashboard);
      expect(mobileFixture.componentInstance.sidebarOpen).toBe(false);
      mobileFixture.destroy();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('toggles the notification dropdown and closes it on an outside click', () => {
    fixture.detectChanges();
    const bell = fixture.nativeElement.querySelector('.notification-button') as HTMLButtonElement;
    bell.click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(true);
    expect(fixture.nativeElement.querySelector('.notification-dropdown')).not.toBeNull();
    (fixture.nativeElement.querySelector('.notification-dropdown') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(true);

    bell.click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(false);

    bell.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(false);
  });

  it('shows availability only for the current admin participant and counts today meetings', () => {
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    const tomorrow = component.getTomorrowDate();
    const today = component.getTodayDate();
    component.meetings = [
      { id: 1, title: 'Pending', meetingDate: tomorrow, status: 'Upcoming', priority: 'Medium', createdBy: 7 },
      { id: 2, title: 'Submitted', meetingDate: tomorrow, status: 'Rescheduled', priority: 'Medium', createdBy: 2 },
      { id: 3, title: 'Scheduled', meetingDate: tomorrow, status: 'Scheduled', priority: 'Medium', createdBy: 7 },
      { id: 4, title: 'Today', meetingDate: today, status: 'Upcoming', priority: 'Medium', createdBy: 7 }
    ];
    component.participants = [
      { meetingId: 1, userId: 7, isMandatory: true },
      { meetingId: 2, userId: 7, isMandatory: false },
      { meetingId: 3, userId: 7, isMandatory: true }
    ];
    component.availability = [
      { meetingId: 2, userId: 7, startTime: '09:00', endTime: '10:00' }
    ];

    expect(component.getAdminAvailabilityMeetings().map(meeting => meeting.id)).toEqual([1, 2]);
    expect(component.getPendingAdminAvailabilityMeetings().map(meeting => meeting.id)).toEqual([1]);
    expect(component.hasAdminSubmittedAvailability(2)).toBe(true);
    expect(component.getAdminTodayMeetingCount()).toBe(1);
  });

  it('stops loading and prevents a blind retry when meeting creation times out', async () => {
    vi.useFakeTimers();
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.newMeeting = {
      title: 'Planning',
      meetingDate: component.getTomorrowDate(),
      priority: 'High'
    };
    component.saveMeeting();
    const request = httpMock.expectOne(request => request.url.endsWith('/api/meetings'));

    await vi.advanceTimersByTimeAsync(30_001);

    expect(request.cancelled).toBe(true);
    expect(component.isSavingMeeting).toBe(false);
    expect(component.isMeetingSaveOutcomeUnknown).toBe(true);
    expect(component.meetingSaveError).toContain('may have been saved');

    component.saveMeeting();
    httpMock.expectNone(request => request.url.endsWith('/api/meetings'));
  });

  it('shows success and clears loading only after the API returns the created meeting', () => {
    vi.useFakeTimers();
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.newMeeting = {
      title: 'Planning',
      meetingDate: component.getTomorrowDate(),
      priority: 'High'
    };
    component.saveMeeting();

    const meeting = {
      id: 24,
      title: 'Planning',
      meetingDate: component.newMeeting.meetingDate,
      priority: 'High',
      status: 'Upcoming',
      createdBy: 7
    };
    httpMock.expectOne(request => request.method === 'POST' && request.url.endsWith('/api/meetings'))
      .flush(meeting);

    expect(component.isSavingMeeting).toBe(false);
    expect(component.meetingToastMessage).toBe('Meeting created successfully! 🎉');
    expect(component.meetingToastType).toBe('success');
    expect(component.activeView).toBe('meetings');

    httpMock.expectOne(request => request.method === 'GET' && request.url.endsWith('/api/notification/user/7'))
      .flush([]);
    httpMock.expectNone(request => request.method === 'GET' && request.url.endsWith('/api/meetings'));
    vi.runOnlyPendingTimers();
  });

  it('preserves API error details and verifies meeting status before retrying', () => {
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.newMeeting = {
      title: 'Planning',
      meetingDate: component.getTomorrowDate(),
      priority: 'High'
    };
    component.saveMeeting();
    httpMock.expectOne(request => request.url.endsWith('/api/meetings')).flush(
      'Database write failed',
      { status: 500, statusText: 'Server Error' }
    );

    expect(component.isSavingMeeting).toBe(false);
    expect(component.isMeetingSaveOutcomeUnknown).toBe(true);
    expect(component.meetingSaveError).toContain('Database write failed');
    expect(component.meetingToastMessage).toContain('Database write failed');
    expect(component.meetingToastType).toBe('error');

    component.checkMeetingSaveOutcome();
    const statusRequest = httpMock.expectOne(request =>
      request.url.endsWith('/api/meetings') && request.method === 'GET'
    );
    statusRequest.flush([]);

    expect(component.isMeetingSaveOutcomeUnknown).toBe(true);
    expect(component.meetingSaveError).toContain('Check again before retrying');

    component.saveMeeting();
    httpMock.expectNone(request => request.method === 'POST' && request.url.endsWith('/api/meetings'));
  });

  it('guards duplicate confirmation, updates the meeting, and shows success after the API responds', () => {
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.meetings = [
      { id: 24, title: 'Planning', meetingDate: component.getTomorrowDate(), priority: 'High', status: 'Upcoming', createdBy: 7 }
    ];
    component.suggestRequest.meetingId = 24;
    component.suggestResult = {
      success: true,
      meetingDate: component.getTomorrowDate(),
      suggestedStartTime: '09:00:00',
      suggestedEndTime: '10:00:00',
      durationMinutes: 60
    };

    component.confirmBestSlot();
    expect(component.isConfirmingSlot).toBe(true);
    component.confirmBestSlot();

    const confirmRequest = httpMock.expectOne(request => request.url.endsWith('/api/scheduling/confirm'));
    expect(confirmRequest.request.method).toBe('POST');
    confirmRequest.flush({
      ...component.meetings[0],
      meetingTime: '09:00:00',
      meetingEndTime: '10:00:00',
      durationMinutes: 60,
      status: 'Scheduled'
    });

    expect(component.isConfirmingSlot).toBe(false);
    expect(component.meetings[0].status).toBe('Scheduled');
    expect(component.meetingToastMessage).toBe('Meeting confirmed successfully! 🎉');
    expect(component.meetingToastType).toBe('success');
    expect(component.suggestResult).toBeNull();

    httpMock.expectOne(request => request.method === 'GET' && request.url.endsWith('/api/notification/user/7'))
      .flush([]);
    httpMock.expectNone(request => request.method === 'GET' && request.url.endsWith('/api/meetings'));
  });

  it('stops confirmation loading and shows an error toast when the API rejects confirmation', () => {
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.meetings = [
      { id: 24, title: 'Planning', meetingDate: component.getTomorrowDate(), priority: 'High', status: 'Upcoming', createdBy: 7 }
    ];
    component.participants = [
      { meetingId: 24, userId: 7, isMandatory: true }
    ];
    component.suggestRequest.meetingId = 24;
    component.suggestResult = {
      success: true,
      meetingDate: component.getTomorrowDate(),
      suggestedStartTime: '09:00:00',
      suggestedEndTime: '10:00:00',
      durationMinutes: 60
    };

    component.confirmBestSlot();
    httpMock.expectOne(request => request.url.endsWith('/api/scheduling/confirm'))
      .flush('The selected slot is no longer available.', { status: 409, statusText: 'Conflict' });

    expect(component.isConfirmingSlot).toBe(false);
    expect(component.meetingToastMessage).toBe('The selected slot is no longer available.');
    expect(component.meetingToastType).toBe('error');
  });
});
