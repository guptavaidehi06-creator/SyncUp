import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface Meeting {
  id?: number;
  title: string;
  meetingDate: string;
  meetingTime?: string | null;
  meetingEndTime?: string | null;
  durationMinutes?: number | null;
  priority: string;
  status: string;
  createdBy: number;
}

export interface CreateMeetingRequest {
  title: string;
  meetingDate: string;
  priority: string;
}

@Injectable({
  providedIn: 'root'
})
export class MeetingService {

  private meetingsSubject = new BehaviorSubject<Meeting[]>([]);
  readonly meetings$ = this.meetingsSubject.asObservable();

  private apiUrl =
    'https://syncup-backend-production28.up.railway.app/api/meetings';

  constructor(
    private http: HttpClient
  ) {}

  getMeetings(): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(this.apiUrl).pipe(
      tap(meetings => this.meetingsSubject.next(meetings || []))
    );
  }

  addMeeting(meeting: CreateMeetingRequest): Observable<Meeting> {
    return this.http.post<Meeting>(
      this.apiUrl,
      meeting
    ).pipe(tap(created => this.upsertMeeting(created)));
  }

  updateMeeting(
    id: number,
    meeting: Meeting
  ): Observable<Meeting> {
    return this.http.put<Meeting>(
      `${this.apiUrl}/${id}`,
      meeting
    ).pipe(tap(updated => this.upsertMeeting(updated)));
  }

  upsertMeeting(meeting: Meeting): void {
    if (!meeting || meeting.id === undefined) return;
    const current = this.meetingsSubject.value;
    const index = current.findIndex(item => item.id === meeting.id);
    const next = [...current];
    if (index === -1) next.push(meeting);
    else next[index] = meeting;
    this.meetingsSubject.next(next);
  }

  setMeetings(meetings: Meeting[]): void {
    this.meetingsSubject.next(meetings || []);
  }

  deleteMeeting(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`
    );
  }
}
