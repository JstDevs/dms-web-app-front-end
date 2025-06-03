import { User } from "@/types/User";

const API_BASE = "https://your-api.com/api";

interface LoginResponse {
  token: string;
  user: User;
}

export async function fetchLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Login failed");
  }

  const data = await response.json();
  return data;
}

export function logoutUser() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
}
