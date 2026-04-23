'use client';

import { BLOCK_TYPE_DESCRIPTIONS, BLOCK_TYPE_LABELS } from './block-property-panel/blockConfig';
import CategoryNavFields from './block-property-panel/blocks/CategoryNavFields';
import HeroBannerFields from './block-property-panel/blocks/HeroBannerFields';
import JournalPreviewFields from './block-property-panel/blocks/JournalPreviewFields';
import ProductCarouselFields from './block-property-panel/blocks/ProductCarouselFields';
import ProductGridFields from './block-property-panel/blocks/ProductGridFields';
import PromotionBannerFields from './block-property-panel/blocks/PromotionBannerFields';
import SplitContentFields from './block-property-panel/blocks/SplitContentFields';
import TextContentFields from './block-property-panel/blocks/TextContentFields';
import type { DraftBlock } from './SortableBlockItem';

interface BlockPropertyPanelProps {
  block: DraftBlock | null;
  onUpdateContent: (blockId: number, content: Record<string, unknown>) => void;
}

export default function BlockPropertyPanel({ block, onUpdateContent }: BlockPropertyPanelProps) {
  if (!block) {
    return (
      <div className="flex w-72 shrink-0 items-center justify-center border-l p-4 text-sm text-muted-foreground">
        블록을 선택하면 설정을 편집할 수 있습니다
      </div>
    );
  }

  const handleChange = (content: Record<string, unknown>) => {
    onUpdateContent(block.id, content);
  };

  const renderFields = () => {
    switch (block.type) {
      case 'hero_banner':
        return <HeroBannerFields content={block.content} onChange={handleChange} />;
      case 'product_grid':
        return <ProductGridFields content={block.content} onChange={handleChange} />;
      case 'product_carousel':
        return <ProductCarouselFields content={block.content} onChange={handleChange} />;
      case 'category_nav':
        return <CategoryNavFields content={block.content} onChange={handleChange} />;
      case 'promotion_banner':
        return <PromotionBannerFields content={block.content} onChange={handleChange} />;
      case 'text_content':
        return <TextContentFields content={block.content} onChange={handleChange} />;
      case 'split_content':
      case 'brand_story':
        return <SplitContentFields content={block.content} onChange={handleChange} />;
      case 'journal_preview':
        return <JournalPreviewFields content={block.content} onChange={handleChange} />;
    }
  };

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-l p-4">
      <h3 className="mb-2 text-sm font-semibold">
        {BLOCK_TYPE_LABELS[block.type]} 설정
      </h3>
      <p className="mb-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        ℹ️ {BLOCK_TYPE_DESCRIPTIONS[block.type]}
      </p>
      <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        ✏️ 수정 내용은 상단 <b>저장</b> 버튼을 눌러야 반영됩니다
      </div>
      <div className="space-y-3">
        {renderFields()}
      </div>
    </div>
  );
}
