import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth';
import { MeetingService } from '../services/meeting';
import { ParticipantService } from '../services/participant';
import { AvailabilityService } from '../services/availability';
import { NotificationService } from '../services/notification';

type View =
  | 'home'
  | 'meetings'
  | 'create'
  | 'participants'
  | 'availability'
  | 'slot';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Meeting {
  id: number;
  title: string;
  meetingDate: string;
  meetingTime: string;
  priority: string;
  status: string;
}

interface Participant {
  id?: number;
  meetingId: number;
  userId: number;
  isMandatory: boolean;
}

interface Availability {
  id?: number;
  meetingId: number;
  userId: number;
  startTime: string;
  endTime: string;
}

interface Notification {
  id: number;
  userId?: number;
  meetingId?: number | null;
  title?: string;
  message: string;
  type?: string;
  isRead: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  sidebarOpen = true;
  activeView: View = 'home';
  notificationsOpen = false;
  showLogoutConfirmation = false;

  currentUser: User | null = null;

  users: User[] = [];
  meetings: Meeting[] = [];
  participants: Participant[] = [];
  availability: Availability[] = [];
  notifications: Notification[] = [];

  participantMeetingId: number | null = null;
  availabilityMeetingId: number | null = null;

  selectedUserIds = new Set<number>();

  bulkIsMandatory = false;
  schedulingType = 'fixed';

  reschedulingMeeting: Meeting | null = null;

  suggestRequest = {
    meetingId: null as number | null
  };

  suggestResult: any = null;

