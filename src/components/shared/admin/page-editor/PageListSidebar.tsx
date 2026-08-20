'use client';

import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { Page } from '@/lib/api';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';

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
    <aside className="cms-editor__sidebar surface-card flex w-64 shrink-0 flex-col rounded-none border-0 border-r border-soft shadow-none">
      <div className="flex items-center justify-between border-b border-soft px-4 py-4">
        <h2 className="typo-body font-semibold">페이지 목록</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowForm(!showForm)}
          aria-label="새 페이지"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-soft p-4">
          <FormInput
            id="new-page-title"
            label="페이지 제목"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="페이지 제목"
            required
          />
          <FormInput
            id="new-page-slug"
            label="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="영문·숫자·하이픈"
            required
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={creating}
              size="sm"
              className="flex-1"
            >
              {creating ? '생성 중...' : '생성'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              취소
            </Button>
          </div>
        </form>
      )}

      {/* 사용 안내 */}
      <div className="mx-3 my-3 space-y-2 rounded-xl bg-muted/40 px-3 py-3 typo-body-sm text-muted-foreground">
        <p className="typo-label font-semibold text-foreground">페이지 관리</p>
        <p>쇼핑몰에 표시될 페이지의 구성을 직접 편집합니다.</p>
        <ul className="mt-2 list-none space-y-1">
          <li><b className="text-foreground">+</b> 새 페이지 생성</li>
          <li>블록을 추가·편집·삭제</li>
          <li><b className="text-foreground">미리보기</b>로 변경 전 확인</li>
          <li><b className="text-foreground">저장 후 공개</b>해야 쇼핑몰에 반영</li>
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {pages.length === 0 ? (
          <p className="px-4 py-8 text-center typo-body-sm text-muted-foreground">
            페이지가 없습니다.<br />
            <span className="typo-label">위 + 버튼으로 생성하세요</span>
          </p>
        ) : (
          <ul className="space-y-0.5 px-2">
            {pages.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onSelectPage(page)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left typo-body-sm transition-colors',
                    selectedPageId === page.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate font-medium">{page.title}</span>
                  {!page.is_published && (
                    <span className="shrink-0 rounded-lg bg-muted px-2 py-1 typo-label text-muted-foreground">
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
