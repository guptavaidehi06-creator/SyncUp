import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth';
import { MeetingService } from '../services/meeting';
import { ParticipantService } from '../services/participant';
import { AvailabilityService } from '../services/availability';
import { NotificationService } from '../services/notification';

@Component({
  selector: 'app-my-meetings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-meetings.html',
  styleUrl: './my-meetings.css'
})
export class MyMeetings implements OnInit {

  currentUser: any = null;

  myMeetings: any[] = [];

  submittedMeetingIds: Set<number> = new Set();

  notifications: any[] = [];

  showNotifications = false;

  constructor(
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

          const myParticipantEntries =
            (participants || []).filter(
              (p: any) =>
                p.userId === this.currentUser.id
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
                      myMeetingIds.includes(m.id)
                  );

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

    const meetingDateTime =
      new Date(
        `${meeting.meetingDate}T${meeting.meetingTime || '00:00'}`
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

  private getMeetingTimestamp(meeting: any): number {

    if (!meeting.meetingDate) {
      return Number.MAX_SAFE_INTEGER;
    }

    return new Date(
      `${meeting.meetingDate}T${meeting.meetingTime || '00:00'}`
    ).getTime();
  }

  // =========================
  // GO TO SUBMIT AVAILABILITY
  // =========================

  goToSubmitAvailability(
    meetingId: number
  ): void {

    this.router.navigate([
      '/submit-availability',
      meetingId
    ]);

  }

  // =========================
  // LOGOUT
  // =========================

  logout(): void {

    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);

  }

}
