import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  private participantsSubject = new BehaviorSubject<any[]>([]);
  readonly participants$ = this.participantsSubject.asObservable();

  private apiUrl = 'https://syncup-backend-production28.up.railway.app/api/meetingparticipants';

  constructor(private http: HttpClient) { }

  getAllParticipants(): Observable<any> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap(participants => this.participantsSubject.next(participants || []))
    );
  }

  addParticipant(participant: any): Observable<any> {
    return this.http.post(this.apiUrl, participant).pipe(
      map((res: any) => res?.participant ?? res),
      tap(created => this.upsertParticipant(created))
    );
  }

  upsertParticipant(participant: any): void {
    if (!participant) return;
    const current = this.participantsSubject.value;
    const index = current.findIndex(item =>
      (participant.id !== undefined && item.id === participant.id) ||
      (Number(item.meetingId) === Number(participant.meetingId) &&
        Number(item.userId) === Number(participant.userId))
    );
    const next = [...current];
    if (index === -1) next.push(participant);
    else next[index] = participant;
    this.participantsSubject.next(next);
  }

  setParticipants(participants: any[]): void {
    this.participantsSubject.next(participants || []);
  }
}
