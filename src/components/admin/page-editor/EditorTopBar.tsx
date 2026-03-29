'use client';

import { useState } from 'react';
import { Eye, Save, Trash2, Info, ExternalLink } from 'lucide-react';

interface EditorTopBarProps {
  title: string;
  slug: string;
  isPublished: boolean;
  hasChanges: boolean;
  saving: boolean;
  onTitleChange: (title: string) => void;
  onSlugChange: (slug: string) => void;
  onTogglePublish: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

export default function EditorTopBar({
  title,
  slug,
  isPublished,
  hasChanges,
  saving,
  onTitleChange,
  onSlugChange,
  onTogglePublish,
  onSave,
  onDelete,
  onPreview,
}: EditorTopBarProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [slugValue, setSlugValue] = useState(slug);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== title) {
      onTitleChange(titleValue.trim());
    } else {
      setTitleValue(title);
    }
  };

  const handleSlugBlur = () => {
    setEditingSlug(false);
    const cleaned = slugValue
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (cleaned && cleaned !== slug) {
      if (isPublished && !window.confirm('⚠️ 이미 공개된 페이지의 URL을 변경하면 기존 링크가 모두 깨집니다.\n계속 변경하시겠습니까?')) {
        setSlugValue(slug);
        return;
      }
      onSlugChange(cleaned);
      setSlugValue(cleaned);
    } else {
      setSlugValue(slug);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, onBlur: () => void) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    else if (e.key === 'Escape') onBlur();
  };

  return (
    <div className="border-b bg-background px-4 py-3 space-y-2">
      {/* 제목 + 액션 버튼 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => handleKeyDown(e, handleTitleBlur)}
              autoFocus
              className="w-full rounded border border-input px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setTitleValue(title); setEditingTitle(true); }}
              className="text-lg font-semibold hover:text-muted-foreground truncate max-w-full"
              title="클릭하여 페이지 제목 편집"
            >
              {title}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onTogglePublish}
          title={isPublished ? '클릭하면 비공개로 전환됩니다 — 방문자에게 보이지 않게 됩니다' : '클릭하면 공개됩니다 — 실제 쇼핑몰에 노출됩니다'}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            isPublished
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-muted text-muted-foreground hover:bg-yellow-100 hover:text-yellow-700'
          }`}
        >
          {isPublished ? '● 공개 중' : '○ 비공개'}
        </button>

        <button
          type="button"
          onClick={onPreview}
          title="저장하기 전에 페이지가 어떻게 보일지 미리 확인합니다"
          className="flex shrink-0 items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <Eye className="h-4 w-4" />
          미리보기
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges || saving}
          title={hasChanges ? '변경사항을 저장합니다' : '저장할 변경사항이 없습니다'}
          className="flex shrink-0 items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : hasChanges ? '저장 *' : '저장'}
        </button>

        <button
          type="button"
          onClick={onDelete}
          title="이 페이지를 완전히 삭제합니다 (복구 불가)"
          className="shrink-0 rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* slug 편집 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0">URL 주소:</span>
        <span className="shrink-0 text-muted-foreground">p/</span>
        {editingSlug ? (
          <input
            type="text"
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value)}
            onBlur={handleSlugBlur}
            onKeyDown={(e) => handleKeyDown(e, handleSlugBlur)}
            autoFocus
            placeholder="영문·숫자·하이픈만 허용"
            className="rounded border border-input px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setSlugValue(slug); setEditingSlug(true); }}
            title="클릭하여 URL 주소(slug) 편집 — 영문·숫자·하이픈만 사용 가능"
            className="rounded bg-muted px-1.5 py-0.5 font-mono hover:bg-muted/70"
          >
            {slug || '(없음 — 클릭하여 입력)'}
          </button>
        )}
        <span className="text-muted-foreground/60">← 쇼핑몰 접근 주소: /p/{slug || '...'}</span>
        {slug && (
          <a
            href={`/p/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title="새 탭에서 페이지 열기"
            className="ml-1 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-primary hover:bg-muted"
          >
            <ExternalLink className="h-3 w-3" />
            페이지 열기
          </a>
        )}
      </div>
    </div>
  );
}
