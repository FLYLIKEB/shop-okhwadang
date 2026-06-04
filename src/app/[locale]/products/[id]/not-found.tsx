'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function NotFound() {
  const { locale } = useParams<{ locale?: string }>();
  const isEn = locale === 'en';

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <h2 className="text-xl font-semibold text-foreground">
        {isEn ? 'Product not found.' : '상품을 찾을 수 없습니다.'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {isEn
          ? 'The product you requested does not exist or has been deleted.'
          : '요청하신 상품이 존재하지 않거나 삭제되었습니다.'}
      </p>
      <Link href={isEn ? '/en' : '/'} className="text-sm text-primary underline-offset-4 hover:underline">
        {isEn ? 'Home' : '홈으로'}
      </Link>
    </div>
  );
}
