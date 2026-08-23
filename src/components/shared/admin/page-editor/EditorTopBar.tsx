'use client';

import { useState } from 'react';
import { Eye, Save, Trash2, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';

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
    <div className="cms-editor__topbar surface-card space-y-3 rounded-none border-0 border-b border-soft px-5 py-4">
      {/* 제목 + 액션 버튼 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <FormInput
              id="page-title"
              type="text"
              label="페이지 제목"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => handleKeyDown(e, handleTitleBlur)}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => { setTitleValue(title); setEditingTitle(true); }}
              className="max-w-full truncate typo-h2 font-display font-semibold hover:text-muted-foreground"
              title="클릭하여 페이지 제목 편집"
            >
              {title}
            </button>
          )}
        </div>

        <Button
          type="button"
          variant={isPublished ? 'secondary' : 'outline'}
          size="sm"
          onClick={onTogglePublish}
          title={isPublished ? '클릭하면 비공개로 전환됩니다 — 방문자에게 보이지 않게 됩니다' : '클릭하면 공개됩니다 — 실제 쇼핑몰에 노출됩니다'}
        >
          {isPublished ? '● 공개 중' : '○ 비공개'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPreview}
          aria-label="미리보기"
          title="저장하기 전에 페이지가 어떻게 보일지 미리 확인합니다"
        >
          <Eye className="h-4 w-4" />
          미리보기
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={!hasChanges || saving}
          aria-label="저장"
          title={hasChanges ? '변경사항을 저장합니다' : '저장할 변경사항이 없습니다'}
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : hasChanges ? '저장 *' : '저장'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title="이 페이지를 완전히 삭제합니다 (복구 불가)"
          className="h-10 min-h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* slug 편집 */}
      <div className="flex flex-wrap items-center gap-2 typo-body-sm text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0">URL 주소:</span>
        <span className="shrink-0 text-muted-foreground">p/</span>
        {editingSlug ? (
          <FormInput
            id="page-slug"
            type="text"
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value)}
            onBlur={handleSlugBlur}
            onKeyDown={(e) => handleKeyDown(e, handleSlugBlur)}
            autoFocus
            placeholder="영문·숫자·하이픈만 허용"
            className="h-9 min-h-9 w-48 rounded-lg px-2 py-1 typo-body-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setSlugValue(slug); setEditingSlug(true); }}
            title="클릭하여 URL 주소(slug) 편집 — 영문·숫자·하이픈만 사용 가능"
            className="field-soft rounded-lg border border-soft px-2 py-1 font-mono typo-body-sm hover:bg-muted/70"
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
            className="ml-1 flex items-center gap-1 rounded-lg px-2 py-1 typo-body-sm text-primary hover:bg-muted"
          >
            <ExternalLink className="h-3 w-3" />
            페이지 열기
          </a>
        )}
      </div>
    </div>
  );
}
