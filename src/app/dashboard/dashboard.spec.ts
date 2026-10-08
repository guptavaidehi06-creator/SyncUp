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
  let logoutAndRedirectSpy: ReturnType<typeof vi.fn>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    navigateSpy = vi.fn();
    logoutAndRedirectSpy = vi.fn();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ view: 'home' })) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => null, logoutAndRedirect: logoutAndRedirectSpy } }
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
    vi.restoreAllMocks();
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

  it('loads one real Admin notification request and renders its workspace context', () => {
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    fixture.detectChanges();
    const bell = fixture.nativeElement.querySelector('.notification-button') as HTMLButtonElement;

    bell.click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(true);
    expect(fixture.nativeElement.querySelector('#admin-notifications')).not.toBeNull();
    expect(component.notificationsLoading).toBe(true);

    bell.click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(false);
    bell.click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(true);

    const request = httpMock.expectOne(request =>
      request.method === 'GET' && request.url.endsWith('/api/notification/user/7')
    );
    request.flush([
      { id: 1, userId: 7, title: 'Meeting Created', message: 'Planning was created.', type: 'Meeting', isRead: false },
      { id: 2, userId: 7, title: 'Availability Submitted', message: 'A participant submitted availability.', type: 'AvailabilitySubmitted', isRead: true },
      { id: 3, userId: 7, title: 'Meeting Rescheduled', message: 'Planning was rescheduled.', type: 'Meeting', isRead: false }
    ]);
    fixture.detectChanges();

    expect(component.notificationsLoading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Workspace activity');
    expect(fixture.nativeElement.textContent).toContain('Meeting Created');
    expect(fixture.nativeElement.textContent).toContain('Availability Submitted');
    expect(fixture.nativeElement.textContent).toContain('Meeting Rescheduled');
    expect(httpMock.match(request => request.url.endsWith('/api/notification/user/7'))).toHaveLength(0);

    (fixture.nativeElement.querySelector('.notification-header') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(true);
    document.body.click();
    fixture.detectChanges();
    expect(component.notificationsOpen).toBe(false);
  });

  it('routes every admin sidebar navigation button to its matching view', () => {
    fixture.detectChanges();
    const expectedViews: Array<[string, string]> = [
      ['Home', 'home'],
      ['My Meetings', 'meetings'],
      ['Create Meeting', 'create'],
      ['Participants', 'participants'],
      ['Availability', 'availability'],
      ['Find Best Slot', 'slot']
    ];

    for (const [label, view] of expectedViews) {
      const button = [...fixture.nativeElement.querySelectorAll('nav button')]
        .find((candidate: HTMLButtonElement) => candidate.textContent?.includes(label)) as HTMLButtonElement;
      button.click();
      fixture.detectChanges();
      expect(component.activeView).toBe(view);
      expect(navigateSpy).toHaveBeenLastCalledWith(['/admin', view]);
    }
  });

  it('adds a selected participant from the Participants action', () => {
    fixture.detectChanges();
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.activeView = 'participants';
    component.participantMeetingId = 12;
    component.users = [{ id: 8, name: 'Avery Example', email: 'avery@example.com' }];
    component.selectedUserIds = new Set([8]);
    fixture.detectChanges();
    expect(component.activeView).toBe('participants');
    expect(component.participantMeetingId).toBe(12);

    component.addSelectedParticipants();
    const request = httpMock.expectOne(request => request.method === 'POST' && request.url.endsWith('/api/meetingparticipants'));
    expect(request.request.body).toEqual({ meetingId: 12, userId: 8, isMandatory: false });
    request.flush({ id: 34, meetingId: 12, userId: 8, isMandatory: false });
    httpMock.expectOne(request => request.method === 'GET' && request.url.endsWith('/api/notification/user/7')).flush([]);
    expect(component.isAddingParticipants).toBe(false);
  });

  it('opens the existing meeting form with selected meeting values for Reschedule', () => {
    const meeting = {
      id: 22,
      title: 'Planning review',
      meetingDate: component.getTomorrowDate(),
      priority: 'High',
      status: 'Scheduled',
      createdBy: 7
    };

    component.rescheduleMeeting(meeting);

    expect(component.reschedulingMeeting).toBe(meeting);
    expect(component.newMeeting).toEqual({
      title: 'Planning review',
      meetingDate: meeting.meetingDate,
      priority: 'High'
    });
    expect(component.activeView).toBe('create');
    expect(navigateSpy).toHaveBeenLastCalledWith(['/admin', 'create']);
  });

  it('keeps a cancelled meeting unchanged on No and confirms it in the in-app dialog on Yes', () => {
    const meeting = {
      id: 22,
      title: 'Planning review',
      meetingDate: component.getTomorrowDate(),
      priority: 'High',
      status: 'Scheduled',
      createdBy: 7
    };
    component.meetings = [meeting];
    fixture.detectChanges();

    component.cancelMeeting(meeting);
    (component as any).cdr.detectChanges();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cancel-meeting-overlay')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cancel-meeting-modal')?.textContent).toContain('Yes, Cancel');

    (fixture.nativeElement.querySelector('.cancel-meeting-actions .quiet') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.meetings[0].status).toBe('Scheduled');
    expect(httpMock.match(request => request.url.endsWith('/api/meetings/22'))).toHaveLength(0);

    component.cancelMeeting(meeting);
    (component as any).cdr.detectChanges();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.cancel-meeting-confirm') as HTMLButtonElement).click();
    const update = httpMock.expectOne(request => request.method === 'PUT' && request.url.endsWith('/api/meetings/22'));
    expect(update.request.body.status).toBe('Cancelled');
    update.flush({ ...meeting, status: 'Cancelled' });

    fixture.detectChanges();
    expect(component.meetings[0].status).toBe('Cancelled');
    expect(fixture.nativeElement.querySelector('.cancel-meeting-overlay')).toBeNull();
    expect(component.meetingToastMessage).toBe('Meeting cancelled successfully! 🎉');
  });

  it('keeps the empty Today section compact and before Upcoming Meetings', () => {
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.meetings = [];
    component.participants = [];
    fixture.detectChanges();

    const headings = [...fixture.nativeElement.querySelectorAll('.home-view h2')]
      .map((heading: Element) => heading.textContent?.trim());
    const today = fixture.nativeElement.querySelector('.today-meetings-section');

    expect(headings.indexOf("Today's Meetings")).toBeLessThan(headings.indexOf('Upcoming Meetings'));
    expect(today.classList.contains('is-empty')).toBe(true);
    expect(today.textContent).toContain('No meetings today');
    expect(today.textContent).toContain('Meetings scheduled for today will appear here.');
  });

  it('cancels logout without clearing the session and uses the shared flow when confirmed', () => {
    fixture.detectChanges();
    const nativeConfirmSpy = vi.spyOn(window, 'confirm');
    (fixture.nativeElement.querySelector('.logout') as HTMLButtonElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.admin-logout-dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Are you sure you want to logout?');
    expect(dialog.textContent).toContain('No');
    expect(dialog.textContent).toContain('Yes, Logout');
    expect(nativeConfirmSpy).not.toHaveBeenCalled();

    (dialog.querySelector('.admin-logout-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.admin-logout-dialog')).toBeNull();
    expect(logoutAndRedirectSpy).not.toHaveBeenCalled();

    (fixture.nativeElement.querySelector('.logout') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.admin-logout-confirm') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(logoutAndRedirectSpy).toHaveBeenCalledOnce();
    nativeConfirmSpy.mockRestore();
  });

  it('shows availability only for the current admin participant and counts today meetings', () => {
    fixture.detectChanges();
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    const tomorrow = component.getTomorrowDate();
    const today = component.getTodayDate();
    component.meetings = [
      { id: 1, title: 'Pending', meetingDate: tomorrow, status: 'Upcoming', priority: 'Medium', createdBy: 7 },
      { id: 2, title: 'Submitted', meetingDate: tomorrow, status: 'Rescheduled', priority: 'Medium', createdBy: 2 },
      { id: 3, title: 'Scheduled', meetingDate: tomorrow, status: 'Scheduled', priority: 'Medium', createdBy: 7 },
      { id: 4, title: 'Today', meetingDate: today, status: 'Upcoming', priority: 'Medium', createdBy: 7 },
      { id: 5, title: 'Confirmed', meetingDate: tomorrow, status: 'Confirmed', priority: 'Medium', createdBy: 7 },
      { id: 6, title: 'Cancelled', meetingDate: tomorrow, status: 'Cancelled', priority: 'Medium', createdBy: 7 },
      { id: 7, title: 'Past', meetingDate: '2000-01-01', status: 'Upcoming', priority: 'Medium', createdBy: 7 },
      { id: 8, title: 'Other participant review', meetingDate: tomorrow, status: 'Upcoming', priority: 'Medium', createdBy: 2 }
    ];
    component.participants = [
      { meetingId: 1, userId: 7, isMandatory: true },
      { meetingId: 2, userId: 7, isMandatory: false },
      { meetingId: 3, userId: 7, isMandatory: true },
      { meetingId: 5, userId: 7, isMandatory: true },
      { meetingId: 6, userId: 7, isMandatory: true },
      { meetingId: 7, userId: 7, isMandatory: true },
      { meetingId: 8, userId: 8, isMandatory: true }
    ];
    component.availability = [
      { meetingId: 2, userId: 7, startTime: '09:00', endTime: '10:00' }
    ];

    expect(component.getAdminAvailabilityMeetings().map(meeting => meeting.id)).toEqual([1, 2]);
    expect(component.getAvailabilityReviewMeetings().map(meeting => meeting.id)).toEqual([4, 1, 2, 8]);
    expect(component.getPendingAdminAvailabilityMeetings().map(meeting => meeting.id)).toEqual([1]);
    expect(component.hasAdminSubmittedAvailability(2)).toBe(true);
    expect(component.getAdminTodayMeetingCount()).toBe(1);
    expect(component.getAdminTodayMeetings().map(meeting => meeting.id)).toEqual([4]);

  });

  it('moves a scheduled meeting to Past at its end time and sorts history by date and time newest first', () => {
    const date = component.getTodayDate();
    const meeting = { id: 10, title: 'Planning', meetingDate: date, meetingTime: '08:00', meetingEndTime: '09:00', status: 'Scheduled', priority: 'Medium', createdBy: 7 };
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${date}T08:59:00`));
    expect(component.isMeetingPast(meeting)).toBe(false);
    vi.setSystemTime(new Date(`${date}T09:00:00`));
    expect(component.isMeetingPast(meeting)).toBe(true);
    expect(component.isMeetingPast({ ...meeting, meetingEndTime: null, durationMinutes: 60 })).toBe(true);
    vi.setSystemTime(new Date(`${date}T08:59:00`));
    expect(component.isMeetingPast({ ...meeting, meetingEndTime: null, durationMinutes: 60 })).toBe(false);
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.meetings = [
      { id: 1, title: 'Older title z', meetingDate: '2026-10-06', meetingTime: '15:00', status: 'Completed', priority: 'Medium', createdBy: 7 },
      { id: 2, title: 'Newest title a', meetingDate: '2026-10-08', meetingTime: '09:30', status: 'Cancelled', priority: 'Medium', createdBy: 7 },
      { id: 3, title: 'Same day later', meetingDate: '2026-10-08', meetingTime: '11:00', status: 'Completed', priority: 'Medium', createdBy: 7 }
    ];
    expect(component.getPastMeetings().map(item => item.id)).toEqual([3, 2, 1]);
  });

  it('removes ended scheduled meetings from the Admin Today section', () => {
    const date = component.getTodayDate();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${date}T09:00:00`));
    component.currentUser = { id: 7, name: 'Admin', email: 'admin@example.com' };
    component.meetings = [{ id: 1, title: 'Ended', meetingDate: date, meetingTime: '08:00', meetingEndTime: '09:00', status: 'Scheduled', priority: 'Medium', createdBy: 7 }];
    expect(component.getAdminTodayMeetings()).toHaveLength(0);
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
    expect(component.suggestResult).toEqual({
      success: false,
      message: 'The selected slot is no longer available.'
    });
  });
});
