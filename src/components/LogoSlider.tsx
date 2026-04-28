'use client';

import { useEffect, useState } from 'react';

/**
 * 히어로 섹션 위에 fixed로 표시되는 브랜드 워드마크.
 * 히어로가 스크롤로 사라지면 함께 페이드아웃되고,
 * 헤더의 로고가 페이드인되어 자연스럽게 이어진다.
 */
export default function LogoSlider() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const { isPast } = (e as CustomEvent<{ isPast: boolean }>).detail;
      setVisible(!isPast);
    };
    document.addEventListener('hero-visibility', handler);
    return () => document.removeEventListener('hero-visibility', handler);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '24px',
        top: '16px',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display, serif)',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'white',
          letterSpacing: '-0.02em',
          textShadow: '0 1px 8px rgba(0,0,0,0.4)',
        }}
      >
        옥화당
      </span>
    </div>
  );
}
