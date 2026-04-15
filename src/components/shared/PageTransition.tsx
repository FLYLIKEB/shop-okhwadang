'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/utils';

/**
 * 먹색 오버레이 페이지 전환 효과
 * 라우트 변경 시 먹색이 스르르 덮였다 벗겨지는 트랜지션
 */
export default function PageTransition() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [phase, setPhase] = useState<'idle' | 'cover' | 'reveal'>('idle');

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    setPhase('cover');

    const revealTimer = setTimeout(() => setPhase('reveal'), 400);
    const idleTimer = setTimeout(() => setPhase('idle'), 900);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(idleTimer);
    };
  }, [pathname]);

  if (phase === 'idle') return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] pointer-events-none bg-[#2A2520]',
        phase === 'cover' && 'page-transition-cover',
        phase === 'reveal' && 'page-transition-reveal',
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-2xl tracking-widest text-[#B8976A]/60">
          茶
        </span>
      </div>
    </div>
  );
}
