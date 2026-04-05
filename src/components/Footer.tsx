'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationItem } from '@/lib/api';

const FALLBACK_LINKS = {
  customerService: [
    { id: -1, label: '고객센터', url: '/pages/support' },
    { id: -2, label: '자주 묻는 질문', url: '/faq' },
    { id: -3, label: '배송 안내', url: '/pages/shipping' },
    { id: -4, label: '반품 및 교환', url: '/pages/returns' },
  ],
  company: [
    { id: -5, label: '이용약관', url: '/pages/terms' },
    { id: -6, label: '개인정보처리방침', url: '/pages/privacy' },
  ],
  shop: [
    { id: -7, label: '전체 상품', url: '/products' },
    { id: -8, label: '컬렉션', url: '/collection' },
    { id: -9, label: 'Archive', url: '/archive' },
    { id: -10, label: 'Journal', url: '/journal' },
  ],
};

function renderNavLinks(items: NavigationItem[]) {
  return items.map((item) => (
    <Link
      key={item.id}
      href={item.url}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {item.label}
    </Link>
  ));
}

export default function Footer() {
  const { items: footerItems } = useNavigation('footer');
  const hasCmsData = footerItems.length > 0;
  const rootItems = hasCmsData ? footerItems.filter((item) => item.parent_id === null) : [];

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-sm font-medium text-foreground mb-4">고객센터</p>
            <nav className="flex flex-col gap-2">
              {hasCmsData
                ? renderNavLinks(rootItems.slice(0, 4))
                : FALLBACK_LINKS.customerService.map((link) => (
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
              {hasCmsData
                ? renderNavLinks(rootItems.slice(4, 6))
                : FALLBACK_LINKS.company.map((link) => (
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
              {hasCmsData
                ? renderNavLinks(rootItems.slice(6, 10))
                : FALLBACK_LINKS.shop.map((link) => (
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
            <Image src="/logo-okhwadang.png" alt="옥화당" width={120} height={34} className="object-contain mb-4" />
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>자사호 · 보이차 · 다구</p>
              <p>전문 쇼핑몰</p>
            </div>
          </div>
        </div>

        {/* 공방 서명/낙관 영역 */}
        <div className="mt-12 pt-8 border-t border-dashed border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="font-display text-2xl text-foreground/80 tracking-wide">옥화당</span>
              <span className="text-muted-foreground/40 text-lg">|</span>
              <span className="font-display text-lg text-muted-foreground/50">玉華堂</span>
            </div>
            <div className="font-mono text-xs text-muted-foreground text-center md:text-right space-y-0.5 tracking-wide">
              <p>&copy; {new Date().getFullYear()} OKHWADANG. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
