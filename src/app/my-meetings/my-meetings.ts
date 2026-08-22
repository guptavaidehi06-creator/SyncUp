import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { MeetingService } from '../services/meeting';
import { ParticipantService } from '../services/participant';
import { AvailabilityService } from '../services/availability';

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

  constructor(
    private authService: AuthService,
    private meetingService: MeetingService,
    private participantService: ParticipantService,
    private availabilityService: AvailabilityService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();

    this.participantService.getAllParticipants().subscribe({
      next: (participants) => {
        const myParticipantEntries = participants.filter((p: any) => p.userId === this.currentUser.id);
        const myMeetingIds = myParticipantEntries.map((p: any) => p.meetingId);

        this.meetingService.getAllMeetings().subscribe({
          next: (meetings) => {
            this.myMeetings = meetings.filter((m: any) => myMeetingIds.includes(m.id));
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Error fetching meetings:', err)
        });
      },
      error: (err) => console.error('Error fetching participants:', err)
    });

    this.availabilityService.getAllAvailabilities().subscribe({
      next: (availabilities) => {
        const mine = availabilities.filter((a: any) => a.userId === this.currentUser.id);
        mine.forEach((a: any) => {
          // We don't directly know meetingId here, but we can match by date later if needed
        });
      },
      error: (err) => console.error('Error fetching availabilities:', err)
    });
  }

  isUpcoming(meeting: any): boolean {
  if (!meeting.meetingDate) return true;

  const meetingDateTime = new Date(meeting.meetingDate);

  if (meeting.meetingTime) {
    const [hours, minutes] = meeting.meetingTime.split(':').map(Number);
    meetingDateTime.setHours(hours, minutes, 0, 0);
  }

  return meetingDateTime >= new Date();
}

  goToSubmitAvailability(meetingId: number): void {
    this.router.navigate(['/submit-availability', meetingId]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}