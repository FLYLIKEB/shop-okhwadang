'use client';

import { useRouter } from 'next/navigation';
import EmptyState from '@/components/EmptyState';

export default function ProductErrorState() {
  const router = useRouter();
  return (
    <EmptyState
      title="상품을 불러올 수 없습니다"
      description="잠시 후 다시 시도해주세요."
      action={{ label: '다시 시도', onClick: () => router.refresh() }}
    />
  );
}
