'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { ConfirmDialog } from '@/components/shared/admin/ConfirmDialog';
import { localMessage } from '@/utils/localMessages';
import type { PageBlock } from '@/lib/api';

const BLOCK_TYPE_LABELS: Record<PageBlock['type'], string> = {
  hero_banner: localMessage('adminEnglish.heroBanner'),
  product_grid: localMessage('adminEnglish.productGrid'),
  product_carousel: localMessage('adminEnglish.productCarousel'),
  category_nav: localMessage('adminEnglish.categoryNavigation'),
  promotion_banner: localMessage('adminEnglish.promotionBanner'),
  text_content: localMessage('adminEnglish.text'),
  split_content: localMessage('adminEnglish.splitContent'),
  brand_story: localMessage('adminEnglish.brandStory'),
  journal_preview: localMessage('adminEnglish.journalPreview'),
  color_card_list: localMessage('adminEnglish.colorCards'),
  timeline_list: localMessage('adminEnglish.timeline'),
  person_card_list: localMessage('adminEnglish.personCards'),
  image_card_grid: localMessage('adminEnglish.imageCardGrid'),
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
      return (c.title as string) || (c.subtitle as string) || localMessage('adminEnglish.empty');
    case 'product_grid':
      return localMessage('adminEnglish.blockCountTemplateSummary', { title: (c.title as string) || localMessage('adminEnglish.untitled'), count: Number(c.limit ?? 8), template: String(c.template ?? '3col') });
    case 'product_carousel':
      return localMessage('adminEnglish.blockCountSummary', { title: (c.title as string) || localMessage('adminEnglish.untitled'), count: Number(c.limit ?? 8) });
    case 'category_nav':
      return localMessage('adminEnglish.styleSummary', { style: String(c.template ?? 'text') });
    case 'promotion_banner':
      return (c.title as string) || (c.subtitle as string) || localMessage('adminEnglish.empty');
    case 'text_content': {
      const plain = ((c.html as string) ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return plain ? plain.slice(0, 30) + (plain.length > 30 ? '…' : '') : localMessage('adminEnglish.empty');
    }
    case 'split_content':
    case 'brand_story':
      return (c.title as string) || (c.description as string) || localMessage('adminEnglish.empty');
    case 'journal_preview':
      return localMessage('adminEnglish.blockCountSummary', { title: (c.title as string) || localMessage('adminEnglish.journal'), count: Number(c.limit ?? 6) });
    case 'color_card_list':
      return localMessage('adminEnglish.blockCountSummary', { title: (c.sectionTitle as string) || localMessage('adminEnglish.colorCards'), count: Array.isArray(c.items) ? c.items.length : 0 });
    case 'timeline_list':
      return localMessage('adminEnglish.blockCountSummary', { title: (c.sectionTitle as string) || localMessage('adminEnglish.timeline'), count: Array.isArray(c.items) ? c.items.length : 0 });
    case 'person_card_list':
      return localMessage('adminEnglish.blockCountSummary', { title: (c.sectionTitle as string) || localMessage('adminEnglish.personCards'), count: Array.isArray(c.items) ? c.items.length : 0 });
    case 'image_card_grid':
      return localMessage('adminEnglish.blockCountSummary', { title: (c.sectionTitle as string) || localMessage('adminEnglish.imageCardGrid'), count: Array.isArray(c.items) ? c.items.length : 0 });
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const handleDelete = () => setConfirmDeleteOpen(true);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'surface-card mb-2 flex items-center gap-3 px-4 py-3 transition-colors',
        isSelected && 'ring-2 ring-primary',
        isDragging && 'opacity-50',
      )}
    >
      <span className="w-5 shrink-0 text-center typo-label font-semibold text-muted-foreground">
        {index}
      </span>

      <button
        type="button"
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label={localMessage('adminEnglish.dragToReorder')}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col text-left min-w-0"
      >
        <span className="typo-body-sm font-semibold">
          {BLOCK_TYPE_LABELS[block.type]}
          {block._isNew && <span className="ml-1 typo-label text-primary">{localMessage('adminEnglish.new')}</span>}
          {block._isModified && <span className="ml-1 typo-label text-tea dark:text-primary">{localMessage('adminEnglish.edited')}</span>}
        </span>
        <span className="truncate typo-label text-muted-foreground">
          {getContentSummary(block)}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleVisibility}
        title={block.is_visible ? localMessage('adminEnglish.clickToHideThisBlockFromThe') : localMessage('adminEnglish.clickToShowThisBlockOnThe')}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={block.is_visible ? localMessage('admin.products.actions.hide') : localMessage('adminEnglish.show')}
      >
        {block.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-40" />}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        title={localMessage('adminEnglish.deleteBlockCannotBeUndoneBeforeSaving')}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={localMessage('admin.pages.blockDeleteDialog.title')}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={localMessage('admin.pages.blockDeleteDialog.title')}
        description={localMessage('admin.pages.blockDeleteDialog.description', { type: BLOCK_TYPE_LABELS[block.type] })}
        confirmLabel={localMessage('admin.pages.blockDeleteDialog.confirm')}
        cancelLabel={localMessage('admin.pages.blockDeleteDialog.cancel')}
        destructive
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          onDelete();
        }}
      />
    </div>
  );
}

export type { DraftBlock };
