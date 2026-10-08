import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../services/auth';

import { MyMeetings } from './my-meetings';

describe('MyMeetings', () => {
  let component: MyMeetings;
  let fixture: ComponentFixture<MyMeetings>;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let logoutAndRedirectSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigateSpy = vi.fn();
    logoutAndRedirectSpy = vi.fn((router: Router) => { void router.navigate(['/login']); });
    await TestBed.configureTestingModule({
      imports: [MyMeetings],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: {
          getUser: () => null,
          logoutAndRedirect: logoutAndRedirectSpy
        } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyMeetings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('keeps a date-only meeting on today out of history', () => {
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    expect(component.isPastMeeting({ meetingDate: localDate, status: 'Upcoming' })).toBe(false);
  });

  it('starts with a collapsed sidebar on a narrow viewport', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    try {
      const mobileFixture = TestBed.createComponent(MyMeetings);
      expect(mobileFixture.componentInstance.sidebarOpen).toBe(false);
      mobileFixture.destroy();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('renders a sidebar-free participant header and toggles notifications with outside-click dismissal', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside.sidebar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.participant-topbar')).not.toBeNull();

    const bell = fixture.nativeElement.querySelector('.notification-btn') as HTMLButtonElement;
    bell.click();
    fixture.detectChanges();
    expect(component.showNotifications).toBe(true);
    expect(fixture.nativeElement.querySelector('.notification-panel')).not.toBeNull();
    (fixture.nativeElement.querySelector('.notification-panel') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.showNotifications).toBe(true);

    bell.click();
    fixture.detectChanges();
    expect(component.showNotifications).toBe(false);

    bell.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(component.showNotifications).toBe(false);
  });

  it('keeps personal notifications and excludes Admin-only workspace events', () => {
    fixture.detectChanges();
    component.currentUser = { id: 9, name: 'Participant', role: 'Non-Admin' };
    component.loadNotifications();
    const request = TestBed.inject(HttpTestingController).expectOne(request =>
      request.method === 'GET' && request.url.endsWith('/api/notification/user/9')
    );
    request.flush([
      { id: 1, title: 'Meeting Created', message: 'Workspace meeting created.', type: 'Meeting', isRead: false },
      { id: 2, title: 'Availability Submitted', message: 'A participant submitted availability.', type: 'AvailabilitySubmitted', isRead: false },
      { id: 3, title: 'Added to Meeting', message: 'You were added to Planning.', type: 'Participant', isRead: false },
      { id: 4, title: 'Meeting Confirmed', message: 'Planning was confirmed.', type: 'Meeting', isRead: true }
    ]);
    fixture.detectChanges();

    expect(component.notifications.map(notification => notification.title)).toEqual([
      'Added to Meeting',
      'Meeting Confirmed'
    ]);
  });

  it('keeps the participant logged in when logout confirmation is cancelled', () => {
    fixture.detectChanges();
    const logoutButton = fixture.nativeElement.querySelector('.topbar-logout') as HTMLButtonElement;
    logoutButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain(
      'Are you sure you want to logout?'
    );
    expect(logoutAndRedirectSpy).not.toHaveBeenCalled();

    (fixture.nativeElement.querySelector('.participant-logout-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(logoutAndRedirectSpy).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the empty Today section compact and before Upcoming Meetings', () => {
    component.myMeetings = [];
    fixture.detectChanges();

    const headings = [...fixture.nativeElement.querySelectorAll('.meeting-section h2')]
      .map((heading: Element) => heading.textContent?.trim());
    const today = fixture.nativeElement.querySelector('.today-meetings-section');

    expect(headings.indexOf("Today's Meetings")).toBeLessThan(headings.indexOf('Upcoming Meetings'));
    expect(today.classList.contains('is-empty')).toBe(true);
    expect(today.textContent).toContain('No meetings today');
    expect(today.textContent).toContain('Meetings scheduled for today will appear here.');
  });

  it('highlights real meetings in Today before the future meeting list', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    vi.spyOn(component as any, 'getLocalDateString').mockReturnValue(today);
    component.myMeetings = [{ id: 7, title: 'Standup', meetingDate: today, status: 'Scheduled', priority: 'Medium' }];
    expect(component.todayMeetings.map(meeting => meeting.title)).toEqual(['Standup']);
  });

  it('moves a scheduled meeting to Past at its end time and sorts history by date and time newest first', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${today}T08:59:00`));
    const meeting = { id: 10, title: 'Planning', meetingDate: today, meetingTime: '08:00', meetingEndTime: '09:00', status: 'Scheduled' };
    expect(component.isPastMeeting(meeting)).toBe(false);
    vi.setSystemTime(new Date(`${today}T09:00:00`));
    expect(component.isPastMeeting(meeting)).toBe(true);
    component.myMeetings = [
      { id: 1, title: 'Older title z', meetingDate: '2026-10-06', meetingTime: '15:00', status: 'Completed' },
      { id: 2, title: 'Newest title a', meetingDate: '2026-10-08', meetingTime: '09:30', status: 'Cancelled' },
      { id: 3, title: 'Same day later', meetingDate: '2026-10-08', meetingTime: '11:00', status: 'Completed' }
    ];
    expect(component.pastMeetings.map(item => item.id)).toEqual([3, 2, 1]);
  });

  it('removes ended scheduled meetings from the participant Today section', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${today}T09:00:00`));
    component.myMeetings = [{ id: 1, title: 'Ended', meetingDate: today, meetingTime: '08:00', meetingEndTime: '09:00', status: 'Scheduled' }];
    expect(component.todayMeetings).toHaveLength(0);
  });

  it('opens the meeting-specific Submit Availability route from the pending meeting CTA', () => {
    fixture.detectChanges();
    component.myMeetings = [{ id: 42, title: 'Planning', meetingDate: '2099-01-15', status: 'Upcoming', priority: 'High' }];
    fixture.detectChanges();
    expect(component.pendingMeetings).toHaveLength(1);

    component.goToSubmitAvailability(42);

    expect(navigateSpy).toHaveBeenLastCalledWith(['/submit-availability', 42], {
      state: { returnUrl: undefined }
    });
  });

  it('runs the existing logout flow only after logout is confirmed', () => {
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.topbar-logout') as HTMLButtonElement).click();
    fixture.detectChanges();
    navigateSpy.mockClear();

    (fixture.nativeElement.querySelector('.participant-logout-confirm') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(logoutAndRedirectSpy).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
