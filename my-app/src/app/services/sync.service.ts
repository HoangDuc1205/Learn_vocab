import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Word } from '../components/progress-tracker/progress-tracker.component';

export interface SyncPayload {
  totalAnswered: number;
  totalCorrect: number;
  selectedTestIndex: number;
  words: Word[];
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = 'http://localhost:5000/api/vocabulary';

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
  }

  fetchProgress(): Observable<SyncPayload> {
    return this.http.get<SyncPayload>(this.apiUrl, { headers: this.getHeaders() });
  }

  syncProgress(payload: SyncPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sync`, payload, { headers: this.getHeaders() });
  }
}
