'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

const ANNOUNCEMENTS = [
  { id: 1, label: '옥화당 핸드메이드 차茶', href: '/collection' },
  { id: 2, label: '자사호 · 보이차 · 다구', href: '/products?isFeatured=true' },
  { id: 3, label: '신상품 입고', href: '/products?sort=latest' },
];

export default function AnnouncementBar() {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="bg-primary border-b border-border">
      <div className="flex items-center justify-between px-6 md:px-20">
        {ANNOUNCEMENTS.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}${item.href}`}
            className="flex items-center py-2 px-4 text-sm transition-colors hover:opacity-70 text-primary-foreground"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
