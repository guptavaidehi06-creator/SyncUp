import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private apiUrl = 'https://syncup-backend-production28.up.railway.app/api/meetings';

  constructor(private http: HttpClient) { }

  getAllMeetings(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  addMeeting(meeting: any): Observable<any> {
    return this.http.post(this.apiUrl, meeting);
  }

  updateMeeting(id: number, meeting: any): Observable<any> {
    return this.http.put(this.apiUrl + '/' + id, meeting);
  }

  deleteMeeting(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + '/' + id);
  }
}