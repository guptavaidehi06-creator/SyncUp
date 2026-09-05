import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private apiUrl =
    'https://syncup-backend-production28.up.railway.app/api/notification';

  constructor(
    private http: HttpClient
  ) {}

  // Get all notifications
  getAllNotifications(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Get notifications of a specific user
  getNotificationsByUser(
    userId: number
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/user/${userId}`
    );
  }

  // Add notification
  addNotification(
    notification: any
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      notification
    );
  }

  // Mark notification as read
  markAsRead(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/read`,
      {}
    );
  }

  // Mark all notifications as read
  markAllAsRead(
    userId: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/user/${userId}/read-all`,
      {}
    );
  }

  // Delete notification
  deleteNotification(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );
  }
}