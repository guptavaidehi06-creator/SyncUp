import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {

  private apiUrl =
    'https://syncup-backend-production28.up.railway.app/api/availability';

  constructor(
    private http: HttpClient
  ) { }

  getAllAvailabilities(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getAvailabilitiesByMeeting(
    meetingId: number
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/meeting/${meetingId}`
    );

  }

  getAvailabilitiesByUser(
    userId: number
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/user/${userId}`
    );

  }

  addAvailability(
    availability: any
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      availability
    );

  }

  updateAvailability(
    id: number,
    availability: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      availability
    );

  }

  deleteAvailability(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );

  }
}