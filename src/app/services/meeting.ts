import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Meeting {
  id?: number;
  title: string;
  meetingDate: string;
  meetingTime?: string | null;
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

  private apiUrl =
    'https://syncup-backend-production28.up.railway.app/api/meetings';

  constructor(
    private http: HttpClient
  ) {}

  getMeetings(): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(this.apiUrl);
  }

  addMeeting(meeting: CreateMeetingRequest): Observable<Meeting> {
    return this.http.post<Meeting>(
      this.apiUrl,
      meeting
    );
  }

  updateMeeting(
    id: number,
    meeting: Meeting
  ): Observable<Meeting> {
    return this.http.put<Meeting>(
      `${this.apiUrl}/${id}`,
      meeting
    );
  }

  deleteMeeting(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`
    );
  }
}
