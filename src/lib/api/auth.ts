import { apiClient, _setRefreshFn } from './core';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
}

export interface AuthTokenResponse {
  user: AuthUser;
}

export interface RefreshResponse {
  message: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthTokenResponse>('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    apiClient.post<AuthTokenResponse>('/auth/register', { email, password, name }),
  me: () => apiClient.get<AuthUser>('/auth/me'),
  profile: () => apiClient.get<AuthUser>('/auth/profile'),
  refresh: () =>
    apiClient.post<RefreshResponse>('/auth/refresh'),
  logout: () => apiClient.post<{ message: string }>('/auth/logout'),
  kakaoCallback: (code: string) =>
    apiClient.post<AuthTokenResponse>('/auth/kakao', { code }),
  googleCallback: (code: string) =>
    apiClient.post<AuthTokenResponse>('/auth/google', { code }),
};

// Register the refresh function after authApi is created
_setRefreshFn(() => authApi.refresh());
