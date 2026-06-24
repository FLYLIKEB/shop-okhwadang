'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { cn } from '@/components/ui/utils';

interface LogoProps {
  variant?: 'hero' | 'header';
  className?: string;
}

export default function Logo({ variant = 'header', className }: LogoProps) {
  const locale = useLocale();
  const size = variant === 'hero' ? { width: 200, height: 56 } : { width: 140, height: 40 };

  if (locale === 'en') {
    return (
      <span
        className={cn(
          'font-display text-xl font-semibold tracking-tight text-foreground',
          variant === 'hero' && 'text-3xl text-white',
          className,
        )}
        aria-label="Ockhwadang"
      >
        Ockhwadang
      </span>
    );
  }

  return (
    <Image
      src="/logo-okhwadang.png"
      alt="옥화당"
      {...size}
      style={{ height: 'auto' }}
      className={`object-contain ${variant === 'hero' ? 'brightness-0 invert' : ''} ${className ?? ''}`}
      priority
    />
  );
}
