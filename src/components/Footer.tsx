'use client';

import Link from 'next/link';
import { useNavigation } from '@/hooks/useNavigation';

const FALLBACK_LINKS = [
  { id: -1, label: '이용약관', url: '/terms' },
  { id: -2, label: '개인정보처리방침', url: '/privacy' },
  { id: -3, label: '고객센터', url: '/support' },
];

export default function Footer() {
  const { items: footerItems } = useNavigation('footer');
  const links = footerItems.length > 0 ? footerItems : FALLBACK_LINKS;

  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Commerce Demo</p>
            <p>사업자번호: 000-00-00000</p>
            <p>대표자: 홍길동</p>
            <p>주소: 서울특별시 강남구</p>
          </div>

          <nav aria-label="푸터 링크" className="flex flex-col gap-2 md:flex-row md:gap-6">
            {links.map((link) => (
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

        <div className="mt-6 border-t pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Commerce Demo. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
