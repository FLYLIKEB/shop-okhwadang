'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { PageBlock } from '@/lib/api';

const BLOCK_TYPE_LABELS: Record<PageBlock['type'], string> = {
  hero_banner: '히어로 배너',
  product_grid: '상품 그리드',
  product_carousel: '상품 캐러셀',
  category_nav: '카테고리 내비',
  promotion_banner: '프로모션 배너',
  text_content: '텍스트',
  split_content: '분할 콘텐츠',
  brand_story: '브랜드 이야기',
  journal_preview: '저널 미리보기',
};

interface DraftBlock {
  id: number;
  type: PageBlock['type'];
  content: Record<string, unknown>;
  sort_order: number;
  is_visible: boolean;
  _isNew?: boolean;
  _isModified?: boolean;
}

interface SortableBlockItemProps {
  block: DraftBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

function getContentSummary(block: DraftBlock): string {
  const c = block.content;
  switch (block.type) {
    case 'hero_banner':
      return (c.title as string) || (c.subtitle as string) || '(내용 없음)';
    case 'product_grid':
      return `${(c.title as string) || '제목 없음'} · ${c.limit ?? 8}개 · ${c.template ?? '3col'}`;
    case 'product_carousel':
      return `${(c.title as string) || '제목 없음'} · ${c.limit ?? 8}개`;
    case 'category_nav':
      return `${c.template ?? 'text'} 스타일`;
    case 'promotion_banner':
      return (c.title as string) || (c.subtitle as string) || '(내용 없음)';
    case 'text_content': {
      const plain = ((c.html as string) ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return plain ? plain.slice(0, 30) + (plain.length > 30 ? '…' : '') : '(내용 없음)';
    }
    case 'split_content':
    case 'brand_story':
      return (c.title as string) || (c.description as string) || '(내용 없음)';
    case 'journal_preview':
      return `${(c.title as string) || '저널'} · ${c.limit ?? 6}개`;
  }
}

export default function SortableBlockItem({
  block,
  index,
  isSelected,
  onSelect,
  onDelete,
  onToggleVisibility,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = () => {
    if (window.confirm('이 블록을 삭제하시겠습니까?\n저장 전까지 되돌릴 수 없습니다.')) {
      onDelete();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'mb-2 flex items-center gap-2 rounded-md border bg-background px-3 py-2.5 transition-colors',
        isSelected && 'ring-2 ring-ring',
        isDragging && 'opacity-50',
      )}
    >
      <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
        {index}
      </span>

      <button
        type="button"
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="드래그하여 순서 변경"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col text-left min-w-0"
      >
        <span className="text-sm font-medium">
          {BLOCK_TYPE_LABELS[block.type]}
          {block._isNew && <span className="ml-1 text-xs text-blue-500">(신규)</span>}
          {block._isModified && <span className="ml-1 text-xs text-yellow-500">(수정됨)</span>}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {getContentSummary(block)}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleVisibility}
        title={block.is_visible ? '클릭하면 이 블록이 쇼핑몰에서 숨겨집니다' : '클릭하면 이 블록이 쇼핑몰에 표시됩니다'}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={block.is_visible ? '숨기기' : '표시'}
      >
        {block.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-40" />}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        title="블록 삭제 (저장 전까지 되돌릴 수 없음)"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label="블록 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export type { DraftBlock };