  newMeeting = {
    title: '',
    meetingDate: '',
    meetingTime: '',
    priority: 'Medium'
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private meetingService: MeetingService,
    private participantService: ParticipantService,
    private availabilityService: AvailabilityService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {

    this.currentUser = this.authService.getUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadData();
    this.loadMeetings();
    this.loadParticipants();
    this.loadAvailabilities();
    this.loadNotifications();
  }

  // =========================
  // LOAD USERS
  // =========================

  loadData(): void {

    if (!this.currentUser) {
      return;
    }

    this.users = [
      {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email
      },
      {
        id: 2,
        name: 'Rahul Sharma',
        email: 'rahul@example.com'
      },
      {
        id: 3,
        name: 'Priya Patel',
        email: 'priya@example.com'
      },
      {
        id: 4,
        name: 'Aman Singh',
        email: 'aman@example.com'
      }
    ];
  }

  // =========================
  // LOAD MEETINGS
  // =========================

  loadMeetings(): void {

    this.meetingService
      .getAllMeetings()
      .subscribe({

        next: (data: any) => {
          this.meetings = data || [];
        },

        error: (err) => {
          console.error('Error loading meetings:', err);
        }

      });
  }

  // =========================
  // LOAD PARTICIPANTS
  // =========================

  loadParticipants(): void {

    this.participantService
      .getAllParticipants()
      .subscribe({

        next: (data: any) => {
          this.participants = data || [];
        },

        error: (err) => {
          console.error('Error loading participants:', err);
        }

      });
  }

  // =========================
  // LOAD AVAILABILITY
  // =========================

  loadAvailabilities(): void {

    this.availabilityService
      .getAllAvailabilities()
      .subscribe({

        next: (data: any) => {
          this.availability = data || [];
        },

        error: (err) => {
          console.error('Error loading availabilities:', err);
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
      .getNotificationsByUser(this.currentUser.id)
      .subscribe({

        next: (data: any) => {
          this.notifications = data || [];
        },

        error: (err) => {
          console.error('Error loading notifications:', err);
        }

      });
  }

  // =========================
  // SIDEBAR
  // =========================

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  setView(view: View): void {

    this.activeView = view;
    this.notificationsOpen = false;

    if (view !== 'create') {
      this.reschedulingMeeting = null;
    }

    if (view === 'participants') {
      this.selectedUserIds.clear();
      this.loadParticipants();
    }

    if (view === 'availability') {
      this.loadParticipants();
      this.loadAvailabilities();
    }

    if (view === 'slot') {
      this.suggestResult = null;
      this.loadAvailabilities();
    }
  }

  // =========================
  // PAGE TITLE
  // =========================

  getPageTitle(): string {

    switch (this.activeView) {

      case 'home':
        return 'Dashboard';

      case 'meetings':
        return 'My Meetings';

      case 'create':
        return this.reschedulingMeeting
          ? 'Reschedule Meeting'
          : 'Create Meeting';

      case 'participants':
        return 'Participants';

      case 'availability':
        return 'Availability';

      case 'slot':
        return 'Find Best Slot';

      default:
        return 'Dashboard';
    }
  }

  getPageSubtitle(): string {

    switch (this.activeView) {

      case 'home':
        return 'Manage your meetings and stay organized.';

      case 'meetings':
        return 'View and manage all your meetings.';

      case 'create':
        return 'Schedule a new meeting with your workspace.';

      case 'participants':
        return 'Manage meeting participants.';

      case 'availability':
        return 'Check participant availability.';

      case 'slot':
        return 'Find the best time for everyone.';

      default:
        return '';
    }
  }

  // =========================
  // CURRENT USER
  // =========================

  getCurrentUserName(): string {
    return this.currentUser?.name || 'Workspace';
  }

  // =========================
  // DATE
  // =========================

  getTodayDate(): string {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      today.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // =========================
  // MEETINGS
  // =========================

  getUpcomingMeetings(): Meeting[] {

    return this.meetings.filter(
      meeting =>
        meeting.status !== 'Cancelled' &&
        !this.isMeetingPast(meeting)
    );
  }

  getCompletedMeetings(): Meeting[] {

    return this.meetings.filter(
      meeting =>
        meeting.status !== 'Cancelled' &&
        this.isMeetingPast(meeting)
    );
  }

  getMeetingsForDisplay(): Meeting[] {

    return [...this.meetings].sort(
      (a, b) => {

        const dateA = new Date(
          `${a.meetingDate}T${a.meetingTime || '00:00'}`
        ).getTime();

        const dateB = new Date(
          `${b.meetingDate}T${b.meetingTime || '00:00'}`
        ).getTime();

        return dateA - dateB;
      }
    );
  }

  getActiveMeetings(): Meeting[] {

    return this.meetings.filter(
      meeting =>
        meeting.status !== 'Cancelled' &&
        !this.isMeetingPast(meeting)
    );
  }

  isMeetingPast(meeting: Meeting): boolean {

    if (!meeting.meetingDate) {
      return false;
    }

    const time =
      meeting.meetingTime || '00:00';

    const meetingDateTime =
      new Date(`${meeting.meetingDate}T${time}`);

    return meetingDateTime < new Date();
  }

  // =========================
  // CREATE / SAVE MEETING
  // =========================

  saveMeeting(): void {

    if (!this.newMeeting.title.trim()) {
      return;
    }

    if (!this.newMeeting.meetingDate) {
      return;
    }

    if (
      this.schedulingType === 'fixed' &&
      !this.newMeeting.meetingTime
    ) {
      return;
    }

    // RESCHEDULE

    if (this.reschedulingMeeting) {

      const updatedMeeting = {

        id: this.reschedulingMeeting.id,

        title:
          this.newMeeting.title.trim(),

        meetingDate:
          this.newMeeting.meetingDate,

        meetingTime:
          this.schedulingType === 'fixed'
            ? this.newMeeting.meetingTime
            : '',

        priority:
          this.newMeeting.priority,

        status:
          'Rescheduled'
      };

      this.meetingService
        .updateMeeting(
          this.reschedulingMeeting.id,
          updatedMeeting
        )
        .subscribe({

          next: (updated: any) => {

            const index =
              this.meetings.findIndex(
                m => m.id === this.reschedulingMeeting!.id
              );

            if (index !== -1) {
              this.meetings[index] = updated;
            }

            this.addNotification(
              `Meeting "${updated.title}" was rescheduled.`,
              updated.id,
              'Meeting'
            );

            this.resetMeetingForm();

            this.reschedulingMeeting = null;
            this.activeView = 'meetings';
          },

          error: (err) => {
            console.error(
              'Error rescheduling meeting:',
              err
            );

            alert('Unable to reschedule meeting.');
          }

        });

      return;
    }

    // CREATE NEW MEETING

    const meeting = {

      title:
        this.newMeeting.title.trim(),

      meetingDate:
        this.newMeeting.meetingDate,

      meetingTime:
        this.schedulingType === 'fixed'
          ? this.newMeeting.meetingTime
          : '',

      priority:
        this.newMeeting.priority,

      status:
        'Upcoming'
    };

    this.meetingService
      .addMeeting(meeting)
      .subscribe({

        next: (createdMeeting: any) => {

          this.meetings.push(createdMeeting);

          this.addNotification(
            `New meeting "${createdMeeting.title}" was created.`,
            createdMeeting.id,
            'Meeting'
          );

          this.resetMeetingForm();

          this.activeView = 'meetings';
        },

        error: (err) => {

          console.error(
            'Error creating meeting:',
            err
          );

          alert('Unable to create meeting.');
        }

      });
  }

  resetMeetingForm(): void {

    this.newMeeting = {
      title: '',
      meetingDate: '',
      meetingTime: '',
      priority: 'Medium'
    };

    this.schedulingType = 'fixed';
  }

  onSchedulingTypeChange(): void {

    if (this.schedulingType === 'availability') {
      this.newMeeting.meetingTime = '';
    }
  }

  // =========================
  // RESCHEDULE
  // =========================

  rescheduleMeeting(meeting: Meeting): void {

    if (
      meeting.status === 'Cancelled' ||
      this.isMeetingPast(meeting)
    ) {
      return;
    }

    this.reschedulingMeeting = meeting;

    this.newMeeting = {

      title: meeting.title,

      meetingDate: meeting.meetingDate,

      meetingTime: meeting.meetingTime,

      priority: meeting.priority
    };

    this.schedulingType =
      meeting.meetingTime
        ? 'fixed'
        : 'availability';

    this.activeView = 'create';
  }

  // =========================
  // CANCEL MEETING
  // =========================

  cancelMeeting(meeting: Meeting): void {

    if (
      meeting.status === 'Cancelled' ||
      this.isMeetingPast(meeting)
    ) {
      return;
    }

    const confirmed =
      confirm(`Cancel "${meeting.title}"?`);

    if (!confirmed) {
      return;
    }

    const updatedMeeting = {

      ...meeting,

      status: 'Cancelled'
    };

    this.meetingService
      .updateMeeting(
        meeting.id,
        updatedMeeting
      )
      .subscribe({

        next: (updated: any) => {

          const index =
            this.meetings.findIndex(
              m => m.id === meeting.id
            );

          if (index !== -1) {
            this.meetings[index] = updated;
          }

          this.addNotification(
            `Meeting "${meeting.title}" was cancelled.`,
            meeting.id,
            'Meeting'
          );
        },

        error: (err) => {

          console.error(
            'Error cancelling meeting:',
            err
          );

          alert('Unable to cancel meeting.');
        }

      });
  }

  // =========================
  // COPY INVITE LINK
  // =========================

  copyLink(meetingId: number): void {

    const link =
      `${window.location.origin}/submit-availability/${meetingId}`;

    navigator.clipboard
      .writeText(link)
      .then(() => {

        this.addNotification(
          'Invite link copied to clipboard.',
          meetingId,
          'Invite'
        );

        alert('Invite link copied!');
      })
      .catch(() => {
        alert('Unable to copy the invite link.');
      });
  }

  // =========================
  // PARTICIPANTS
  // =========================

  onParticipantMeetingChange(): void {

    this.selectedUserIds.clear();

    this.bulkIsMandatory = false;
  }

  toggleUserSelection(userId: number): void {

    if (
      this.isUserAlreadyParticipant(userId)
    ) {
      return;
    }

    if (this.selectedUserIds.has(userId)) {

      this.selectedUserIds.delete(userId);

    } else {

      this.selectedUserIds.add(userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUserIds.has(userId);
  }

  isUserAlreadyParticipant(userId: number): boolean {

    if (!this.participantMeetingId) {
      return false;
    }

    return this.participants.some(
      participant =>
        participant.meetingId ===
          this.participantMeetingId &&
        participant.userId === userId
    );
  }

  // =========================
  // SAVE PARTICIPANTS
  // =========================

  addSelectedParticipants(): void {

    if (
      !this.participantMeetingId ||
      this.selectedUserIds.size === 0
    ) {
      return;
    }

    const selectedUsers =
      Array.from(this.selectedUserIds);

    let completed = 0;

    selectedUsers.forEach(userId => {

      const participant = {

        meetingId:
          this.participantMeetingId!,

        userId,

        isMandatory:
          this.bulkIsMandatory
      };

      this.participantService
        .addParticipant(participant)
        .subscribe({

          next: (created: any) => {

            this.participants.push(created);

            completed++;

            if (
              completed === selectedUsers.length
            ) {

              this.addNotification(
                `${selectedUsers.length} participant(s) added to the meeting.`,
                this.participantMeetingId,
                'Participant'
              );

              this.selectedUserIds.clear();

              this.bulkIsMandatory = false;
            }
          },

          error: (err) => {
            console.error(
              'Error adding participant:',
              err
            );
          }

        });
    });
  }

  // =========================
  // AVAILABILITY
  // =========================

  onAvailabilityMeetingChange(): void {

    if (!this.availabilityMeetingId) {
      return;
    }

    this.availabilityService
      .getAvailabilitiesByMeeting(
        this.availabilityMeetingId
      )
      .subscribe({

        next: (data: any) => {

          this.availability =
            this.availability.filter(
              item =>
                item.meetingId !==
                this.availabilityMeetingId
            );

          this.availability.push(
            ...(data || [])
          );
        },

        error: (err) => {
          console.error(
            'Error loading meeting availability:',
            err
          );
        }

      });
  }

  getParticipantsForAvailability(): Participant[] {

    if (!this.availabilityMeetingId) {
      return [];
    }

    return this.participants.filter(
      participant =>
        participant.meetingId ===
        this.availabilityMeetingId
    );
  }

  getAvailabilityForSelectedMeeting(): Availability[] {

    if (!this.availabilityMeetingId) {
      return [];
    }

    return this.availability.filter(
      item =>
        item.meetingId ===
        this.availabilityMeetingId
    );
  }

  hasSubmittedAvailability(userId: number): boolean {

    if (!this.availabilityMeetingId) {
      return false;
    }

    return this.availability.some(
      item =>
        item.meetingId ===
          this.availabilityMeetingId &&
        item.userId === userId
    );
  }

  // =========================
  // USERS
  // =========================

  getUserName(userId: number): string {

    const user =
      this.users.find(
        u => u.id === userId
      );

    return user
      ? user.name
      : 'Unknown User';
  }

  getInitials(name: string): string {

    if (!name) {
      return 'U';
    }

    return name
      .split(' ')
      .map(
        part => part.charAt(0)
      )
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  // =========================
  // FIND BEST SLOT
  // =========================

  findBestSlot(): void {

    const meetingId =
      this.suggestRequest.meetingId;

    if (!meetingId) {
      return;
    }

    this.availabilityService
      .getAvailabilitiesByMeeting(meetingId)
      .subscribe({

        next: (data: any) => {

          const meetingAvailability =
            data || [];

          if (!meetingAvailability.length) {

            this.suggestResult = {

              success: false,

              message:
                'No participant availability has been submitted yet.'
            };

            return;
          }

          let latestStart =
            meetingAvailability[0].startTime;

          let earliestEnd =
            meetingAvailability[0].endTime;

          meetingAvailability.forEach(
            (item: any) => {

              if (
                item.startTime > latestStart
              ) {
                latestStart = item.startTime;
              }

              if (
                item.endTime < earliestEnd
              ) {
                earliestEnd = item.endTime;
              }

            }
          );

          if (
            latestStart >= earliestEnd
          ) {

            this.suggestResult = {

              success: false,

              message:
                'No common available time was found.'
            };

            return;
          }

          this.suggestResult = {

            success: true,

            startTime: latestStart,

            endTime: earliestEnd
          };
        },

        error: (err) => {

          console.error(
            'Error finding best slot:',
            err
          );

          this.suggestResult = {

            success: false,

            message:
              'Unable to load participant availability.'
          };
        }

      });
  }

  // =========================
  // NOTIFICATIONS
  // =========================

  toggleNotifications(): void {
    this.notificationsOpen =
      !this.notificationsOpen;
  }

  get unreadNotificationCount(): number {

    return this.notifications.filter(
      notification =>
        !notification.isRead
    ).length;
  }

  markAllNotificationsRead(): void {

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
            notification => {
              notification.isRead = true;
            }
          );
        },

        error: (err) => {

          console.error(
            'Error marking notifications as read:',
            err
          );
        }

      });
  }

  addNotification(
    message: string,
    meetingId: number | null = null,
    type: string = 'General'
  ): void {

    if (!this.currentUser) {
      return;
    }

    const notification = {

      userId:
        this.currentUser.id,

      meetingId,

      title:
        'SyncUp',

      message,

      type,

      isRead:
        false
    };

    this.notificationService
      .addNotification(notification)
      .subscribe({

        next: (created: any) => {

          this.notifications.unshift(
            created
          );
        },

        error: (err) => {

          console.error(
            'Error saving notification:',
            err
          );
        }

      });
  }

  // =========================
  // LOGOUT
  // =========================

  openLogoutConfirmation(): void {
    this.showLogoutConfirmation = true;
  }

  closeLogoutConfirmation(): void {
    this.showLogoutConfirmation = false;
  }

  confirmLogout(): void {

    this.showLogoutConfirmation = false;

    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);
  }
}