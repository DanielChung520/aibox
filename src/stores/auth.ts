import { LoginResponse } from '../services/api';

interface AuthState {
  user: LoginResponse['user'] | null;
  token: string | null;
  isAuthenticated: boolean;
}

class AuthStore {
  private state: AuthState = {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
  };

  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getState() {
    return this.state;
  }

  login(user: LoginResponse['user'], token: string) {
    this.state = { user, token, isAuthenticated: true };
    localStorage.setItem('token', token);
    this.notify();
  }

  logout() {
    this.state = { user: null, token: null, isAuthenticated: false };
    localStorage.removeItem('token');
    this.notify();
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }
}

export const authStore = new AuthStore();
