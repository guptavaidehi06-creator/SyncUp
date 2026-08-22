import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth';
import { MeetingService } from '../services/meeting';
import { AvailabilityService } from '../services/availability';

@Component({
  selector: 'app-submit-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './submit-availability.html',
  styleUrl: './submit-availability.css'
})
export class SubmitAvailability implements OnInit {
  meetingId: number = 0;
  meeting: any = null;
  currentUser: any = null;
  submitted: boolean = false;
  submitting: boolean = false;

  timeWindows: { startTime: string; endTime: string }[] = [
    { startTime: '', endTime: '' }
  ];

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private meetingService: MeetingService,
    private availabilityService: AvailabilityService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.meetingId = Number(this.route.snapshot.paramMap.get('meetingId'));
    this.currentUser = this.authService.getUser();

    this.meetingService.getAllMeetings().subscribe({
      next: (meetings) => {
        this.meeting = meetings.find((m: any) => m.id === this.meetingId);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching meeting:', err)
    });
  }

  addAnotherWindow(): void {
    this.timeWindows.push({ startTime: '', endTime: '' });
    this.cdr.detectChanges();
  }

  removeWindow(index: number): void {
    this.timeWindows.splice(index, 1);
    this.cdr.detectChanges();
  }

  submitAvailability(): void {
    if (!this.currentUser || !this.meeting) return;

    this.submitting = true;

    const requests = this.timeWindows.map(w => {
      const payload = {
        userId: this.currentUser.id,
        specificDate: this.meeting.meetingDate,
        dayOfWeek: null,
        startTime: w.startTime,
        endTime: w.endTime
      };
      return this.availabilityService.addAvailability(payload).toPromise();
    });

    Promise.all(requests)
      .then(() => {
        this.submitted = true;
        this.submitting = false;
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error('Error submitting availability:', err);
        this.submitting = false;
        this.cdr.detectChanges();
      });
  }
}