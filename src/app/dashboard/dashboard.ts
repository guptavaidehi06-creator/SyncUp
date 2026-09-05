import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
  message: string;
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  // =========================
  // LOAD SAMPLE DATA
  // =========================

  loadData(): void {

    this.users = [
      {
        id: 1,
        name: 'Vaidehi',
        email: 'vaidehi@example.com'
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

    this.meetings = [];

    this.participants = [];

    this.availability = [];

    this.notifications = [
      {
        id: 1,
        message: 'Welcome to SyncUp!',
        isRead: false
      }
    ];
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
    }

    if (view === 'slot') {
      this.suggestResult = null;
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

    if (this.users.length > 0) {
      return this.users[0].name;
    }

    return 'Workspace';
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

    return this.meetings.filter(meeting => {

      return (
        meeting.status !== 'Cancelled' &&
        !this.isMeetingPast(meeting)
      );
    });
  }

  getCompletedMeetings(): Meeting[] {

    return this.meetings.filter(meeting => {

      return (
        meeting.status !== 'Cancelled' &&
        this.isMeetingPast(meeting)
      );
    });
  }

  getMeetingsForDisplay(): Meeting[] {

    return [...this.meetings].sort((a, b) => {

      const dateA =
        new Date(
          `${a.meetingDate}T${a.meetingTime || '00:00'}`
        ).getTime();

      const dateB =
        new Date(
          `${b.meetingDate}T${b.meetingTime || '00:00'}`
        ).getTime();

      return dateA - dateB;
    });
  }

  getActiveMeetings(): Meeting[] {

    return this.meetings.filter(meeting => {

      return (
        meeting.status !== 'Cancelled' &&
        !this.isMeetingPast(meeting)
      );
    });
  }

  isMeetingPast(meeting: Meeting): boolean {

    if (!meeting.meetingDate) {
      return false;
    }

    const time =
      meeting.meetingTime || '00:00';

    const meetingDateTime =
      new Date(
        `${meeting.meetingDate}T${time}`
      );

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

    // RESCHEDULE EXISTING MEETING

    if (this.reschedulingMeeting) {

      const meeting =
        this.meetings.find(
          m => m.id === this.reschedulingMeeting?.id
        );

      if (meeting) {

        meeting.title =
          this.newMeeting.title;

        meeting.meetingDate =
          this.newMeeting.meetingDate;

        meeting.meetingTime =
          this.schedulingType === 'fixed'
            ? this.newMeeting.meetingTime
            : '';

        meeting.priority =
          this.newMeeting.priority;

        meeting.status =
          'Rescheduled';

        this.addNotification(
          `Meeting "${meeting.title}" was rescheduled.`
        );
      }

      this.resetMeetingForm();

      this.reschedulingMeeting = null;

      this.activeView = 'meetings';

      return;
    }

    // CREATE NEW MEETING

    const newId =
      this.meetings.length
        ? Math.max(
            ...this.meetings.map(m => m.id)
          ) + 1
        : 1;

    const meeting: Meeting = {

      id: newId,

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

      status: 'Upcoming'
    };

    this.meetings.push(meeting);

    this.addNotification(
      `New meeting "${meeting.title}" was created.`
    );

    this.resetMeetingForm();

    this.activeView = 'meetings';
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

      meetingDate:
        meeting.meetingDate,

      meetingTime:
        meeting.meetingTime,

      priority:
        meeting.priority
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
      confirm(
        `Cancel "${meeting.title}"?`
      );

    if (!confirmed) {
      return;
    }

    meeting.status = 'Cancelled';

    this.addNotification(
      `Meeting "${meeting.title}" was cancelled.`
    );
  }

  // =========================
  // COPY INVITE LINK
  // =========================

  copyLink(meetingId: number): void {

    const link =
      `${window.location.origin}/meeting/${meetingId}`;

    navigator.clipboard
      .writeText(link)
      .then(() => {

        this.addNotification(
          'Invite link copied to clipboard.'
        );

        alert('Invite link copied!');
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

  toggleUserSelection(userId: number): void {

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

  isUserSelected(userId: number): boolean {

    return this.selectedUserIds.has(userId);
  }

  isUserAlreadyParticipant(
    userId: number
  ): boolean {

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

  addSelectedParticipants(): void {

    if (!this.participantMeetingId) {
      return;
    }

    this.selectedUserIds.forEach(userId => {

      if (
        !this.isUserAlreadyParticipant(userId)
      ) {

        this.participants.push({

          meetingId:
            this.participantMeetingId!,

          userId,

          isMandatory:
            this.bulkIsMandatory
        });
      }
    });

    const count =
      this.selectedUserIds.size;

    this.selectedUserIds.clear();

    this.bulkIsMandatory = false;

    if (count > 0) {

      this.addNotification(
        `${count} participant(s) added to the meeting.`
      );
    }
  }

  // =========================
  // AVAILABILITY
  // =========================

  onAvailabilityMeetingChange(): void {
    // Future API loading can be added here
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

  hasSubmittedAvailability(
    userId: number
  ): boolean {

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
      .map(part => part.charAt(0))
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

    const meetingAvailability =
      this.availability.filter(
        item => item.meetingId === meetingId
      );

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

    meetingAvailability.forEach(item => {

      if (item.startTime > latestStart) {
        latestStart = item.startTime;
      }

      if (item.endTime < earliestEnd) {
        earliestEnd = item.endTime;
      }
    });

    if (latestStart >= earliestEnd) {

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

    this.notifications.forEach(
      notification => {

        notification.isRead = true;
      }
    );
  }

  addNotification(message: string): void {

    const newId =
      this.notifications.length
        ? Math.max(
            ...this.notifications.map(
              n => n.id
            )
          ) + 1
        : 1;

    this.notifications.unshift({

      id: newId,

      message,

      isRead: false
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

    localStorage.removeItem('token');

    localStorage.removeItem('currentUser');

    this.router.navigate(['/login']);
  }
}