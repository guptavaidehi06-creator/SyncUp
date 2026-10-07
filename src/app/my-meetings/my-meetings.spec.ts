import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../services/auth';

import { MyMeetings } from './my-meetings';

describe('MyMeetings', () => {
  let component: MyMeetings;
  let fixture: ComponentFixture<MyMeetings>;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let logoutSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigateSpy = vi.fn();
    logoutSpy = vi.fn();
    await TestBed.configureTestingModule({
      imports: [MyMeetings],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => null, logout: logoutSpy } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyMeetings);
    component = fixture.componentInstance;
    await fixture.whenStable();
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

  it('keeps the participant logged in when logout confirmation is cancelled', () => {
    fixture.detectChanges();
    const logoutButton = fixture.nativeElement.querySelector('.topbar-logout') as HTMLButtonElement;
    logoutButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain(
      'Are you sure you want to logout?'
    );
    expect(logoutSpy).not.toHaveBeenCalled();

    (fixture.nativeElement.querySelector('.participant-logout-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(logoutSpy).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('runs the existing logout flow only after logout is confirmed', () => {
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.topbar-logout') as HTMLButtonElement).click();
    fixture.detectChanges();
    navigateSpy.mockClear();

    (fixture.nativeElement.querySelector('.participant-logout-confirm') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(logoutSpy).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
