import { User } from "@/types/User";

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("auth_token");
}

export function getUserFromStorage(): User | null {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function setUserInStorage(user: User): void {
  localStorage.setItem("user", JSON.stringify(user));
}

export function removeUserFromStorage(): void {
  localStorage.removeItem("user");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
