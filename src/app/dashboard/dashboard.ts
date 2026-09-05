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

activeView:
| 'home'
| 'meetings'
| 'create'
| 'participants'
| 'availability'
| 'slot' = 'home';

sidebarOpen = true;
createStep = 1;

notificationsOpen = false;
showLogoutConfirmation = false;

schedulingType: 'fixed' | 'availability' = 'fixed';

users: any[] = [];
meetings: any[] = [];
availabilities: any[] = [];
participants: any[] = [];

notifications: string[] = [];

createdMeetingId: number | null = null;

newMeeting = {
title: '',
meetingDate: '',
meetingTime: '',
priority: 'Medium',
status: 'Scheduled',
creatorId: null as number | null
};

participantMeetingId: number | null = null;

selectedUserIds: Set<number> = new Set();

bulkIsMandatory = true;

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
) {}

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

if (view === 'create') {
  this.createStep = 1;
}

this.selectedUserIds.clear();

}

/* ================= PAGE ================= */

getPageTitle(): string {

switch (this.activeView) {

  case 'home':
    const name = this.getCurrentUserName();
    return name ? `Welcome, ${name}` : 'Welcome';

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
    return 'Create a meeting and organize participants.';

  case 'participants':
    return 'Manage people participating in your meetings.';

  case 'availability':
    return 'Review availability submitted by participants.';

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

/* ================= LOAD DATA ================= */

loadUsers(): void {

this.userService.getAllUsers().subscribe({

  next: (data) => {

    this.users = data;
    this.cdr.detectChanges();

  },

  error: (err) =>
    console.error('Error fetching users:', err)

});

}

loadMeetings(): void {

  this.meetingService.getAllMeetings().subscribe({

  next: (data) => {

    this.meetings = data;
    this.cdr.detectChanges();

  },

  error: (err) =>
    console.error('Error fetching meetings:', err)

});

}

loadAvailabilities(): void {

this.availabilityService.getAllAvailabilities().subscribe({

  next: (data) => {

    this.availabilities = data;
    this.cdr.detectChanges();

  },

  error: (err) =>
    console.error('Error fetching availabilities:', err)

});

}

loadParticipants(): void {

this.participantService.getAllParticipants().subscribe({

  next: (data) => {

    this.participants = data;
    this.cdr.detectChanges();

  },

  error: (err) =>
    console.error('Error fetching participants:', err)

});

}

/* ================= MEETING STATUS ================= */

isMeetingUpcoming(meeting: any): boolean {

  if (!meeting.meetingDate) return true;

if (meeting.status === 'Cancelled') return false;

const meetingDateTime = new Date(meeting.meetingDate);

if (meeting.meetingTime) {

  const [hours, minutes] =
    meeting.meetingTime.split(':').map(Number);

  meetingDateTime.setHours(hours, minutes, 0, 0);

}

return meetingDateTime >= new Date();

}

getUpcomingMeetings(): any[] {

return this.meetings.filter(meeting =>
  this.isMeetingUpcoming(meeting)
);

}

getCompletedMeetings(): any[] {

return this.meetings.filter(meeting =>
  !this.isMeetingUpcoming(meeting) &&
  meeting.status !== 'Cancelled'
);

}

/* ================= CREATE FLOW ================= */

onSchedulingTypeChange(): void {

if (this.schedulingType === 'availability') {

  this.newMeeting.meetingTime = '';

}

}

createMeetingAndContinue(): void {

const title = this.newMeeting.title;

this.meetingService.addMeeting(this.newMeeting).subscribe({

  next: (meeting: any) => {

    this.createdMeetingId = meeting.id;

    this.participantMeetingId = meeting.id;

    this.notifications.unshift(
      `Meeting "${title}" was created successfully.`
    );

    this.createStep = 2;

    this.cdr.detectChanges();

  },

  error: (err) =>
    console.error('Error creating meeting:', err)

});

}

saveParticipantsAndContinue(): void {

if (!this.participantMeetingId) return;

const requests =
  Array.from(this.selectedUserIds).map(userId => {

    const payload = {

      meetingId: this.participantMeetingId,
      userId: userId,
      isMandatory: this.bulkIsMandatory

    };

    return this.participantService
      .addParticipant(payload)
      .toPromise();

  });


Promise.all(requests)

  .then(() => {

    this.notifications.unshift(
      `${this.selectedUserIds.size} participant(s) were added to the meeting.`
    );

    this.selectedUserIds.clear();

    this.loadParticipants();


    if (this.schedulingType === 'fixed') {

      this.finishCreateFlow();

    } else {

      this.createStep = 3;

    }

  })

  .catch(err =>
    console.error('Error adding participants:', err)
  );

}

finishAvailabilityMeeting(): void {

this.notifications.unshift(
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

this.participantMeetingId = null;

this.createStep = 1;

this.loadMeetings();

this.activeView = 'meetings';

}

previousCreateStep(): void {

if (this.createStep > 1) {

  this.createStep--;

}


}

/* ================= MEETING ACTIONS ================= */

cancelMeeting(meeting: any): void {


const updatedMeeting = {

  ...meeting,
  status: 'Cancelled'

};


this.meetingService
  .updateMeeting(meeting.id, updatedMeeting)
  .subscribe({

    next: () => {

      this.notifications.unshift(
        `Meeting "${meeting.title}" was cancelled.`
      );

      this.loadMeetings();

    },

    error: (err) =>
      console.error(
        'Error cancelling meeting:',
        err
      )

  });


}

/* ================= PARTICIPANTS ================= */

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

if (
  !this.participantMeetingId ||
  this.selectedUserIds.size === 0
) return;


const requests =
  Array.from(this.selectedUserIds).map(userId => {

    const payload = {

      meetingId: this.participantMeetingId,
      userId: userId,
      isMandatory: this.bulkIsMandatory

    };

    return this.participantService
      .addParticipant(payload)
      .toPromise();

  });


Promise.all(requests)

  .then(() => {

    this.notifications.unshift(
      `${this.selectedUserIds.size} participant(s) were added.`
    );

    this.selectedUserIds.clear();

    this.loadParticipants();

  })

  .catch(err =>
    console.error(
      'Error adding participants:',
      err
    )
  );

}

/* ================= BEST SLOT ================= */

findBestSlot(): void {

this.suggestResult = null;

this.schedulingService
  .suggestSlot(this.suggestRequest)
  .subscribe({

    next: (data) => {

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

/* ================= HELPERS ================= */

getUserName(userId: number): string {

const user =
  this.users.find(u => u.id === userId);

return user
  ? user.name
  : 'Unknown user';

}

getInitials(name: string): string {

if (!name) return 'U';

const parts =
  name.trim().split(' ');

if (parts.length === 1) {

  return parts[0].charAt(0).toUpperCase();

}

return (
  parts[0].charAt(0) +
  parts[parts.length - 1].charAt(0)
).toUpperCase();

}

getInviteLink(meetingId: number): string {

return `${window.location.origin}/submit-availability/${meetingId}`;

}

copyLink(meetingId: number): void {

const link =
  this.getInviteLink(meetingId);

navigator.clipboard.writeText(link);

this.notifications.unshift(
  'Meeting invite link was copied to your clipboard.'
);

}

/* ================= LOGOUT ================= */

openLogoutConfirmation(): void {

this.showLogoutConfirmation = true;

}

closeLogoutConfirmation(): void {

this.showLogoutConfirmation = false;

}

confirmLogout(): void {

this.authService.logout();

this.router.navigate(['/login']);

}

/* ================= CURRENT USER ================= */

getCurrentUserName(): string {


const user = this.authService.getUser();

return user
  ? user.name
  : '';

}

}
