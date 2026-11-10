'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function useAdminGuard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !isAdminRole(user.role))) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // middleware.ts가 /admin 진입 시 관리자 JWT를 이미 검증했고 API도 서버에서 권한을 검사한다.
  // /auth/me 응답(약 1초)을 기다리지 않고 데이터 로딩을 먼저 시작하기 위해 로딩 중에는 허용한다.
  const isAdmin = isLoading || (!!user && isAdminRole(user.role));

  return { user, isLoading, isAdmin };
}
