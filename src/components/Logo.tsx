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
        className={`font-display-ko font-bold text-white ${className ?? ''}`}
        style={{
          fontSize: 'clamp(2rem, 5vw, 4rem)',
          textShadow: '0 1px 16px rgba(0,0,0,0.25)',
        }}
      >
        {BRAND_NAME}
      </span>
    );
  }

  return (
    <span className={`font-display-ko text-xl font-bold tracking-tight text-foreground ${className ?? ''}`}>
      {BRAND_NAME}
    </span>
  );
}
