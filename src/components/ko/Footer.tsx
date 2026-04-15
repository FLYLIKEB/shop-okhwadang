'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useNavigation } from '@/components/shared/hooks/useNavigation';
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
    <footer className="bg-[#1A1815] text-[#F8F5F0] mt-auto">
      <div className="mx-auto max-w-8xl px-4 md:px-20 py-12">
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
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://instagram.com/okhwadang"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="인스타그램"
                className="text-[#F8F5F0]/60 hover:text-[#B8976A] transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://smartstore.naver.com/okhwadang"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="네이버 스마트스토어"
                className="text-[#F8F5F0]/60 hover:text-[#B8976A] transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.327 12.247c-.047.341-.33.594-.618.546C.32 12.7 0 12.37 0 11.979V2.025C0 .914.914 0 2.025 0h19.95C22.086 0 23 .914 23 2.025v19.95c0 1.111-.914 2.025-2.025 2.025H2.025C.914 24 0 23.086 0 21.975v-1.728c0-.391.32-.721.709-.814.288-.048.571.205.618.546l.655 4.75c.047.341-.207.721-.594.814a.714.714 0 0 1-.372.032C.3 24.565 0 24.325 0 23.928v-1.728c0-.698.572-1.264 1.275-1.264h18.45c.703 0 1.275.566 1.275 1.264v1.728c0 .397-.3.637-.716.575a.717.717 0 0 1-.372-.032c-.387-.093-.641-.473-.594-.814l.655-4.75zm11.872 7.978c-1.675 0-3.037-1.365-3.037-3.04 0-1.675 1.362-3.04 3.037-3.04 1.676 0 3.038 1.365 3.038 3.04 0 1.675-1.362 3.04-3.038 3.04z"/>
                </svg>
              </a>
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
