import { Component, OnInit, ChangeDetectorRef, DestroyRef, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../services/auth';
import { MeetingService } from '../services/meeting';
import { ParticipantService } from '../services/participant';
import { AvailabilityService } from '../services/availability';
import { NotificationService } from '../services/notification';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';

@Component({
  selector: 'app-my-meetings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-meetings.html',
  styleUrl: './my-meetings.css'
})
export class MyMeetings implements OnInit {

  // Retained for compatibility with existing responsive-state consumers; this page has no sidebar.
  sidebarOpen = typeof window === 'undefined' || window.innerWidth > 850;
  @ViewChild('notificationMenu') notificationMenu?: ElementRef<HTMLElement>;
  activePage: 'meetings' | 'availability' = 'meetings';

  currentUser: any = null;

  myMeetings: any[] = [];

  private meetingParticipantCounts = new Map<number, number>();
  private allMeetings: any[] = [];
  private allParticipants: any[] = [];
  private readonly destroyRef = inject(DestroyRef);

  submittedMeetingIds: Set<number> = new Set();

  notifications: any[] = [];

  showNotifications = false;
  showLogoutConfirmation = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private meetingService: MeetingService,
    private participantService: ParticipantService,
    private availabilityService: AvailabilityService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.currentUser = this.authService.getUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.authService.isAdmin()) {
      void this.router.navigate(['/admin/home'], { replaceUrl: true });
      return;
    }

    this.meetingService.meetings$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(meetings => {
        this.allMeetings = meetings;
        this.syncMyMeetings();
      });
    this.participantService.participants$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(participants => {
        this.allParticipants = participants;
        this.updateParticipantCounts(participants);
        this.syncMyMeetings();
      });
    this.availabilityService.availabilities$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(availabilities => {
        this.submittedMeetingIds = new Set((availabilities || [])
          .filter(item => Number(item.userId) === Number(this.currentUser?.id))
          .map(item => Number(item.meetingId)));
        this.cdr.detectChanges();
      });

    this.route.queryParamMap.pipe(
      map(params => params.get('view') === 'availability' ? 'availability' : 'meetings'),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(page => {
      this.activePage = page;
      this.showNotifications = false;
      this.cdr.detectChanges();
    });

    this.loadNotifications();

    this.loadMyMeetings();
  }

  // =========================
  // LOAD MY MEETINGS
  // =========================

  loadMyMeetings(): void {

    this.participantService
      .getAllParticipants()
      .subscribe({

        next: (participants: any[]) => {

          this.allParticipants = participants || [];
          this.updateParticipantCounts(this.allParticipants);

          const myParticipantEntries =
            (participants || []).filter(
                (p: any) =>
                Number(p.userId) === Number(this.currentUser.id)
            );

          const myMeetingIds =
            myParticipantEntries
              .map(
                (p: any) => p.meetingId
              )
              .filter(
                (id: any) =>
                  id !== null &&
                  id !== undefined
              );

          // IMPORTANT:
          // Tere MeetingService me method ka naam
          // getMeetings() hai, getAllMeetings() nahi

          this.meetingService
            .getMeetings()
            .subscribe({

              next: (meetings: any[]) => {

                this.myMeetings =
                  (meetings || []).filter(
                    (m: any) =>
                      myMeetingIds.some(id => Number(id) === Number(m.id))
                  );
                this.allMeetings = meetings || [];

                this.loadMyAvailability();

                this.cdr.detectChanges();
              },

              error: (err: any) => {

                console.error(
                  'Error fetching meetings:',
                  err
                );

              }

            });

        },

        error: (err: any) => {

          console.error(
            'Error fetching participants:',
            err
          );

        }

      });

  }

  // =========================
  // LOAD MY AVAILABILITY
  // =========================

  loadMyAvailability(): void {

    if (!this.currentUser) {
      return;
    }

    this.availabilityService
      .getAvailabilitiesByUser(
        this.currentUser.id
      )
      .subscribe({

        next: (availabilities: any[]) => {

          this.submittedMeetingIds.clear();

          (availabilities || []).forEach(
            (availability: any) => {

              if (
                availability.meetingId !== null &&
                availability.meetingId !== undefined
              ) {

                this.submittedMeetingIds.add(
                  Number(availability.meetingId)
                );

              }

            }
          );

          this.cdr.detectChanges();
        },

        error: (err: any) => {

          console.error(
            'Error fetching availability:',
            err
          );

        }

      });

  }

  // =========================
  // LOAD NOTIFICATIONS
  // =========================

  loadNotifications(): void {

    if (!this.currentUser) {
      return;
    }

    this.notificationService
      .getNotificationsByUser(
        this.currentUser.id
      )
      .subscribe({

        next: (data: any[]) => {

          this.notifications = data || [];

          this.cdr.detectChanges();
        },

        error: (err: any) => {

          console.error(
            'Error fetching notifications:',
            err
          );

        }

      });

  }

  // =========================
  // NOTIFICATIONS
  // =========================

  toggleNotifications(): void {

    this.showNotifications =
      !this.showNotifications;

  }

  @HostListener('document:click', ['$event'])
  closeNotificationsOnOutsideClick(event: MouseEvent): void {
    if (!this.showNotifications) return;
    const target = event.target;
    if (target instanceof Node && !this.notificationMenu?.nativeElement.contains(target)) {
      this.showNotifications = false;
    }
  }

  markNotificationsAsRead(): void {

    if (!this.currentUser) {
      return;
    }

    this.notificationService
      .markAllAsRead(
        this.currentUser.id
      )
      .subscribe({

        next: () => {

          this.notifications.forEach(
            (notification: any) => {
              
              notification.isRead =
                true;

            }
          );

          this.cdr.detectChanges();
        },

        error: (err: any) => {

          console.error(
            'Error marking notifications as read:',
            err
          );

        }

      });

  }

  get unreadNotificationCount(): number {

    return this.notifications.filter(
      (notification: any) =>
        !notification.isRead
    ).length;

  }

  openNotification(
    notification: any
  ): void {

    if (
      !notification.isRead &&
      notification.id !== undefined &&
      notification.id !== null
    ) {

      this.notificationService
        .markAsRead(
          notification.id
        )
        .subscribe({

          next: () => {

            notification.isRead = true;

            this.cdr.detectChanges();
          },

          error: (err: any) => {

            console.error(
              'Error marking notification as read:',
              err
            );

          }

        });

    }

    if (
      notification.type === 'Availability' &&
      notification.meetingId !== null &&
      notification.meetingId !== undefined
    ) {

      this.goToSubmitAvailability(
        Number(notification.meetingId)
      );

    }

  }

  // =========================
  // MEETING FILTERS
  // =========================

  get upcomingMeetings(): any[] {

    return this.myMeetings
      .filter((meeting: any) => !this.isPastMeeting(meeting))
      .sort((a: any, b: any) =>
        this.getMeetingTimestamp(a) - this.getMeetingTimestamp(b)
      );

  }

  get pastMeetings(): any[] {

    return this.myMeetings
      .filter((meeting: any) => this.isPastMeeting(meeting))
      .sort((a: any, b: any) =>
        this.getMeetingTimestamp(b) - this.getMeetingTimestamp(a)
      );

  }

  get todayMeetings(): any[] {
    const today = this.getLocalDateString();
    return this.myMeetings.filter((meeting: any) => {
      const status = meeting.status?.toLowerCase();
      return status !== 'cancelled' && status !== 'completed' &&
        String(meeting.meetingDate).slice(0, 10) === today;
    }).sort((a: any, b: any) =>
      this.getMeetingTimestamp(a) - this.getMeetingTimestamp(b)
    );
  }

  get futureMeetings(): any[] {
    return this.upcomingMeetings.filter((meeting: any) => !this.isMeetingToday(meeting));
  }

  get displayUpcomingMeetings(): any[] {
    return this.futureMeetings.filter((meeting: any) => !this.needsAvailability(meeting));
  }

  get pendingMeetings(): any[] {

    return this.upcomingMeetings.filter(
      (meeting: any) =>
        this.needsAvailability(meeting)
    );

  }

  get pendingAvailabilityCount(): number {

    return this.pendingMeetings.length;

  }

  get submittedAvailabilityCount(): number {

    return this.upcomingMeetings.filter(
      (meeting: any) =>
        this.hasSubmittedAvailability(
          Number(meeting.id)
        )
    ).length;

  }

  // =========================
  // AVAILABILITY CHECK
  // =========================

  hasSubmittedAvailability(
    meetingId: number
  ): boolean {

    return this.submittedMeetingIds.has(
      meetingId
    );

  }

  needsAvailability(
    meeting: any
  ): boolean {

    if (
      meeting.id === null ||
      meeting.id === undefined
    ) {
      return false;
    }

    return (
      meeting.status !== 'Cancelled' &&
      this.isUpcoming(meeting) &&
      !this.hasSubmittedAvailability(
        Number(meeting.id)
      )
    );

  }

  // =========================
  // CHECK IF MEETING IS UPCOMING
  // =========================

  isUpcoming(
    meeting: any
  ): boolean {

    return !this.isPastMeeting(meeting);
  }

  isPastMeeting(
    meeting: any
  ): boolean {

    const status = meeting.status?.toLowerCase();

    if (status === 'cancelled' || status === 'completed') {
      return true;
    }

    if (!meeting.meetingDate) {
      return false;
    }

    if (!meeting.meetingTime) {
      return String(meeting.meetingDate).slice(0, 10) < this.getLocalDateString();
    }

    const meetingDateTime = new Date(
      `${String(meeting.meetingDate).slice(0, 10)}T00:00:00`
    );

    if (meeting.meetingTime) {

      const timeParts =
        meeting.meetingTime
          .split(':');

      const hours =
        Number(timeParts[0]);

      const minutes =
        Number(timeParts[1]);

      meetingDateTime.setHours(
        hours,
        minutes,
        0,
        0
      );

    }

    return meetingDateTime < new Date();

  }

  private isMeetingToday(meeting: any): boolean {
    return String(meeting.meetingDate).slice(0, 10) === this.getLocalDateString();
  }

  private getLocalDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  setPage(page: 'meetings' | 'availability'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: page === 'meetings' ? null : page },
      queryParamsHandling: 'merge'
    });
  }

  getPastStatus(meeting: any): string {

    const status = meeting.status?.toLowerCase();

    if (status === 'cancelled') {
      return 'Cancelled';
    }

    if (status === 'completed') {
      return 'Completed';
    }

    return 'Past';
  }

  getParticipantCount(meetingId: number): number {
    return this.meetingParticipantCounts.get(Number(meetingId)) || 0;
  }

  private updateParticipantCounts(participants: any[]): void {
    this.meetingParticipantCounts.clear();
    (participants || []).forEach(participant => {
      const meetingId = Number(participant.meetingId);
      if (Number.isFinite(meetingId)) {
        this.meetingParticipantCounts.set(
          meetingId,
          (this.meetingParticipantCounts.get(meetingId) || 0) + 1
        );
      }
    });
  }

  private syncMyMeetings(): void {
    if (!this.currentUser) return;
    const myMeetingIds = new Set(this.allParticipants
      .filter(participant => Number(participant.userId) === Number(this.currentUser.id))
      .map(participant => Number(participant.meetingId)));
    this.myMeetings = this.allMeetings.filter(meeting => myMeetingIds.has(Number(meeting.id)));
    this.cdr.detectChanges();
  }

  getMeetingDuration(meeting: any): string {
    if (meeting.durationMinutes) {
      const hours = Math.floor(meeting.durationMinutes / 60);
      const minutes = meeting.durationMinutes % 60;
      return hours && minutes ? `${hours} hr ${minutes} min` : hours ? `${hours} hr` : `${minutes} min`;
    }
    if (meeting.meetingTime && meeting.meetingEndTime) {
      return `${meeting.meetingTime} – ${meeting.meetingEndTime}`;
    }
    return 'Duration not set';
  }

  private getMeetingTimestamp(meeting: any): number {

    if (!meeting.meetingDate) {
      return Number.MAX_SAFE_INTEGER;
    }

    const date = new Date(`${String(meeting.meetingDate).slice(0, 10)}T00:00:00`);
    if (meeting.meetingTime) {
      const [hours, minutes] = meeting.meetingTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date.getTime();
  }

  // =========================
  // GO TO SUBMIT AVAILABILITY
  // =========================

  goToSubmitAvailability(
    meetingId: number
  ): void {

    void this.router.navigate([
      '/submit-availability',
      meetingId
    ], { state: { returnUrl: this.router.url } });

  }

  openLogoutConfirmation(): void {
    this.showLogoutConfirmation = true;
  }

  closeLogoutConfirmation(): void {
    this.showLogoutConfirmation = false;
  }

  // =========================
  // LOGOUT
  // =========================

  logout(): void {

    this.authService.logoutAndRedirect(this.router);

  }

}
