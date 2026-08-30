import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SchedulingService {
  private apiUrl = 'https://syncup-backend-production28.up.railway.app';

  constructor(private http: HttpClient) { }

  suggestSlot(request: any): Observable<any> {
    return this.http.post(this.apiUrl + '/suggest', request);
  }
}