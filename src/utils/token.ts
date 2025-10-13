import { User } from '@/types/User';

export function getToken(): string | null {
  return sessionStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  sessionStorage.setItem('auth_token', token);
}

export function removeToken(): void {
  sessionStorage.removeItem('auth_token');
}

export function getUserFromStorage(): User | null {
  const user = sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function setUserInStorage(user: User): void {
  sessionStorage.setItem('user', JSON.stringify(user));
}

export function removeUserFromStorage(): void {
  sessionStorage.removeItem('user');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
