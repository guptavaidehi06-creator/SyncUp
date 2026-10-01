import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigateSpy = vi.fn();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: Router, useValue: { navigate: navigateSpy } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => null } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
});
