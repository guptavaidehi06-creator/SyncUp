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
  activeView: 'home' | 'meetings' | 'create' | 'participants' | 'availability' | 'slot' = 'home';
  createStep = 1;
  users: any[] = [];
  meetings: any[] = [];
  availabilities: any[] = [];
  participants: any[] = [];
  notifications: string[] = [];

  newMeeting = {
    title: '',
    meetingDate: '',
    meetingTime: '',
    priority: 'Medium',
    status: 'Scheduled',
    creatorId: null
  };

  participantMeetingId: number | null = null;
  selectedUserIds: Set<number> = new Set();
  bulkIsMandatory: boolean = true;

  suggestRequest = {
    meetingId: null
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

  ngOnInit(): void {
    this.loadUsers();
    this.loadMeetings();
    this.loadAvailabilities();
    this.loadParticipants();
  }

  setView(view: 'home' | 'meetings' | 'create' | 'participants' | 'availability' | 'slot'): void {
    this.activeView = view;
    if (view === 'create') this.createStep = 1;
  }

  nextCreateStep(): void {
    if (this.createStep < 3) this.createStep++;
  }

  previousCreateStep(): void {
    if (this.createStep > 1) this.createStep--;
  }

  getUpcomingMeetings(): any[] {
    return this.meetings.filter(meeting => this.isMeetingUpcoming(meeting));
  }

  getCompletedMeetings(): any[] {
    return this.meetings.filter(meeting => !this.isMeetingUpcoming(meeting));
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  loadMeetings(): void {
    this.meetingService.getAllMeetings().subscribe({
      next: (data) => {
        this.meetings = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching meetings:', err)
    });
  }

  loadAvailabilities(): void {
    this.availabilityService.getAllAvailabilities().subscribe({
      next: (data) => {
        this.availabilities = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching availabilities:', err)
    });
  }

  loadParticipants(): void {
    this.participantService.getAllParticipants().subscribe({
      next: (data) => {
        this.participants = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching participants:', err)
    });
  }
  isMeetingUpcoming(meeting: any): boolean {
  if (!meeting.meetingDate) return true;

  const meetingDateTime = new Date(meeting.meetingDate);

  if (meeting.meetingTime) {
    const [hours, minutes] = meeting.meetingTime.split(':').map(Number);
    meetingDateTime.setHours(hours, minutes, 0, 0);
  }

  return meetingDateTime >= new Date();
}

  addMeeting(): void {
    const title = this.newMeeting.title;
    this.meetingService.addMeeting(this.newMeeting).subscribe({
      next: () => {
        this.notifications.unshift(`🟢 New meeting "${title}" was created.`);
        this.newMeeting = {
          title: '',
          meetingDate: '',
          meetingTime: '',
          priority: 'Medium',
          status: 'Scheduled',
          creatorId: null
        };
        this.loadMeetings();
        this.activeView = 'meetings';
      },
      error: (err) => console.error('Error adding meeting:', err)
    });
  }

  cancelMeeting(meeting: any): void {
    const updatedMeeting = { ...meeting, status: 'Cancelled' };
    this.meetingService.updateMeeting(meeting.id, updatedMeeting).subscribe({
      next: () => {
        this.notifications.unshift(`🔴 Meeting "${meeting.title}" was cancelled.`);
        this.loadMeetings();
      },
      error: (err) => console.error('Error cancelling meeting:', err)
    });
  }

  rescheduleMeeting(meeting: any, newDate: string, newTime: string): void {
    const updatedMeeting = {
      ...meeting,
      meetingDate: newDate,
      meetingTime: newTime,
      status: 'Rescheduled'
    };
    this.meetingService.updateMeeting(meeting.id, updatedMeeting).subscribe({
      next: () => {
        this.notifications.unshift(`🟡 Meeting "${meeting.title}" was rescheduled.`);
        this.loadMeetings();
      },
      error: (err) => console.error('Error rescheduling meeting:', err)
    });
  }

  toggleUserSelection(userId: number): void {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUserIds.has(userId);
  }

  addSelectedParticipants(): void {
    if (!this.participantMeetingId || this.selectedUserIds.size === 0) return;

    const requests = Array.from(this.selectedUserIds).map(userId => {
      const payload = {
        meetingId: this.participantMeetingId,
        userId: userId,
        isMandatory: this.bulkIsMandatory
      };
      return this.participantService.addParticipant(payload).toPromise();
    });

    Promise.all(requests).then(() => {
      this.selectedUserIds.clear();
      this.loadParticipants();
    }).catch((err) => console.error('Error adding participants:', err));
  }

  findBestSlot(): void {
    this.suggestResult = null;
    this.schedulingService.suggestSlot(this.suggestRequest).subscribe({
      next: (data) => {
        this.suggestResult = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error suggesting slot:', err);
        this.suggestResult = { success: false, message: 'Error occurred while finding slot.' };
        this.cdr.detectChanges();
      }
    });
  }

  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  }

  getInviteLink(meetingId: number): string {
    return `${window.location.origin}/submit-availability/${meetingId}`;
  }

  copyLink(meetingId: number): void {
    const link = this.getInviteLink(meetingId);
    navigator.clipboard.writeText(link);
    alert('Link copied: ' + link);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getCurrentUserName(): string {
    const user = this.authService.getUser();
    return user ? user.name : '';

  }
}