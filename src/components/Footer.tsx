'use client';

import Link from 'next/link';
import { useNavigation } from '@/hooks/useNavigation';

const FALLBACK_LINKS = {
  customerService: [
    { id: -1, label: '고객센터', url: '/support' },
    { id: -2, label: '자주 묻는 질문', url: '/faq' },
    { id: -3, label: '배송 안내', url: '/shipping' },
    { id: -4, label: '반품 및 교환', url: '/returns' },
  ],
  company: [
    { id: -5, label: '이용약관', url: '/terms' },
    { id: -6, label: '개인정보처리방침', url: '/privacy' },
  ],
  shop: [
    { id: -7, label: '전체 상품', url: '/products' },
    { id: -8, label: '신상품', url: '/products?sort=new' },
    { id: -9, label: '인기 상품', url: '/products?sort=popular' },
    { id: -10, label: '세일', url: '/products?sale=true' },
  ],
};

export default function Footer() {
  const { items: footerItems } = useNavigation('footer');

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-sm font-medium text-foreground mb-4">고객센터</p>
            <nav className="flex flex-col gap-2">
              {FALLBACK_LINKS.customerService.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-4">회사</p>
            <nav className="flex flex-col gap-2">
              {FALLBACK_LINKS.company.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-4">쇼핑</p>
            <nav className="flex flex-col gap-2">
              {FALLBACK_LINKS.shop.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-4">옥화당</p>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>자사호 · 보이차 · 다구</p>
              <p>전문 쇼핑몰</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} 옥화당. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
