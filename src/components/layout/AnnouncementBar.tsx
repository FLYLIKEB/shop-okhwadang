'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

const ANNOUNCEMENTS = [
  { id: 1, label: '옥화당 핸드메이드 차茶', href: '/collection' },
  { id: 2, label: '다실 도자기 특가', href: '/products?isFeatured=true' },
  { id: 3, label: '신상품 입고', href: '/products?sort=latest' },
];

export default function AnnouncementBar() {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="bg-[#1A1815] border-b border-border/50">
      <div className="flex items-center justify-between px-20">
        {ANNOUNCEMENTS.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}${item.href}`}
            className="flex items-center py-2.5 px-6 text-sm transition-colors hover:text-[#D4BC8E] text-[#F5F3EF]/80"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}