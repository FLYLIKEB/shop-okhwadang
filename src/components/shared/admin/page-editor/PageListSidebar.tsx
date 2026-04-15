'use client';

import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { Page } from '@/lib/api';

interface PageListSidebarProps {
  pages: Page[];
  selectedPageId: number | null;
  onSelectPage: (page: Page) => void;
  onCreatePage: (title: string, slug: string) => Promise<void>;
}

export default function PageListSidebar({
  pages,
  selectedPageId,
  onSelectPage,
  onCreatePage,
}: PageListSidebarProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    setCreating(true);
    try {
      await onCreatePage(title.trim(), slug.trim());
      setTitle('');
      setSlug('');
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">페이지 목록</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="새 페이지"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border-b p-3 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="페이지 제목"
            required
            className="w-full rounded-md border border-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            required
            className="w-full rounded-md border border-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 rounded-md bg-foreground px-3 py-1.5 text-xs text-background hover:opacity-90 disabled:opacity-50"
            >
              {creating ? '생성 중...' : '생성'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* 사용 안내 */}
      <div className="border-b px-4 py-3 bg-muted/40 space-y-1.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">📄 페이지 관리란?</p>
        <p>쇼핑몰에 표시될 페이지(홈, 이벤트 등)의 구성을 직접 편집하는 기능입니다.</p>
        <ul className="space-y-1 mt-1 list-none">
          <li>➕ 우측 상단 <b>+</b> 버튼으로 새 페이지 생성</li>
          <li>✏️ 페이지 선택 후 블록을 추가·편집·삭제</li>
          <li>👁 <b>미리보기</b>로 변경 전 확인</li>
          <li>💾 <b>저장</b> 후 <b>공개</b>로 전환해야 쇼핑몰에 반영</li>
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {pages.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            페이지가 없습니다.<br />
            <span className="text-xs">위 + 버튼으로 생성하세요</span>
          </p>
        ) : (
          <ul className="space-y-0.5 px-2">
            {pages.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onSelectPage(page)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    selectedPageId === page.id
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{page.title}</span>
                  {!page.is_published && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      비공개
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
