import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
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
  timeValidationMessage: string | null = null;

  timeWindows: { startTime: string; endTime: string }[] = [
    {
      startTime: '',
      endTime: ''
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private meetingService: MeetingService,
    private availabilityService: AvailabilityService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.meetingId = Number(
      this.route.snapshot.paramMap.get('meetingId')
    );

    this.currentUser = this.authService.getUser();

    if (!this.meetingId) {
      console.error('Invalid meeting ID');
      return;
    }

    this.meetingService.getMeetings().subscribe({

      next: (meetings: any[]) => {

        this.meeting = meetings.find(
          (m: any) => m.id === this.meetingId
        );

        this.cdr.detectChanges();

      },

      error: (err: any) => {

        console.error(
          'Error fetching meeting:',
          err
        );

      }

    });

  }

  goBack(): void {
    this.location.back();
  }


  /* ================= ADD TIME WINDOW ================= */

  addAnotherWindow(): void {

    this.timeWindows.push({
      startTime: '',
      endTime: ''
    });

    this.cdr.detectChanges();

  }


  /* ================= REMOVE TIME WINDOW ================= */

  removeWindow(index: number): void {

    if (this.timeWindows.length > 1) {

      this.timeWindows.splice(index, 1);

    }

    this.cdr.detectChanges();

  }

  getMinimumEndTime(startTime: string): string {
    if (!startTime) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 1;
    if (totalMinutes >= 24 * 60) return '23:59';

    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }

  onStartTimeChange(window: { startTime: string; endTime: string }): void {
    if (window.endTime && window.endTime <= window.startTime) {
      window.endTime = '';
    }
    this.timeValidationMessage = null;
  }

  hasValidTimeWindows(): boolean {
    return this.timeWindows.every(window =>
      !!window.startTime && !!window.endTime && window.endTime > window.startTime);
  }


  /* ================= SUBMIT AVAILABILITY ================= */

  submitAvailability(): void {

    if (!this.currentUser || !this.meeting) {
      return;
    }

    if (!this.hasValidTimeWindows()) {
      this.timeValidationMessage = 'Each end time must be after its start time.';
      return;
    }

    this.timeValidationMessage = null;

    this.submitting = true;

    const requests = this.timeWindows.map(window => {

      const payload = {

        meetingId: this.meetingId,

        userId: this.currentUser.id,

        specificDate: this.meeting.meetingDate,

        dayOfWeek: null,

        startTime: window.startTime,

        endTime: window.endTime

      };

      return this.availabilityService
        .addAvailability(payload)
        .toPromise();

    });


    Promise.all(requests)

      .then(() => {

        this.submitted = true;

        this.submitting = false;

        this.cdr.detectChanges();

      })

      .catch((err: any) => {

        console.error(
          'Error submitting availability:',
          err
        );

        this.submitting = false;

        this.cdr.detectChanges();

      });

  }

}
