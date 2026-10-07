import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {

  private availabilitiesSubject = new BehaviorSubject<any[]>([]);
  readonly availabilities$ = this.availabilitiesSubject.asObservable();

  private apiUrl =
    'https://syncup-backend-production28.up.railway.app/api/availability';

  constructor(
    private http: HttpClient
  ) { }

  getAllAvailabilities(): Observable<any> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap(items => this.availabilitiesSubject.next(items || []))
    );
  }

  getAvailabilitiesByMeeting(
    meetingId: number
  ): Observable<any> {

    return this.http.get<any[]>(
      `${this.apiUrl}/meeting/${meetingId}`
    ).pipe(tap(items => this.replaceMeetingAvailabilities(meetingId, items || [])));

  }

  getAvailabilitiesByUser(
    userId: number
  ): Observable<any> {

    return this.http.get<any[]>(
      `${this.apiUrl}/user/${userId}`
    ).pipe(tap(items => this.replaceUserAvailabilities(userId, items || [])));

  }

  addAvailability(
    availability: any
  ): Observable<any> {

    return this.http.post<any>(
      this.apiUrl,
      availability
    ).pipe(tap(created => this.upsertAvailability(created || availability)));

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

  upsertAvailability(availability: any): void {
    if (!availability) return;
    const current = this.availabilitiesSubject.value;
    const index = current.findIndex(item =>
      (availability.id !== undefined && item.id === availability.id) ||
      (Number(item.meetingId) === Number(availability.meetingId) &&
        Number(item.userId) === Number(availability.userId) &&
        item.startTime === availability.startTime &&
        item.endTime === availability.endTime)
    );
    const next = [...current];
    if (index === -1) next.push(availability);
    else next[index] = availability;
    this.availabilitiesSubject.next(next);
  }

  private replaceMeetingAvailabilities(meetingId: number, items: any[]): void {
    this.availabilitiesSubject.next([
      ...this.availabilitiesSubject.value.filter(item => Number(item.meetingId) !== meetingId),
      ...items
    ]);
  }

  private replaceUserAvailabilities(userId: number, items: any[]): void {
    this.availabilitiesSubject.next([
      ...this.availabilitiesSubject.value.filter(item => Number(item.userId) !== userId),
      ...items
    ]);
  }

  setAvailabilities(items: any[]): void {
    this.availabilitiesSubject.next(items || []);
  }
}
