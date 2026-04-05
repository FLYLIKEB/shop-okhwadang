import Image from 'next/image';

interface LogoProps {
  /** 히어로용 큰 사이즈 vs 헤더용 작은 사이즈 */
  variant?: 'hero' | 'header';
  className?: string;
}

export default function Logo({ variant = 'header', className }: LogoProps) {
  const size = variant === 'hero' ? { width: 200, height: 56 } : { width: 140, height: 40 };

  return (
    <Image
      src="/logo-okhwadang.png"
      alt="옥화당"
      {...size}
      className={`object-contain ${variant === 'hero' ? 'brightness-0 invert' : ''} ${className ?? ''}`}
      priority
    />
  );
}
