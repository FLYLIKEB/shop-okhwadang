'use client';

import type { ReactNode } from 'react';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';

interface BlockRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function BlockReveal({ children, delay = 0, className = '' }: BlockRevealProps) {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.55s ease-out ${delay}ms, transform 0.55s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
