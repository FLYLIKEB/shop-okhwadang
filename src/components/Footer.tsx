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
      className="text-sm text-[#F8F5F0]/60 hover:text-[#B8976A] transition-colors"
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
    <footer className="bg-[#2A2520] text-[#F8F5F0] mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-sm font-display font-medium text-[#B8976A] mb-4 tracking-wide">고객센터</p>
            <nav className="flex flex-col gap-2">
              {hasCmsData
                ? renderNavLinks(rootItems.slice(0, 4))
                : FALLBACK_LINKS.customerService.map((link) => (
                  <Link
                    key={link.id}
                    href={link.url}
                    className="text-sm text-[#F8F5F0]/60 hover:text-[#B8976A] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-display font-medium text-[#B8976A] mb-4 tracking-wide">회사</p>
            <nav className="flex flex-col gap-2">
              {hasCmsData
                ? renderNavLinks(rootItems.slice(4, 6))
                : FALLBACK_LINKS.company.map((link) => (
                  <Link
                    key={link.id}
                    href={link.url}
                    className="text-sm text-[#F8F5F0]/60 hover:text-[#B8976A] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-display font-medium text-[#B8976A] mb-4 tracking-wide">쇼핑</p>
            <nav className="flex flex-col gap-2">
              {hasCmsData
                ? renderNavLinks(rootItems.slice(6, 10))
                : FALLBACK_LINKS.shop.map((link) => (
                  <Link
                    key={link.id}
                    href={link.url}
                    className="text-sm text-[#F8F5F0]/60 hover:text-[#B8976A] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
            </nav>
          </div>

          <div className="col-span-2 md:col-span-1">
            <Image src="/logo-okhwadang.png" alt="옥화당" width={120} height={34} className="object-contain mb-4" />
            <p className="font-display text-sm text-[#F8F5F0]/70 leading-relaxed mt-3">
              한 잔의 차에 담긴 고요,<br />
              장인의 손끝에서 시작된 이야기.
            </p>
            <div className="flex flex-col gap-1 text-sm text-[#F8F5F0]/40 mt-4">
              <p className="font-display">자사호 · 보이차 · 다구 전문</p>
            </div>
          </div>
        </div>

        {/* 한문 캘리그래피 브랜드 마크 */}
        <div className="mt-12 pt-8 border-t border-[#F8F5F0]/10 flex flex-col items-center gap-4">
          <p className="font-display text-3xl tracking-[0.3em] text-[#B8976A]/50">
            以壺載道
          </p>
          <p className="text-xs text-[#F8F5F0]/30 tracking-widest">
            호에 도를 싣다 — 옥화당의 철학
          </p>
          <p className="text-sm text-[#F8F5F0]/40 mt-2">
            &copy; {new Date().getFullYear()} 옥화당. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
