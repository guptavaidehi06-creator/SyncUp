import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { UserService } from '../services/user';
import { MeetingService } from '../services/meeting';
import { AvailabilityService } from '../services/availability';
import { ParticipantService } from '../services/participant';
import { SchedulingService } from '../services/scheduling';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  /* ================= ACTIVE VIEW ================= */

  activeView:
    | 'home'
    | 'meetings'
    | 'create'
    | 'participants'
    | 'availability'
    | 'slot' = 'home';


  /* ================= UI ================= */

  sidebarOpen = true;

  notificationsOpen = false;

  showLogoutConfirmation = false;


  /* ================= CREATE FLOW ================= */

  createStep = 1;

  schedulingType: 'fixed' | 'availability' = 'fixed';

  createdMeetingId: number | null = null;


  /* ================= DATA ================= */

  users: any[] = [];

  meetings: any[] = [];

  availabilities: any[] = [];

  participants: any[] = [];

  notifications: Array<{ message: string; read: boolean }> = [];

  reschedulingMeeting: any = null;


  /* ================= NEW MEETING ================= */

  newMeeting = {
    title: '',
    meetingDate: '',
    meetingTime: '',
    priority: 'Medium',
    status: 'Scheduled',
    creatorId: null as number | null
  };


  /* ================= PARTICIPANTS ================= */

  participantMeetingId: number | null = null;

  selectedUserIds: Set<number> = new Set();

  bulkIsMandatory = true;


  /* ================= AVAILABILITY ================= */

  availabilityMeetingId: number | null = null;


  /* ================= BEST SLOT ================= */

  suggestRequest = {
    meetingId: null as number | null
  };

  suggestResult: any = null;


  constructor(
    private userService: UserService,
    private meetingService: MeetingService,
    private availabilityService: AvailabilityService,
    private participantService: ParticipantService,
    private schedulingService: SchedulingService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }


  /* ================= INIT ================= */

  ngOnInit(): void {

    this.loadUsers();

    this.loadMeetings();

    this.loadAvailabilities();

    this.loadParticipants();

  }


  /* ================= SIDEBAR ================= */

  toggleSidebar(): void {

    this.sidebarOpen = !this.sidebarOpen;

  }


  setView(
    view:
      | 'home'
      | 'meetings'
      | 'create'
      | 'participants'
      | 'availability'
      | 'slot'
  ): void {

    this.activeView = view;

    this.notificationsOpen = false;

    if (view === 'create') {

      this.createStep = 1;

      this.reschedulingMeeting = null;

      this.selectedUserIds.clear();

    }

    if (view === 'availability') {

      this.availabilityMeetingId = null;

    }

    if (view === 'slot') {

      this.suggestResult = null;

    }

  }


  /* ================= PAGE TITLE ================= */

  getPageTitle(): string {

    switch (this.activeView) {

      case 'home':

        const name = this.getCurrentUserName();

        return name
          ? `Welcome, ${name}`
          : 'Welcome';

      case 'meetings':
        return 'My Meetings';

      case 'create':
        return 'Create Meeting';

      case 'participants':
        return 'Participants';

      case 'availability':
        return 'Availability';

      case 'slot':
        return 'Find Best Slot';

      default:
        return 'SyncUp';

    }

  }


  getPageSubtitle(): string {

    switch (this.activeView) {

      case 'home':
        return 'An overview of your upcoming meetings and workspace activity.';

      case 'meetings':
        return 'View and manage meetings in your workspace.';

      case 'create':
        return 'Create a meeting and add participants.';

      case 'participants':
        return 'Manage people participating in your meetings.';

      case 'availability':
        return 'Check which participants have submitted their availability.';

      case 'slot':
        return 'Find a suitable time based on participant availability.';

      default:
        return '';

    }

  }


  /* ================= NOTIFICATIONS ================= */

  toggleNotifications(): void {

    this.notificationsOpen = !this.notificationsOpen;

  }


  get unreadNotificationCount(): number {

    return this.notifications.filter(notification => !notification.read).length;

  }


  addNotification(message: string): void {

    this.notifications.unshift({ message, read: false });

  }


  markAllNotificationsRead(): void {

    this.notifications.forEach(notification => notification.read = true);

  }


  /* ================= LOAD USERS ================= */

  loadUsers(): void {

    this.userService
      .getAllUsers()
      .subscribe({

        next: (data: any) => {

          this.users = data;

          this.cdr.detectChanges();

        },

        error: (err) => {

          console.error(
            'Error fetching users:',
            err
          );

        }

      });

  }


  /* ================= LOAD MEETINGS ================= */

  loadMeetings(): void {

    this.meetingService
      .getAllMeetings()
      .subscribe({

        next: (data: any) => {

          this.meetings = data;

          this.cdr.detectChanges();

        },

        error: (err) => {

          console.error(
            'Error fetching meetings:',
            err
          );

        }

      });

  }


  /* ================= LOAD AVAILABILITY ================= */

  loadAvailabilities(): void {

    this.availabilityService
      .getAllAvailabilities()
      .subscribe({

        next: (data: any) => {

          this.availabilities = data;

          this.cdr.detectChanges();

        },

        error: (err) => {

          console.error(
            'Error fetching availabilities:',
            err
          );

        }

      });

  }


  /* ================= LOAD PARTICIPANTS ================= */

  loadParticipants(): void {

    this.participantService
      .getAllParticipants()
      .subscribe({

        next: (data: any) => {

          this.participants = data;

          this.cdr.detectChanges();

        },

        error: (err) => {

          console.error(
            'Error fetching participants:',
            err
          );

        }

      });

  }


  /* =====================================================
     AVAILABILITY
  ===================================================== */


  /* Meeting change hone par */

  onAvailabilityMeetingChange(): void {

    this.cdr.detectChanges();

  }


  /* Selected meeting ke participants */

  getParticipantsForAvailability(): any[] {

    if (!this.availabilityMeetingId) {

      return [];

    }

    return this.participants.filter(
      participant =>
        participant.meetingId ===
        this.availabilityMeetingId
    );

  }


  /* Selected meeting ki submitted availability */

  getAvailabilityForSelectedMeeting(): any[] {

    if (!this.availabilityMeetingId) {

      return [];

    }

    return this.availabilities.filter(
      availability =>
        availability.meetingId ===
        this.availabilityMeetingId
    );

  }


  /* User ne availability submit ki hai ya nahi */

  hasSubmittedAvailability(userId: number): boolean {

    return this
      .getAvailabilityForSelectedMeeting()
      .some(
        availability =>
          availability.userId === userId
      );

  }


  /* ================= MEETING STATUS ================= */

  isMeetingUpcoming(meeting: any): boolean {

    if (!meeting.meetingDate) {

      return true;

    }

    if (meeting.status === 'Cancelled') {

      return false;

    }

    const meetingDateTime =
      new Date(meeting.meetingDate);

    if (meeting.meetingTime) {

      const time =
        meeting.meetingTime
          .split(':');

      const hours =
        Number(time[0]);

      const minutes =
        Number(time[1]);

      meetingDateTime.setHours(
        hours,
        minutes,
        0,
        0
      );

    }

    return meetingDateTime >= new Date();

  }


  getUpcomingMeetings(): any[] {

    return this.meetings.filter(
      meeting =>
        this.isMeetingUpcoming(meeting)
    );

  }


  getCompletedMeetings(): any[] {

    return this.meetings.filter(
      meeting =>
        !this.isMeetingUpcoming(meeting) &&
        meeting.status !== 'Cancelled'
    );

  }


  /* =====================================================
     CREATE MEETING
  ===================================================== */


  onSchedulingTypeChange(): void {

    if (
      this.schedulingType === 'availability'
    ) {

      this.newMeeting.meetingTime = '';

    }

  }


  saveMeeting(): void {

    if (this.reschedulingMeeting) {

      this.updateRescheduledMeeting();

      return;

    }

    this.createMeeting();

  }


  createMeeting(): void {

    const title =
      this.newMeeting.title;

    this.meetingService
      .addMeeting(this.newMeeting)
      .subscribe({

        next: (meeting: any) => {

          this.addNotification(
            `Meeting "${title}" was created successfully.`
          );

          this.finishCreateFlow();

        },

        error: (err) => {

          console.error(
            'Error creating meeting:',
            err
          );

        }

      });

  }


  saveParticipantsAndContinue(): void {

    if (!this.participantMeetingId) {

      return;

    }

    const requests =
      Array
        .from(this.selectedUserIds)
        .map(userId => {

          const payload = {

            meetingId:
              this.participantMeetingId,

            userId: userId,

            isMandatory:
              this.bulkIsMandatory

          };

          return this.participantService
            .addParticipant(payload)
            .toPromise();

        });


    Promise.all(requests)

      .then(() => {

        this.addNotification(
          `${this.selectedUserIds.size} participant(s) were added to the meeting.`
        );

        this.selectedUserIds.clear();

        this.loadParticipants();


        if (
          this.schedulingType === 'fixed'
        ) {

          this.finishCreateFlow();

        }

        else {

          this.createStep = 3;

        }

        this.cdr.detectChanges();

      })

      .catch(err => {

        console.error(
          'Error adding participants:',
          err
        );

      });

  }


  finishAvailabilityMeeting(): void {

    this.addNotification(
      'Meeting is ready. Participants can now submit their availability.'
    );

    this.finishCreateFlow();

  }


  finishCreateFlow(): void {

    this.newMeeting = {

      title: '',
      meetingDate: '',
      meetingTime: '',
      priority: 'Medium',
      status: 'Scheduled',
      creatorId: null

    };

    this.createdMeetingId = null;

    this.reschedulingMeeting = null;

    this.participantMeetingId = null;

    this.selectedUserIds.clear();

    this.createStep = 1;

    this.loadMeetings();

    this.activeView = 'meetings';

  }


  previousCreateStep(): void {

    if (this.createStep > 1) {

      this.createStep--;

    }

  }


  /* =====================================================
     RESCHEDULE MEETING
  ===================================================== */

  rescheduleMeeting(meeting: any): void {

    this.reschedulingMeeting = meeting;

    this.schedulingType = meeting.meetingTime ? 'fixed' : 'availability';

    this.newMeeting = {
      title: meeting.title || '',
      meetingDate: meeting.meetingDate || '',
      meetingTime: meeting.meetingTime || '',
      priority: meeting.priority || 'Medium',
      status: 'Scheduled',
      creatorId: meeting.creatorId ?? meeting.createdById ?? null
    };

    this.activeView = 'create';

  }


  updateRescheduledMeeting(): void {

    const meeting = this.reschedulingMeeting;

    if (!meeting) {

      return;

    }

    const updatedMeeting = {
      ...meeting,
      ...this.newMeeting,
      status: 'Scheduled'
    };

    this.meetingService
      .updateMeeting(
        meeting.id,
        updatedMeeting
      )
      .subscribe({

        next: () => {

          this.addNotification(
            `Meeting "${meeting.title}" was rescheduled.`
          );

          this.reschedulingMeeting = null;

          this.finishCreateFlow();

        },

        error: (err) => {

          console.error(
            'Error rescheduling meeting:',
            err
          );

        }

      });

  }


  /* ================= CANCEL MEETING ================= */

  cancelMeeting(meeting: any): void {

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

        next: () => {

          this.addNotification(
            `Meeting "${meeting.title}" was cancelled.`
          );

          this.loadMeetings();

        },

        error: (err) => {

          console.error(
            'Error cancelling meeting:',
            err
          );

        }

      });

  }


  /* =====================================================
     PARTICIPANTS
  ===================================================== */


  toggleUserSelection(userId: number): void {

    if (this.isUserAlreadyParticipant(userId)) {

      return;

    }

    if (
      this.selectedUserIds.has(userId)
    ) {

      this.selectedUserIds.delete(userId);

    }

    else {

      this.selectedUserIds.add(userId);

    }

  }


  isUserSelected(userId: number): boolean {

    return this.selectedUserIds.has(userId);

  }


  onParticipantMeetingChange(): void {

    this.selectedUserIds.clear();

  }


  isUserAlreadyParticipant(userId: number): boolean {

    if (!this.participantMeetingId) {

      return false;

    }

    return this.participants.some(
      participant =>
        participant.meetingId === this.participantMeetingId &&
        participant.userId === userId
    );

  }


  addSelectedParticipants(): void {

    if (
      !this.participantMeetingId ||
      this.selectedUserIds.size === 0
    ) {

      return;

    }


    const requests =
      Array
        .from(this.selectedUserIds)
        .map(userId => {

          const payload = {

            meetingId:
              this.participantMeetingId,

            userId: userId,

            isMandatory:
              this.bulkIsMandatory

          };

          return this.participantService
            .addParticipant(payload)
            .toPromise();

        });


    Promise.all(requests)

      .then(() => {

        this.addNotification(
          `${this.selectedUserIds.size} participant(s) were added.`
        );

        this.selectedUserIds.clear();

        this.loadParticipants();

        this.cdr.detectChanges();

      })

      .catch(err => {

        console.error(
          'Error adding participants:',
          err
        );

      });

  }


  /* =====================================================
     FIND BEST SLOT
  ===================================================== */

  findBestSlot(): void {

    this.suggestResult = null;

    this.schedulingService
      .suggestSlot(
        this.suggestRequest
      )
      .subscribe({

        next: (data: any) => {

          this.suggestResult = data;

          this.cdr.detectChanges();

        },

        error: (err) => {

          console.error(
            'Error suggesting slot:',
            err
          );

          this.suggestResult = {

            success: false,

            message:
              'Unable to find a suitable time. Please try again after participants submit their availability.'

          };

          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     HELPERS
  ===================================================== */


  getUserName(userId: number): string {

    const user =
      this.users.find(
        u =>
          u.id === userId
      );

    return user
      ? user.name
      : 'Unknown user';

  }


  getInitials(name: string): string {

    if (!name) {

      return 'U';

    }

    const parts =
      name
        .trim()
        .split(' ');

    if (parts.length === 1) {

      return parts[0]
        .charAt(0)
        .toUpperCase();

    }

    return (
      parts[0]
        .charAt(0) +

      parts[
        parts.length - 1
      ]
        .charAt(0)

    ).toUpperCase();

  }


  /* ================= INVITE LINK ================= */

  getInviteLink(
    meetingId: number
  ): string {

    return `${window.location.origin}/submit-availability/${meetingId}`;

  }


  copyLink(
    meetingId: number
  ): void {

    const link =
      this.getInviteLink(
        meetingId
      );

    navigator.clipboard
      .writeText(link);

    this.addNotification(
      'Meeting invite link was copied to your clipboard.'
    );

  }


  /* =====================================================
     LOGOUT
  ===================================================== */


  openLogoutConfirmation(): void {

    this.showLogoutConfirmation = true;

  }


  closeLogoutConfirmation(): void {

    this.showLogoutConfirmation = false;

  }


  confirmLogout(): void {

    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);

  }


  /* ================= CURRENT USER ================= */

  getCurrentUserName(): string {

    const user =
      this.authService.getUser();

    return user
      ? user.name
      : '';

  }

}
