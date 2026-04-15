'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { promotionsApi } from '@/lib/api';
import type { Promotion } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import CountdownTimer from '@/components/shared/home/CountdownTimer';

const TYPE_LABELS: Record<Promotion['type'], string> = {
  timesale: '타임세일',
  exhibition: '기획전',
  event: '이벤트',
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { execute: loadPromotion, isLoading: loading } = useAsyncAction(
    async () => {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        setNotFound(true);
        return;
      }
      const data = await promotionsApi.getOne(numericId);
      setPromotion(data);
    },
    { onError: () => setNotFound(true) },
  );

  useEffect(() => {
    void loadPromotion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <SkeletonBox className="h-8 w-48 rounded" />
        <SkeletonBox className="h-64 rounded-xl" />
        <SkeletonBox className="h-6 w-full rounded" />
        <SkeletonBox className="h-6 w-3/4 rounded" />
      </div>
    );
  }

  if (notFound || !promotion) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">프로모션을 찾을 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 underline"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-4 flex items-center gap-1 hover:text-gray-800 transition-colors"
      >
        ← 목록으로
      </button>

      <div className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 mb-3">
        {TYPE_LABELS[promotion.type]}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{promotion.title}</h1>

      {promotion.discountRate && (
        <p className="text-red-500 font-bold text-lg mb-2">{promotion.discountRate}% 할인</p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-6">
        <span>
          {new Date(promotion.startsAt).toLocaleDateString('ko-KR')} ~{' '}
          {new Date(promotion.endsAt).toLocaleDateString('ko-KR')}
        </span>
        {promotion.type === 'timesale' && (
          <span className="flex items-center gap-1">
            남은 시간: <CountdownTimer endsAt={promotion.endsAt} />
          </span>
        )}
      </div>

      {promotion.imageUrl && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 mb-6">
          <Image
            src={promotion.imageUrl}
            alt={promotion.title}
            fill
            className="object-cover"
            sizes="(max-width: 672px) 100vw, 672px"
          />
        </div>
      )}

      {promotion.description && (
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{promotion.description}</p>
      )}
    </div>
  );
}
