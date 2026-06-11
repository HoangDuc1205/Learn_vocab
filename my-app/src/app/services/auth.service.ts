import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface User {
  id: string;
  username: string;
  totalAnswered: number;
  totalCorrect: number;
  selectedTestIndex: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/auth';
  private TOKEN_KEY = 'quizlearn-token';
  private USER_KEY = 'quizlearn-user';

  currentUser = signal<User | null>(null);

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);
    if (token && userJson) {
      try {
        this.currentUser.set(JSON.parse(userJson));
      } catch {
        this.logout();
      }
    }
  }

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { username, password }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
  }

  private handleAuthSuccess(res: AuthResponse) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, res.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    }
    this.currentUser.set(res.user);
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  updateLocalUserStats(totalAnswered: number, totalCorrect: number, selectedTestIndex: number) {
    const user = this.currentUser();
    if (user) {
      const updated = {
        ...user,
        totalAnswered,
        totalCorrect,
        selectedTestIndex
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
      }
      this.currentUser.set(updated);
    }
  }
}
