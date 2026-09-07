import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth';
import {
  MeetingService,
  Meeting,
  CreateMeetingRequest
} from '../services/meeting';
import { ParticipantService } from '../services/participant';
import { AvailabilityService } from '../services/availability';
import { NotificationService } from '../services/notification';
import { UserService } from '../services/user';

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
  userId: number;
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

  reschedulingMeeting: Meeting | null = null;

  suggestRequest = {
    meetingId: null as number | null
  };

  suggestResult: any = null;

  newMeeting = {
    title: '',
    meetingDate: '',
    priority: 'Medium'
  };

  isSavingMeeting = false;

  createdMeetingTitle: string | null = null;

  private meetingSuccessTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private meetingService: MeetingService,
    private participantService: ParticipantService,
    private availabilityService: AvailabilityService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  // =========================
  // INITIAL LOAD
  // =========================

  ngOnInit(): void {

    this.currentUser = this.authService.getUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    console.log(
      'Current logged in user:',
      this.currentUser
    );

    this.loadUsers();
    this.loadMeetings();
    this.loadParticipants();
    this.loadAvailabilities();
    this.loadNotifications();
  }

  // =========================
  // LOAD USERS
  // =========================

  loadUsers(): void {

    this.userService
      .getAllUsers()
      .subscribe({

        next: (data: any) => {
          this.users = data || [];
        },

        error: (err) => {
          console.error(
            'Error loading users:',
            err
          );
        }

      });
  }

  // =========================
  // LOAD MEETINGS
  // =========================

  loadMeetings(): void {

    this.meetingService
      .getMeetings()
      .subscribe({

        next: (data: Meeting[]) => {
          this.meetings = data || [];
        },

        error: (err) => {
          console.error(
            'Error loading meetings:',
            err
          );
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
          console.error(
            'Error loading participants:',
            err
          );
        }

      });
  }

  // =========================
  // LOAD AVAILABILITIES
  // =========================

  loadAvailabilities(): void {

    this.availabilityService
      .getAllAvailabilities()
      .subscribe({

        next: (data: any) => {
          this.availability = data || [];
        },

        error: (err) => {
          console.error(
            'Error loading availabilities:',
            err
          );
        }

      });
  }

  // =========================
  // LOAD CURRENT USER NOTIFICATIONS
  // =========================

  loadNotifications(): void {

    if (!this.currentUser) {
      return;
    }

    const userId =
      Number(this.currentUser.id);

    if (!userId || userId <= 0) {
      return;
    }

    this.notificationService
      .getNotificationsByUser(userId)
      .subscribe({

        next: (data: any) => {

          this.notifications =
            data || [];

        },

        error: (err) => {

          console.error(
            'Error loading notifications:',
            err
          );

        }

      });
  }

  // =========================
  // SIDEBAR
  // =========================

  toggleSidebar(): void {

    this.sidebarOpen =
      !this.sidebarOpen;
  }

  setView(view: View): void {

    this.activeView = view;

    this.notificationsOpen = false;

    if (view !== 'create') {
      this.reschedulingMeeting = null;
    }

    if (view === 'home') {

      this.loadMeetings();
      this.loadParticipants();
      this.loadNotifications();

    }

    if (view === 'meetings') {

      this.loadMeetings();

    }

    if (view === 'participants') {

      this.selectedUserIds.clear();

      this.loadUsers();
      this.loadMeetings();
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

  getCurrentUserId(): number {

    return Number(this.currentUser?.id || 0);
  }

  // =========================
  // DATE
  // =========================

  getTodayDate(): string {

    const today = new Date();

    const year =
      today.getFullYear();

    const month =
      String(today.getMonth() + 1)
        .padStart(2, '0');

    const day =
      String(today.getDate())
        .padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // =========================
  // MEETINGS
  // =========================

  getUpcomingMeetings(): Meeting[] {

    return this.meetings
      .filter(meeting => !this.isMeetingPast(meeting))
      .sort((a, b) =>
        this.getMeetingTimestamp(a) -
        this.getMeetingTimestamp(b)
      );
  }

  getCompletedMeetings(): Meeting[] {

    return this.getPastMeetings();
  }

  getPastMeetings(): Meeting[] {

    return this.meetings
      .filter(meeting => this.isMeetingPast(meeting))
      .sort((a, b) =>
        this.getMeetingTimestamp(b) -
        this.getMeetingTimestamp(a)
      );
  }

  getActiveMeetings(): Meeting[] {

    return this.getUpcomingMeetings();
  }

  isMeetingPast(meeting: Meeting): boolean {

    const status = meeting.status?.toLowerCase();

    if (status === 'cancelled' || status === 'completed') {
      return true;
    }

    if (!meeting.meetingDate) {
      return false;
    }

    return this.getMeetingDateTime(meeting) < new Date();
  }

  getMeetingHistoryStatus(meeting: Meeting): string {

    const status = meeting.status?.toLowerCase();

    if (status === 'cancelled') {
      return 'Cancelled';
    }

    if (status === 'completed') {
      return 'Completed';
    }

    return 'Past';
  }

  private getMeetingDateTime(meeting: Meeting): Date {

    return new Date(
      `${meeting.meetingDate}T${meeting.meetingTime || '00:00'}`
    );
  }

  private getMeetingTimestamp(meeting: Meeting): number {

    if (!meeting.meetingDate) {
      return Number.MAX_SAFE_INTEGER;
    }

    return this.getMeetingDateTime(meeting).getTime();
  }

  // =========================
  // CREATE / UPDATE MEETING
  // =========================

  saveMeeting(): void {

    if (this.isSavingMeeting) {
      return;
    }

    if (!this.currentUser) {

      alert('User not logged in.');

      return;
    }

    if (!this.newMeeting.title.trim()) {

      alert('Please enter meeting title.');

      return;
    }

    if (!this.newMeeting.meetingDate) {

      alert('Please select a date.');

      return;
    }

    this.isSavingMeeting = true;

    // =========================
    // RESCHEDULE MEETING
    // =========================

    if (this.reschedulingMeeting) {

      const meetingId =
        this.reschedulingMeeting.id!;

      const updatedMeeting: Meeting = {

        id: meetingId,

        title:
          this.newMeeting.title.trim(),

        meetingDate:
          this.newMeeting.meetingDate,

        meetingTime: null,

        priority:
          this.newMeeting.priority,

        status:
          'Rescheduled',

        createdBy:
          this.reschedulingMeeting.createdBy
      };

      this.meetingService
        .updateMeeting(
          meetingId,
          updatedMeeting
        )
        .subscribe({

          next: (updated: Meeting) => {

            const index =
              this.meetings.findIndex(
                m => m.id === meetingId
              );

            if (index !== -1) {

              this.meetings[index] =
                updated;
            }

            this.resetMeetingForm();

            this.reschedulingMeeting = null;

            this.activeView = 'meetings';

            this.isSavingMeeting = false;

            this.loadNotifications();
          },

          error: (err) => {

            console.error(
              'Error rescheduling meeting:',
              err
            );

            this.isSavingMeeting = false;

            alert(
              'Unable to reschedule meeting.'
            );
          }

        });

      return;
    }

    // =========================
    // CREATE NEW MEETING
    // =========================

    const meeting: CreateMeetingRequest = {

      title:
        this.newMeeting.title.trim(),

      meetingDate:
        this.newMeeting.meetingDate,

      priority:
        this.newMeeting.priority
    };

    this.meetingService
      .addMeeting(meeting)
      .subscribe({

        next: (createdMeeting: Meeting) => {

          this.showMeetingCreatedSuccess(
            createdMeeting.title || meeting.title
          );

          const alreadyExists =
            this.meetings.some(
              m =>
                m.id ===
                createdMeeting.id
            );

          if (!alreadyExists) {

            this.meetings.push(
              createdMeeting
            );
          }

          this.isSavingMeeting = false;

          this.resetMeetingForm();

          this.activeView = 'meetings';

          this.loadMeetings();
          this.loadNotifications();
        },

        error: (err) => {

          console.error(
            'Error creating meeting:',
            err
          );

          this.isSavingMeeting = false;

          alert(this.getMeetingSaveError(err));
        }

      });
  }

  // =========================
  // RESET MEETING FORM
  // =========================

  resetMeetingForm(): void {

    this.newMeeting = {

      title: '',
      meetingDate: '',
      priority: 'Medium'

    };

  }

  // =========================
  // RESCHEDULE
  // =========================

  rescheduleMeeting(
    meeting: Meeting
  ): void {

    if (
      meeting.status === 'Cancelled' ||
      this.isMeetingPast(meeting)
    ) {
      return;
    }

    this.reschedulingMeeting =
      meeting;

    this.newMeeting = {

      title:
        meeting.title,

      meetingDate:
        meeting.meetingDate,

      priority:
        meeting.priority
    };

    this.activeView = 'create';
  }

  private getMeetingSaveError(err: any): string {

    if (err?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    if (err?.status === 403) {
      return 'You do not have permission to create meetings.';
    }

    const message =
      typeof err?.error === 'string'
        ? err.error
        : err?.error?.message;

    return message || 'Unable to create meeting. Please try again.';
  }

  private showMeetingCreatedSuccess(title: string): void {

    this.createdMeetingTitle = title;

    if (this.meetingSuccessTimer) {
      clearTimeout(this.meetingSuccessTimer);
    }

    this.meetingSuccessTimer = setTimeout(() => {
      this.createdMeetingTitle = null;
    }, 3500);
  }

  // =========================
  // CANCEL MEETING
  // =========================

  cancelMeeting(
    meeting: Meeting
  ): void {

    if (
      meeting.status === 'Cancelled' ||
      this.isMeetingPast(meeting)
    ) {
      return;
    }

    const confirmed =
      confirm(
        `Cancel "${meeting.title}"?`
      );

    if (!confirmed) {
      return;
    }

    const updatedMeeting: Meeting = {

      ...meeting,

      status:
        'Cancelled',

      createdBy:
        meeting.createdBy
    };

    this.meetingService
      .updateMeeting(
        meeting.id!,
        updatedMeeting
      )
      .subscribe({

        next: (updated: Meeting) => {

          const index =
            this.meetings.findIndex(
              m => m.id === meeting.id
            );

          if (index !== -1) {

            this.meetings[index] =
              updated;
          }

          this.loadNotifications();
        },

        error: (err) => {

          console.error(
            'Error cancelling meeting:',
            err
          );

          alert(
            'Unable to cancel meeting.'
          );
        }

      });
  }

  // =========================
  // COPY INVITE LINK
  // =========================

  copyLink(
    meetingId: number
  ): void {

    const link =
      `${window.location.origin}/submit-availability/${meetingId}`;

    navigator.clipboard
      .writeText(link)
      .then(() => {

        alert(
          'Invite link copied!'
        );
      })
      .catch(() => {

        alert(
          'Unable to copy the invite link.'
        );
      });
  }

  // =========================
  // PARTICIPANTS
  // =========================

  onParticipantMeetingChange(): void {

    this.selectedUserIds.clear();

    this.bulkIsMandatory = false;
  }

  toggleUserSelection(
    userId: number
  ): void {

    if (
      this.isUserAlreadyParticipant(userId)
    ) {
      return;
    }

    if (
      this.selectedUserIds.has(userId)
    ) {

      this.selectedUserIds.delete(userId);

    } else {

      this.selectedUserIds.add(userId);
    }
  }

  isUserSelected(
    userId: number
  ): boolean {

    return this.selectedUserIds.has(userId);
  }

  isUserAlreadyParticipant(
    userId: number
  ): boolean {

    if (
      this.participantMeetingId === null
    ) {
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
  // ADD PARTICIPANTS
  // =========================

  addSelectedParticipants(): void {

    if (
      this.participantMeetingId === null ||
      this.selectedUserIds.size === 0
    ) {
      return;
    }

    const meetingId =
      this.participantMeetingId;

    const selectedUsers =
      Array.from(
        this.selectedUserIds
      );

    let completed = 0;

    selectedUsers.forEach(
      userId => {

        const participant: Participant = {

          meetingId:
            meetingId,

          userId:
            userId,

          isMandatory:
            this.bulkIsMandatory
        };

        this.participantService
          .addParticipant(participant)
          .subscribe({

            next: (
              created: Participant
            ) => {

              this.participants.push(
                created
              );

              completed++;

              if (
                completed ===
                selectedUsers.length
              ) {

                this.selectedUserIds.clear();

                this.bulkIsMandatory = false;

                this.loadParticipants();
                this.loadNotifications();

                alert(
                  'Participants added successfully!'
                );
              }
            },

            error: (err) => {

              console.error(
                'Error adding participant:',
                err
              );

              alert(
                'Error adding participant.'
              );
            }

          });
      }
    );
  }

  // =========================
  // AVAILABILITY
  // =========================

  onAvailabilityMeetingChange(): void {

    if (
      this.availabilityMeetingId === null
    ) {
      return;
    }

    const meetingId =
      this.availabilityMeetingId;

    this.availabilityService
      .getAvailabilitiesByMeeting(
        meetingId
      )
      .subscribe({

        next: (data: any) => {

          this.availability =
            this.availability.filter(
              item =>
                item.meetingId !==
                meetingId
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

  getParticipantsForAvailability():
    Participant[] {

    if (
      this.availabilityMeetingId === null
    ) {
      return [];
    }

    return this.participants.filter(
      participant =>
        participant.meetingId ===
        this.availabilityMeetingId
    );
  }

  getAvailabilityForSelectedMeeting():
    Availability[] {

    if (
      this.availabilityMeetingId === null
    ) {
      return [];
    }

    return this.availability.filter(
      item =>
        item.meetingId ===
        this.availabilityMeetingId
    );
  }

  hasSubmittedAvailability(
    userId: number
  ): boolean {

    if (
      this.availabilityMeetingId === null
    ) {
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

  getUserName(
    userId: number
  ): string {

    const user =
      this.users.find(
        u => u.id === userId
      );

    return user
      ? user.name
      : 'Unknown User';
  }

  getInitials(
    name: string
  ): string {

    if (!name) {
      return 'U';
    }

    return name
      .split(' ')
      .map(
        part =>
          part.charAt(0)
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

    if (
      meetingId === null
    ) {
      return;
    }

    this.availabilityService
      .getAvailabilitiesByMeeting(
        meetingId
      )
      .subscribe({

        next: (data: any) => {

          const meetingAvailability =
            data || [];

          if (
            !meetingAvailability.length
          ) {

            this.suggestResult = {

              success: false,

              message:
                'No participant availability has been submitted yet.'
            };

            return;
          }

          let latestStart =
            meetingAvailability[0]
              .startTime;

          let earliestEnd =
            meetingAvailability[0]
              .endTime;

          meetingAvailability.forEach(
            (item: any) => {

              if (
                item.startTime >
                latestStart
              ) {

                latestStart =
                  item.startTime;
              }

              if (
                item.endTime <
                earliestEnd
              ) {

                earliestEnd =
                  item.endTime;
              }

            }
          );

          if (
            latestStart >=
            earliestEnd
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

            startTime:
              latestStart,

            endTime:
              earliestEnd
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
  // NOTIFICATION UI
  // =========================

  toggleNotifications(): void {

    this.notificationsOpen =
      !this.notificationsOpen;

    if (
      this.notificationsOpen
    ) {

      this.loadNotifications();
    }
  }

  get unreadNotificationCount(): number {

    return this.notifications.filter(
      notification =>
        !notification.isRead
    ).length;
  }

  markAllNotificationsRead(): void {

    const userId =
      this.getCurrentUserId();

    if (
      !userId ||
      userId <= 0
    ) {
      return;
    }

    this.notificationService
      .markAllAsRead(userId)
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

  markNotificationRead(notification: Notification): void {

    if (notification.isRead) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id)
      .subscribe({

        next: () => {
          notification.isRead = true;
        },

        error: (err) => {
          console.error(
            'Error marking notification as read:',
            err
          );
        }

      });
  }

  // =========================
  // LOGOUT
  // =========================

  openLogoutConfirmation(): void {

    this.showLogoutConfirmation =
      true;
  }

  closeLogoutConfirmation(): void {

    this.showLogoutConfirmation =
      false;
  }

  confirmLogout(): void {

    this.showLogoutConfirmation =
      false;

    this.authService.logout();

    this.router.navigate(
      ['/login']
    );
  }
}
