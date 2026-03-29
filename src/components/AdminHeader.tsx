'use client';

import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/components/ui/utils';

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  super_admin: '최고관리자',
};

type AdminHeaderProps = {
  onMenuClick: () => void;
};

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAuth();

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '';

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">Commerce Admin</span>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm">{user.name}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                user.role === 'super_admin'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800',
              )}
            >
              {roleLabel}
            </span>
          </>
        )}
        <button
          onClick={() => void logout()}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
