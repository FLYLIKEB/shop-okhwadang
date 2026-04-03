'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { inquiriesApi, pagesApi } from '@/lib/api';
import type { PageBlock } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { handleApiError } from '@/utils/error';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { SkeletonBox } from '@/components/ui/Skeleton';

const INQUIRY_TYPES = ['상품', '배송', '결제', '교환/반품', '기타'];

export default function ContactPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [type, setType] = useState(INQUIRY_TYPES[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { execute: loadPage, isLoading } = useAsyncAction(
    async () => {
      const page = await pagesApi.getBySlug('contact');
      if (page?.blocks) setBlocks(page.blocks);
    },
    { errorMessage: '페이지를 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await inquiriesApi.create({ type, title: title.trim(), content: content.trim() });
      toast.success('문의가 접수되었습니다.');
      setTitle('');
      setContent('');
      setType(INQUIRY_TYPES[0]);
    } catch (err) {
      toast.error(handleApiError(err, '문의 접수에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {isLoading ? (
        <div className="max-w-2xl mx-auto px-4 py-10">
          <SkeletonBox className="h-8 w-48 mb-4" />
          <SkeletonBox className="h-24" />
        </div>
      ) : blocks.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4">
          <BlockRenderer blocks={blocks} />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 pt-10">
          <h1 className="typo-h1 mb-2">문의하기</h1>
          <p className="typo-body text-muted-foreground mb-8">
            궁금한 점이 있으시면 아래 양식을 통해 문의해주세요.
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="typo-h2 mb-8">1:1 문의</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block typo-body-sm font-medium text-foreground mb-1.5">문의 유형</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2.5 typo-body-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {INQUIRY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block typo-body-sm font-medium text-foreground mb-1.5">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder="문의 제목을 입력해주세요"
              className="w-full border border-border rounded-md px-3 py-2.5 typo-body-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block typo-body-sm font-medium text-foreground mb-1.5">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="문의 내용을 자세히 입력해주세요"
              className="w-full border border-border rounded-md px-3 py-2.5 typo-body-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-foreground text-background rounded-md typo-button hover:bg-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '접수 중...' : '문의 접수'}
            </button>
            <Link
              href="/my/inquiries"
              className="flex-1 py-2.5 border border-border rounded-md typo-button text-foreground text-center hover:bg-muted transition-colors"
            >
              내 문의 확인
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
