import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7056/api/auth';

  constructor(private http: HttpClient) { }

  register(data: any): Observable<any> {
    return this.http.post(this.apiUrl + '/register', data);
  }

  verify(data: any): Observable<any> {
    return this.http.post(this.apiUrl + '/verify', data).pipe(
      tap((res: any) => this.saveSession(res))
    );
  }

  login(data: any): Observable<any> {
    return this.http.post(this.apiUrl + '/login', data).pipe(
      tap((res: any) => this.saveSession(res))
    );
  }

  saveSession(res: any): void {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user ? user.isAdmin === true : false;
  }
}