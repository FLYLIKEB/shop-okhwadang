'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

const ANNOUNCEMENTS = [
  { id: 1, label: '웨지우드와 보내는 신생활', href: '/event/wedgwood-new-life' },
  { id: 2, label: '애프터눈 티', href: '/event/afternoon-tea' },
  { id: 3, label: '리틀 사무라이 시리즈', href: '/event/little-samurai' },
];

export default function AnnouncementBar() {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="bg-[#1A1815] border-b border-border/50">
      <div className="mx-auto flex max-w-7xl items-center justify-center">
        {ANNOUNCEMENTS.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}${item.href}`}
            className="flex items-center py-2.5 px-4 text-sm transition-colors hover:text-[#D4BC8E] text-[#F5F3EF]/80"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}