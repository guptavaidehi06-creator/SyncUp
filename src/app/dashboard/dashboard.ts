import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { finalize, timeout, map, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../services/auth';
import {
  MeetingService,
  Meeting,
  CreateMeetingRequest
} from '../services/meeting';
import { ParticipantService } from '../services/participant';
import { AvailabilityService } from '../services/availability';
import { SchedulingService } from '../services/scheduling';
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
export class Dashboard implements OnInit, OnDestroy {

  @ViewChild('notificationMenu') notificationMenu?: ElementRef<HTMLElement>;

  sidebarOpen = typeof window === 'undefined' || window.innerWidth > 850;
  activeView: View = 'home';

  notificationsOpen = false;
  notificationsLoading = false;
  showLogoutConfirmation = false;
  meetingToCancel: Meeting | null = null;
  isCancellingMeeting = false;

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
    meetingId: null as number | null,
    durationMinutes: 60
  };

  suggestResult: any = null;

  newMeeting = {
    title: '',
    meetingDate: '',
    priority: 'Medium'
  };

  isSavingMeeting = false;
  isConfirmingSlot = false;
  isAddingParticipants = false;
  isFindingSlot = false;
  meetingSaveError: string | null = null;
  isMeetingSaveOutcomeUnknown = false;
  isCheckingMeetingStatus = false;
  private pendingMeetingSave: {
    title: string;
    meetingDate: string;
    existingMeetingIds: Set<number>;
  } | null = null;

  meetingToastMessage: string | null = null;
  meetingToastType: 'success' | 'error' = 'success';
  participantSuccessMessage: string | null = null;

  private meetingSuccessTimer?: ReturnType<typeof setTimeout>;
  private participantSuccessTimer?: ReturnType<typeof setTimeout>;
  private readonly destroyRef = inject(DestroyRef);
  private hasLoadedUsers = false;
  private hasLoadedMeetings = false;
  private hasLoadedParticipants = false;
  private hasLoadedAvailabilities = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private meetingService: MeetingService,
    private participantService: ParticipantService,
    private availabilityService: AvailabilityService,
    private schedulingService: SchedulingService,
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

    this.meetingService.meetings$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(meetings => this.meetings = meetings);
    this.participantService.participants$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(participants => this.participants = participants);
    this.availabilityService.availabilities$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(availabilities => this.availability = availabilities);

    this.route.paramMap.pipe(
      map(params => params.get('view')),
      map(view => this.isView(view) ? view : 'home'),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(view => this.activateView(view));
  }

  // =========================
  // LOAD USERS
  // =========================

  loadUsers(): void {

    if (this.hasLoadedUsers) return;

    this.userService
      .getAllUsers()
      .subscribe({

        next: (data: any) => {
          this.users = data || [];
          this.hasLoadedUsers = true;
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

    if (this.hasLoadedMeetings) return;

    this.meetingService
      .getMeetings()
      .subscribe({

        next: (data: Meeting[]) => {
          this.meetings = data || [];
          this.hasLoadedMeetings = true;
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

    if (this.hasLoadedParticipants) return;

    this.participantService
      .getAllParticipants()
      .subscribe({

        next: (data: any) => {
          this.participants = data || [];
          this.hasLoadedParticipants = true;
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

    if (this.hasLoadedAvailabilities) return;

    this.availabilityService
      .getAllAvailabilities()
      .subscribe({

        next: (data: any) => {
          this.availability = data || [];
          this.hasLoadedAvailabilities = true;
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

    if (!this.currentUser || this.notificationsLoading) {
      return;
    }

    const userId =
      Number(this.currentUser.id);

    if (!userId || userId <= 0) {
      return;
    }

    this.notificationsLoading = true;
    this.cdr.detectChanges();

    this.notificationService
      .getNotificationsByUser(userId)
      .pipe(finalize(() => {
        this.notificationsLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({

        next: (data: any) => {

          this.notifications =
            data || [];
          this.cdr.detectChanges();

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
    if (view !== 'create') this.reschedulingMeeting = null;
    void this.router.navigate(['/admin', view]);
  }

  ngOnDestroy(): void {
    if (this.meetingSuccessTimer) clearTimeout(this.meetingSuccessTimer);
    if (this.participantSuccessTimer) clearTimeout(this.participantSuccessTimer);
  }

  private isView(view: string | null): view is View {
    return view === 'home' || view === 'meetings' || view === 'create' ||
      view === 'participants' || view === 'availability' || view === 'slot';
  }

  private activateView(view: View): void {
    this.activeView = view;
    this.notificationsOpen = false;

    if (view !== 'create') this.reschedulingMeeting = null;

    if (view === 'home') {
      this.loadUsers();
      this.loadMeetings();
      this.loadParticipants();
      this.loadAvailabilities();
      this.loadNotifications();
    } else if (view === 'meetings') {
      this.loadMeetings();
      this.loadParticipants();
    } else if (view === 'participants') {
      this.selectedUserIds.clear();
      this.loadUsers();
      this.loadMeetings();
      this.loadParticipants();
    } else if (view === 'availability') {
      this.loadParticipants();
      this.loadAvailabilities();
    } else if (view === 'slot') {
      this.suggestResult = null;
      this.loadMeetings();
      this.loadAvailabilities();
    }

    this.cdr.detectChanges();
  }

  // =========================
  // PAGE TITLE
  // =========================

  getPageTitle(): string {

    switch (this.activeView) {

      case 'home':
        return `Welcome, ${this.getCurrentUserName()}! 👋`;

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
        return 'Here is your meeting activity and availability status.';

      case 'meetings':
        return 'View and manage all your meetings.';

      case 'create':
          return this.reschedulingMeeting
           ? 'Choose a new date for this meeting.'
           : 'Choose a title, date, and priority for the meeting.';

      case 'participants':
          return 'Add people to an upcoming meeting.';

      case 'availability':
          return 'Review submitted and pending participant availability.';

      case 'slot':
          return 'Choose an unconfirmed meeting to find a suitable time.';

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

  getAdminTodayMeetingCount(): number {
    return this.getAdminTodayMeetings().length;
  }

  getAdminTodayMeetings(): Meeting[] {
    const today = this.getTodayDate();
    const userId = this.getCurrentUserId();
    const participantMeetingIds = new Set(
      this.participants
        .filter(participant => Number(participant.userId) === userId)
        .map(participant => Number(participant.meetingId))
    );

    return this.meetings.filter(meeting => {
      const status = meeting.status?.toLowerCase();
      return String(meeting.meetingDate).slice(0, 10) === today &&
        status !== 'cancelled' && status !== 'completed' &&
        !this.isMeetingPast(meeting) &&
        (Number(meeting.createdBy) === userId || participantMeetingIds.has(Number(meeting.id)));
    }).sort((a, b) => this.getMeetingTimestamp(a) - this.getMeetingTimestamp(b));
  }

  getMeetingParticipantCount(meetingId: number | undefined): number {
    if (meetingId === undefined) return 0;
    return this.participants.filter(participant =>
      Number(participant.meetingId) === meetingId
    ).length;
  }

  getMeetingDuration(meeting: Meeting): string {
    if (meeting.durationMinutes) return this.formatDuration(meeting.durationMinutes);
    if (meeting.meetingTime && meeting.meetingEndTime) {
      return `${meeting.meetingTime} – ${meeting.meetingEndTime}`;
    }
    return 'Duration not set';
  }

  getBestSlotAvailabilityCount(): number {
    const meetingId = Number(this.suggestRequest.meetingId);
    return new Set(this.availability
      .filter(item => Number(item.meetingId) === meetingId)
      .map(item => Number(item.userId))).size;
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');

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

  getMeetingsEligibleForBestSlot(): Meeting[] {
    return this.getUpcomingMeetings().filter(meeting => {
      const status = meeting.status?.trim().toLowerCase();
      return status !== 'scheduled' && status !== 'confirmed';
    });
  }

  getAdminAvailabilityMeetings(): Meeting[] {
    const userId = this.getCurrentUserId();
    const participantMeetingIds = new Set(
      this.participants
        .filter(participant => Number(participant.userId) === userId)
        .map(participant => Number(participant.meetingId))
    );

    return this.getUpcomingMeetings()
      .filter(meeting => {
        const status = meeting.status?.trim().toLowerCase();
        return meeting.id !== undefined && participantMeetingIds.has(Number(meeting.id)) &&
          status !== 'scheduled' && status !== 'confirmed';
      });
  }

  getAvailabilityReviewMeetings(): Meeting[] {
    return this.getUpcomingMeetings().filter(meeting => {
      const status = meeting.status?.trim().toLowerCase();
      return status !== 'scheduled' && status !== 'confirmed' &&
        status !== 'cancelled' && status !== 'completed';
    });
  }

  getPendingAdminAvailabilityMeetings(): Meeting[] {
    return this.getAdminAvailabilityMeetings()
      .filter(meeting => !this.hasAdminSubmittedAvailability(Number(meeting.id)));
  }

  hasAdminSubmittedAvailability(meetingId: number): boolean {
    const userId = this.getCurrentUserId();
    return this.availability.some(item =>
      Number(item.meetingId) === meetingId && Number(item.userId) === userId
    );
  }

  isMeetingPast(meeting: Meeting): boolean {

    const status = meeting.status?.toLowerCase();

    if (status === 'cancelled' || status === 'completed') {
      return true;
    }

    if (!meeting.meetingDate) {
      return false;
    }

    if (meeting.meetingEndTime) {
      return this.getMeetingDateTime(meeting, meeting.meetingEndTime) <= new Date();
    }

    if (meeting.meetingTime && meeting.durationMinutes) {
      const endTimestamp = this.getMeetingDateTime(meeting).getTime() + meeting.durationMinutes * 60_000;
      return endTimestamp <= Date.now();
    }

    if (!meeting.meetingTime) {
      return String(meeting.meetingDate).slice(0, 10) < this.getTodayDate();
    }

    return String(meeting.meetingDate).slice(0, 10) < this.getTodayDate();
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

  private getMeetingDateTime(meeting: Meeting, time = meeting.meetingTime): Date {
    const date = new Date(`${String(meeting.meetingDate).slice(0, 10)}T00:00:00`);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
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

    if (this.isMeetingSaveOutcomeUnknown) {
      return;
    }

    this.meetingSaveError = null;

    if (!this.currentUser) {
      this.meetingSaveError = 'Your session is unavailable. Please log in again.';
      return;
    }

    if (!this.newMeeting.title.trim()) {
      this.meetingSaveError = 'Please enter a meeting title.';
      return;
    }

    if (!this.newMeeting.meetingDate) {
      this.meetingSaveError = 'Please select a meeting date.';
      return;
    }

    if (this.newMeeting.meetingDate < this.getTomorrowDate()) {
      this.meetingSaveError = 'Meeting date must be tomorrow or later.';
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
        meetingEndTime: null,
        durationMinutes: null,

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
        .pipe(finalize(() => {
          this.isSavingMeeting = false;
          this.cdr.detectChanges();
        }), takeUntilDestroyed(this.destroyRef))
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

            this.meetingService.upsertMeeting(updated);
            this.suggestResult = null;

            this.resetMeetingForm();

            this.reschedulingMeeting = null;

            this.showMeetingToast('Meeting rescheduled successfully! 🎉');
            void this.router.navigate(['/admin', 'meetings']);

            this.loadNotifications();
            this.cdr.detectChanges();
          },

          error: (err) => {

            console.error(
              'Error rescheduling meeting:',
              err
            );

            const message = typeof err?.error === 'string'
              ? err.error
              : err?.error?.message || 'Unable to reschedule meeting.';
            this.showMeetingToast(message, 'error');
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

    this.pendingMeetingSave = {
      title: meeting.title,
      meetingDate: meeting.meetingDate.slice(0, 10),
      existingMeetingIds: new Set(
        this.meetings
          .map(existingMeeting => Number(existingMeeting.id))
          .filter(id => Number.isFinite(id))
      )
    };

    this.meetingService
      .addMeeting(meeting)
      .pipe(
        timeout({ first: 30_000 }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
        this.isSavingMeeting = false;
        this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (createdMeeting: Meeting) => {

          this.pendingMeetingSave = null;
          this.isMeetingSaveOutcomeUnknown = false;

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

          this.resetMeetingForm();

          this.activeView = 'meetings';
          this.showMeetingToast('Meeting created successfully! 🎉');
          void this.router.navigate(['/admin', 'meetings']);

          this.loadNotifications();
          this.cdr.detectChanges();
        },

        error: (err) => {

          console.error(
            'Error creating meeting:',
            err
          );

          this.isMeetingSaveOutcomeUnknown =
            err?.name === 'TimeoutError' || err?.status === 0 || err?.status >= 500;
      this.meetingSaveError = this.getMeetingSaveError(err);
      this.showMeetingToast(this.meetingSaveError, 'error');
      this.cdr.detectChanges();
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

    this.suggestResult = null;
    this.suggestRequest.meetingId = null;
    this.setView('create');
  }

  private getMeetingSaveError(err: any): string {

    if (err?.name === 'TimeoutError') {
      return 'The request timed out. The meeting may have been saved; check its status before retrying.';
    }

    if (err?.status === 0) {
      return 'The API connection was interrupted. The meeting may have been saved; check its status before retrying.';
    }

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

    if (err?.status >= 500) {
      return `${message || 'The server could not confirm the save.'} Check the meeting list before retrying.`;
    }

    return message || 'Unable to create meeting. Please review the error and try again.';
  }

  private showMeetingToast(
    message: string,
    type: 'success' | 'error' = 'success'
  ): void {

    this.meetingToastMessage = message;
    this.meetingToastType = type;
    this.cdr.detectChanges();

    if (this.meetingSuccessTimer) {
      clearTimeout(this.meetingSuccessTimer);
    }

    this.meetingSuccessTimer = setTimeout(() => {
      this.meetingToastMessage = null;
      this.cdr.detectChanges();
    }, 3500);
  }

  checkMeetingSaveOutcome(): void {
    const pendingSave = this.pendingMeetingSave;
    if (!this.isMeetingSaveOutcomeUnknown || !pendingSave || this.isCheckingMeetingStatus) {
      return;
    }

    this.isCheckingMeetingStatus = true;
    this.meetingService.getMeetings().pipe(
      timeout({ first: 15_000 }),
      finalize(() => {
        this.isCheckingMeetingStatus = false;
      })
    ).subscribe({
      next: meetings => {
        this.meetings = meetings || [];
        this.hasLoadedMeetings = true;
        const savedMeeting = this.meetings.find(meeting =>
          meeting.id !== undefined &&
          !pendingSave.existingMeetingIds.has(Number(meeting.id)) &&
          Number(meeting.createdBy) === this.getCurrentUserId() &&
          meeting.title.trim().toLowerCase() === pendingSave.title.toLowerCase() &&
          String(meeting.meetingDate).slice(0, 10) === pendingSave.meetingDate
        );

        if (!savedMeeting) {
          this.meetingSaveError = 'No matching meeting was found yet. Check again before retrying to avoid a duplicate.';
          this.showMeetingToast(this.meetingSaveError, 'error');
          return;
        }

        this.pendingMeetingSave = null;
        this.isMeetingSaveOutcomeUnknown = false;
        this.meetingSaveError = null;
        this.showMeetingToast('Meeting created successfully! 🎉');
        this.resetMeetingForm();
        void this.router.navigate(['/admin', 'meetings']);
        this.loadNotifications();
        this.cdr.detectChanges();
      },
      error: () => {
        this.meetingSaveError = 'Could not verify whether the meeting was saved. Check again before retrying.';
        this.showMeetingToast(this.meetingSaveError, 'error');
      }
    });
  }

  goToSubmitAvailability(meetingId: number): void {
    void this.router.navigate(['/submit-availability', meetingId], {
      state: { returnUrl: this.router.url }
    });
  }

  // =========================
  // CANCEL MEETING
  // =========================

  cancelMeeting(
    meeting: Meeting
  ): void {

    if (
      this.isCancellingMeeting ||
      meeting.status === 'Cancelled' ||
      this.isMeetingPast(meeting)
    ) {
      return;
    }

    this.meetingToCancel = meeting;
  }

  closeCancelMeetingConfirmation(): void {
    if (this.isCancellingMeeting) return;
    this.meetingToCancel = null;
  }

  confirmCancelMeeting(): void {
    const meeting = this.meetingToCancel;
    if (!meeting || this.isCancellingMeeting || meeting.status === 'Cancelled' || this.isMeetingPast(meeting)) {
      return;
    }

    this.isCancellingMeeting = true;

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

          this.meetingToCancel = null;
          this.isCancellingMeeting = false;
          this.showMeetingToast('Meeting cancelled successfully! 🎉');
          this.loadNotifications();
          this.cdr.detectChanges();
        },

        error: (err) => {

          console.error(
            'Error cancelling meeting:',
            err
          );

          this.isCancellingMeeting = false;
          const message = typeof err?.error === 'string'
            ? err.error
            : err?.error?.message || 'Unable to cancel meeting.';
          this.showMeetingToast(message, 'error');
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

  getExistingParticipantType(userId: number): 'Mandatory' | 'Optional' {
    const participant = this.participants.find(item =>
      Number(item.meetingId) === Number(this.participantMeetingId) &&
      Number(item.userId) === Number(userId)
    );
    return participant?.isMandatory ? 'Mandatory' : 'Optional';
  }

  // =========================
  // ADD PARTICIPANTS
  // =========================

  addSelectedParticipants(): void {

    if (this.isAddingParticipants ||
      this.participantMeetingId === null ||
      this.selectedUserIds.size === 0
    ) {
      return;
    }

    const meetingId =
      this.participantMeetingId;

    const selectedUsers = Array.from(this.selectedUserIds)
      .filter(userId => !this.isUserAlreadyParticipant(userId));
    if (!selectedUsers.length) return;

    this.isAddingParticipants = true;
    let remaining = selectedUsers.length;
    let hasError = false;
    let errorMessage = 'Unable to add participants.';

    const finishRequest = (): void => {
      remaining -= 1;
      if (remaining !== 0) return;
      this.isAddingParticipants = false;
      if (hasError) {
        this.showMeetingToast(errorMessage, 'error');
      } else {
        this.selectedUserIds.clear();
        this.bulkIsMandatory = false;
        this.showParticipantSuccess();
        this.loadNotifications();
      }
      this.cdr.detectChanges();
    };

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
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(finishRequest)
          )
          .subscribe({

            next: (created: Participant) => {
              const exists = this.participants.some(item =>
                Number(item.meetingId) === meetingId && Number(item.userId) === userId
              );
              if (!exists) this.participants.push(created);
              this.cdr.detectChanges();
            },

            error: (err) => {

              console.error(
                'Error adding participant:',
                err
              );

              hasError = true;
              errorMessage = typeof err?.error === 'string'
                ? err.error
                : err?.error?.message || 'Unable to add participants.';
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

  getPendingAvailabilityCount(): number {
    return this.getParticipantsForAvailability()
      .filter(participant => !this.hasSubmittedAvailability(participant.userId))
      .length;
  }

  getSubmittedAvailabilityCount(): number {
    return this.getParticipantsForAvailability()
      .filter(participant => this.hasSubmittedAvailability(participant.userId))
      .length;
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

  clearSuggestedSlot(): void {
    this.suggestResult = null;
  }

  findBestSlot(): void {

    if (this.isFindingSlot) return;

    const meetingId =
      this.suggestRequest.meetingId;

    if (
      meetingId === null
    ) {
      return;
    }

    if (!this.getMeetingsEligibleForBestSlot().some(meeting => meeting.id === meetingId)) {
      this.suggestResult = {
        success: false,
        message: 'Select an eligible, unconfirmed meeting.'
      };
      return;
    }

    this.isFindingSlot = true;
    this.schedulingService
      .suggestSlot({
        meetingId,
        durationMinutes: this.suggestRequest.durationMinutes
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isFindingSlot = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (data: any) => {
          this.suggestResult = data;
          this.cdr.detectChanges();
        },

        error: (err) => {

          console.error(
            'Error finding best slot:',
            err
          );

          this.suggestResult = {

            success: false,

            message:
              err?.error || 'Unable to find a best slot.'
          };
          this.cdr.detectChanges();
        }

      });
  }

  // =========================
  // NOTIFICATION UI
  // =========================

  toggleNotifications(): void {

    this.notificationsOpen =
      !this.notificationsOpen;

    this.cdr.detectChanges();

    if (
      this.notificationsOpen
    ) {

      this.loadNotifications();
    }
  }

  @HostListener('document:click', ['$event'])
  closeNotificationsOnOutsideClick(event: MouseEvent): void {
    if (!this.notificationsOpen) return;
    const menu = this.notificationMenu?.nativeElement;
    const target = event.target;
    const clickedInside = menu
      ? event.composedPath().includes(menu) || (target instanceof Node && menu.contains(target))
      : target instanceof Element && target.closest('.notification-wrapper') !== null;
    if (!clickedInside) {
      this.notificationsOpen = false;
      this.cdr.detectChanges();
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

  confirmBestSlot(): void {
    if (this.isConfirmingSlot || !this.suggestResult?.success || !this.suggestRequest.meetingId) {
      return;
    }

    if (!this.getMeetingsEligibleForBestSlot().some(meeting => meeting.id === this.suggestRequest.meetingId)) {
      this.suggestResult = null;
      return;
    }

    this.isConfirmingSlot = true;

    this.schedulingService.confirmSlot({
      meetingId: this.suggestRequest.meetingId,
      meetingDate: this.suggestResult.meetingDate,
      startTime: this.suggestResult.suggestedStartTime,
      endTime: this.suggestResult.suggestedEndTime,
      durationMinutes: this.suggestResult.durationMinutes
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.isConfirmingSlot = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (meeting: Meeting) => {
        this.meetingService.upsertMeeting(meeting);
        const index = this.meetings.findIndex(item => item.id === meeting.id);
        if (index !== -1) this.meetings[index] = meeting;
        else this.meetings.push(meeting);
        this.suggestResult = null;
        this.suggestRequest.meetingId = null;
        this.showMeetingToast('Meeting confirmed successfully! 🎉');
        this.loadNotifications();
        this.cdr.detectChanges();
      },
      error: (err) => {
        const message = typeof err?.error === 'string'
          ? err.error
          : err?.error?.message || 'Unable to confirm the best slot.';
        this.suggestResult = { success: false, message };
        this.showMeetingToast(message, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  formatDuration(minutes: number): string {
    if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
    return `${minutes} minutes`;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  private showParticipantSuccess(): void {

    this.participantSuccessMessage =
      'Participants added successfully! 🎉';

    if (this.participantSuccessTimer) {
      clearTimeout(this.participantSuccessTimer);
    }

    this.participantSuccessTimer = setTimeout(() => {
      this.participantSuccessMessage = null;
      this.cdr.detectChanges();
    }, 3500);
    this.cdr.detectChanges();
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

    this.authService.logoutAndRedirect(this.router);
  }
}
