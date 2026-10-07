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

  beforeEach(async () => {
    navigateSpy = vi.fn();
    await TestBed.configureTestingModule({
      imports: [MyMeetings],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => null } }
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
});
