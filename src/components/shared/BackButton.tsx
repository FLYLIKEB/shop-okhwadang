'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';

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
    <Button
      type="button"
      variant="gray"
      size="icon"
      onClick={() => router.back()}
      aria-label={localMessage('ui.back')}
      className={cn('fixed left-4 top-[4.5rem] z-10 h-9 min-h-9 w-9', 'text-foreground/70 hover:text-foreground')}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
