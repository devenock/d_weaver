import { apiRequest } from "./api";

export interface ApiUser {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

export interface LoginResult {
  user: ApiUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterResult {
  user: ApiUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RefreshResult {
  user: ApiUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string): Promise<RegisterResult> {
  return apiRequest<RegisterResult>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function refresh(refreshToken: string): Promise<RefreshResult> {
  return apiRequest<RefreshResult>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<void>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiRequest<void>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}
