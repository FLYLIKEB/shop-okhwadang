'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/components/ui/utils';

/**
 * 헤더 아래 좌측에 fixed로 표시되는 원형 뒤로가기 버튼.
 * 홈(/)이 아닌 페이지에서만 표시.
 */
export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === '/' || /^\/(ko|en)\/?$/.test(pathname);
  if (isHome) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="뒤로가기"
      className={cn(
        'fixed left-4 top-[72px] z-10',
        'flex h-9 w-9 items-center justify-center rounded-full',
        'bg-background/80 backdrop-blur-sm border border-border shadow-sm',
        'text-foreground/70 hover:text-foreground hover:bg-muted',
        'transition-all duration-200 active:scale-95',
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
