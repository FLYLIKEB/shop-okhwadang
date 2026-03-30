'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithKakao: () => void;
  loginWithGoogle: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function generateState(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((profile) => {
        setUser(profile);
        setIsLoading(false);
      })
      .catch(() => {
        // Access token expired — try refresh
        authApi
          .refresh()
          .then(() => authApi.me())
          .then((profile) => setUser(profile))
          .catch(() => setUser(null))
          .finally(() => setIsLoading(false));
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    toast.success('로그인되었습니다.');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore server errors on logout
    }
    setUser(null);
    toast.success('로그아웃되었습니다.');
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    await authApi.register(email, password, name);
    toast.success('회원가입이 완료되었습니다. 로그인해 주세요.');
  }, []);

  const loginWithKakao = useCallback(() => {
    const state = generateState();
    sessionStorage.setItem('oauth_state', state);
    const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? '';
    const redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI ?? '';
    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    window.location.href = url;
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const loginWithGoogle = useCallback(() => {
    const state = generateState();
    sessionStorage.setItem('oauth_state', state);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? '';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
    window.location.href = url;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, register, loginWithKakao, loginWithGoogle, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
