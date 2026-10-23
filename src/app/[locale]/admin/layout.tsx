'use client';

import { localMessage } from '@/utils/localMessages';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminHeader } from '@/components/AdminHeader';
import { AdminContextGuide } from '@/components/shared/admin/AdminGuide';
import { getAdminGuideTopic } from '@/lib/admin-guide';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const guideTopic = getAdminGuideTopic(pathname);
  const canSeeGuideTopic = guideTopic && (!guideTopic.superAdminOnly || user?.role === 'super_admin');

  // Server-side auth check is handled by middleware.ts
  // This client-side check is defense-in-depth for role verification
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">{localMessage('common.loading')}</span>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <div className="toss-admin flex h-screen overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {canSeeGuideTopic && <AdminContextGuide key={pathname} topic={guideTopic} />}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
