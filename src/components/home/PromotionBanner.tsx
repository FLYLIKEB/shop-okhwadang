'use client';

import Link from 'next/link';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export default function PromotionBanner() {
  const { ref, visible } = useScrollAnimation<HTMLElement>();

  const items = [
    <p
      key="label"
      className={`text-sm tracking-widest text-muted-foreground uppercase mb-3 transition-all duration-600 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: visible ? '0ms' : undefined }}
    >
      Special Offer
    </p>,
    <h3
      key="title"
      className={`text-2xl font-medium mb-2 transition-all duration-600 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: visible ? '100ms' : undefined }}
    >
      지금 바로 쇼핑하세요
    </h3>,
    <p
      key="desc"
      className={`text-muted-foreground text-sm mb-6 transition-all duration-600 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: visible ? '200ms' : undefined }}
    >
      다양한 상품을 둘러보세요
    </p>,
    <Link
      key="cta"
      href="/products"
      className={`inline-block border border-foreground px-8 py-3 text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors duration-600 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: visible ? '300ms' : undefined }}
    >
      쇼핑하기
    </Link>,
  ];

  return (
    <section ref={ref} className="py-12 border-t border-b border-border">
      <div className="text-center">{items}</div>
    </section>
  );
}
