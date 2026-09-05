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

  loadMyMeetings(): void {
    this.participantService.getAllParticipants().subscribe({
      next: (participants: any) => {
        const myParticipantEntries = participants.filter(
          (p: any) => p.userId === this.currentUser.id
        );

        const myMeetingIds = myParticipantEntries.map(
          (p: any) => p.meetingId
        );

        this.meetingService.getAllMeetings().subscribe({
          next: (meetings: any) => {
            this.myMeetings = meetings.filter(
              (m: any) => myMeetingIds.includes(m.id)
            );

            this.loadMyAvailability();
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error fetching meetings:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error fetching participants:', err);
      }
    });
  }

  loadMyAvailability(): void {
    this.availabilityService
      .getAvailabilitiesByUser(this.currentUser.id)
      .subscribe({
        next: (availabilities: any) => {
          this.submittedMeetingIds.clear();

          availabilities.forEach((availability: any) => {
            if (
              availability.meetingId !== null &&
              availability.meetingId !== undefined
            ) {
              this.submittedMeetingIds.add(
                availability.meetingId
              );
            }
          });

          this.updateNotifications();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(
            'Error fetching availability:',
            err
          );
        }
      });
  }

  loadNotifications(): void {
    this.notificationService
      .getNotificationsByUser(this.currentUser.id)
      .subscribe({
        next: (data: any) => {
          this.notifications = data;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching notifications:', err);
        }
      });
  }

  updateNotifications(): void {
    this.myMeetings.forEach((meeting: any) => {
      if (this.needsAvailability(meeting)) {
        const alreadyExists = this.notifications.some(
          (notification: any) =>
            notification.meetingId === meeting.id &&
            notification.type === 'Availability'
        );

        if (!alreadyExists) {
          const notification = {
            userId: this.currentUser.id,
            meetingId: meeting.id,
            title: 'Availability Required',
            message: `Please submit your availability for ${meeting.title}`,
            type: 'Availability',
            isRead: false
          };

          this.notificationService
            .addNotification(notification)
            .subscribe({
              next: (createdNotification: any) => {
                this.notifications.unshift(createdNotification);
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error(
                  'Error creating notification:',
                  err
                );
              }
            });
        }
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  markNotificationsAsRead(): void {
    if (!this.currentUser) {
      return;
    }

    this.notificationService
      .markAllAsRead(this.currentUser.id)
      .subscribe({
        next: () => {
          this.notifications.forEach(
            (notification: any) => {
              notification.isRead = true;
            }
          );

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(
            'Error marking notifications as read:',
            err
          );
        }
      });
  }

  get unreadNotificationCount(): number {
    return this.notifications.filter(
      (notification: any) => !notification.isRead
    ).length;
  }

  openNotification(notification: any): void {
    if (!notification.isRead) {
      this.notificationService
        .markAsRead(notification.id)
        .subscribe({
          next: () => {
            notification.isRead = true;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error(
              'Error marking notification as read:',
              err
            );
          }
        });
    }

    if (
      notification.type === 'Availability' &&
      notification.meetingId
    ) {
      this.goToSubmitAvailability(
        notification.meetingId
      );
    }
  }

  get upcomingMeetings(): any[] {
    return this.myMeetings.filter(
      (meeting: any) =>
        meeting.status !== 'Cancelled' &&
        this.isUpcoming(meeting)
    );
  }

  get pastMeetings(): any[] {
    return this.myMeetings.filter(
      (meeting: any) =>
        meeting.status !== 'Cancelled' &&
        !this.isUpcoming(meeting)
    );
  }

  get cancelledMeetings(): any[] {
    return this.myMeetings.filter(
      (meeting: any) =>
        meeting.status === 'Cancelled'
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
          meeting.id
        )
    ).length;
  }

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
    return (
      meeting.status !== 'Cancelled' &&
      this.isUpcoming(meeting) &&
      !this.hasSubmittedAvailability(
        meeting.id
      )
    );
  }

  isUpcoming(meeting: any): boolean {
    if (!meeting.meetingDate) {
      return true;
    }

    const meetingDateTime = new Date(
      meeting.meetingDate
    );

    if (meeting.meetingTime) {
      const timeParts =
        meeting.meetingTime.split(':');

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

    return meetingDateTime >= new Date();
  }

  goToSubmitAvailability(
    meetingId: number
  ): void {
    this.router.navigate([
      '/submit-availability',
      meetingId
    ]);
  }

  logout(): void {
    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);
  }
}