import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, distinctUntilChanged, finalize, from, map, mergeMap, switchMap, tap, toArray } from 'rxjs';
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
  isLoadingMeeting = false;
  submissionError: string | null = null;
  timeValidationMessage: string | null = null;
  private readonly destroyRef = inject(DestroyRef);

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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();

    this.route.paramMap.pipe(
      map(params => Number(params.get('meetingId'))),
      distinctUntilChanged(),
      tap(meetingId => {
        this.meetingId = meetingId;
        this.meeting = null;
        this.submitted = false;
        this.submissionError = null;
        this.timeValidationMessage = null;
        this.timeWindows = [{ startTime: '', endTime: '' }];
      }),
      switchMap(meetingId => {
        if (!Number.isFinite(meetingId) || meetingId <= 0) return EMPTY;
        this.isLoadingMeeting = true;
        return this.meetingService.getMeetings().pipe(
          map(meetings => meetings.find(meeting => Number(meeting.id) === meetingId) || null),
          finalize(() => {
            this.isLoadingMeeting = false;
            this.cdr.detectChanges();
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: meeting => {
        this.meeting = meeting;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error fetching meeting:', err);
        this.submissionError = 'Unable to load this meeting. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    const returnUrl = history.state?.returnUrl;
    const safeReturnUrl = typeof returnUrl === 'string' &&
      returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/my-meetings';
    void this.router.navigateByUrl(safeReturnUrl);
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

    if (this.submitting || !this.currentUser || !this.meeting) {
      return;
    }

    if (!this.hasValidTimeWindows()) {
      this.timeValidationMessage = 'Each end time must be after its start time.';
      return;
    }

    this.timeValidationMessage = null;
    this.submissionError = null;
    this.submitting = true;

    const errors: any[] = [];
    from(this.timeWindows).pipe(
      mergeMap(window => {
        const payload = {
          meetingId: this.meetingId,
          userId: this.currentUser.id,
          specificDate: this.meeting.meetingDate,
          dayOfWeek: null,
          startTime: window.startTime,
          endTime: window.endTime
        };
        return this.availabilityService.addAvailability(payload).pipe(
          catchError(err => {
            errors.push(err);
            return EMPTY;
          })
        );
      }, this.timeWindows.length),
      toArray(),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.submitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        if (errors.length) {
          console.error('Error submitting availability:', errors[0]);
          this.submissionError = 'Unable to submit availability. Please review your time windows and try again.';
          this.cdr.detectChanges();
          return;
        }
        this.submitted = true;
        this.cdr.detectChanges();
      }
    });

  }

}
