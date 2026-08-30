import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  private apiUrl = 'https://syncup-backend-production28.up.railway.app';

  constructor(private http: HttpClient) { }

  getAllParticipants(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  addParticipant(participant: any): Observable<any> {
    return this.http.post(this.apiUrl, participant);
  }
}