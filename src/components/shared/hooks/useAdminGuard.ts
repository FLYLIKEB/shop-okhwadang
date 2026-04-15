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

  const isAdmin = !!user && isAdminRole(user.role);

  return { user, isLoading, isAdmin };
}
