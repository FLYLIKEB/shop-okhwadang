interface LogoProps {
  /** 히어로용 큰 사이즈 vs 헤더용 작은 사이즈 */
  variant?: 'hero' | 'header';
  className?: string;
}

const BRAND_NAME = '옥화당';

export default function Logo({ variant = 'header', className }: LogoProps) {
  if (variant === 'hero') {
    return (
      <span
        className={`font-display typo-h3 font-bold tracking-tight text-white ${className ?? ''}`}
      >
        {BRAND_NAME}
      </span>
    );
  }

  return (
    <span className={`font-display typo-h3 font-bold tracking-tight text-foreground ${className ?? ''}`}>
      {BRAND_NAME}
    </span>
  );
}
