'use client';

import Image from 'next/image';

interface LogoProps {
  variant?: 'hero' | 'header';
  className?: string;
  alt?: string;
  priority?: boolean;
}

export default function Logo({ variant = 'header', className, alt = '옥화당', priority = true }: LogoProps) {
  const size = variant === 'hero' ? { width: 200, height: 56 } : { width: 140, height: 40 };

  return (
    <Image
      src="/logo-okhwadang.png"
      alt={alt}
      {...size}
      style={{ height: 'auto' }}
      className={`object-contain ${variant === 'hero' ? 'brightness-0 invert' : ''} ${className ?? ''}`}
      priority={priority}
    />
  );
}
