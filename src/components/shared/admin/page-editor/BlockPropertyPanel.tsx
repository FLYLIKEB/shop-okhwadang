'use client';

import { BLOCK_TYPE_DESCRIPTIONS, BLOCK_TYPE_LABELS } from './block-property-panel/blockConfig';
import CategoryNavFields from './block-property-panel/blocks/CategoryNavFields';
import ColorCardListFields from './block-property-panel/blocks/ColorCardListFields';
import HeroBannerFields from './block-property-panel/blocks/HeroBannerFields';
import ImageCardGridFields from './block-property-panel/blocks/ImageCardGridFields';
import JournalPreviewFields from './block-property-panel/blocks/JournalPreviewFields';
import PersonCardListFields from './block-property-panel/blocks/PersonCardListFields';
import ProductCarouselFields from './block-property-panel/blocks/ProductCarouselFields';
import ProductGridFields from './block-property-panel/blocks/ProductGridFields';
import PromotionBannerFields from './block-property-panel/blocks/PromotionBannerFields';
import SplitContentFields from './block-property-panel/blocks/SplitContentFields';
import TextContentFields from './block-property-panel/blocks/TextContentFields';
import TimelineListFields from './block-property-panel/blocks/TimelineListFields';
import type { DraftBlock } from './SortableBlockItem';

interface BlockPropertyPanelProps {
  block: DraftBlock | null;
  onUpdateContent: (blockId: number, content: Record<string, unknown>) => void;
}

export default function BlockPropertyPanel({ block, onUpdateContent }: BlockPropertyPanelProps) {
  if (!block) {
    return (
      <div className="cms-editor__properties flex w-72 shrink-0 items-center justify-center border-l border-soft p-5 typo-body-sm text-center text-muted-foreground">
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
      case 'color_card_list':
        return <ColorCardListFields content={block.content} onChange={handleChange} />;
      case 'timeline_list':
        return <TimelineListFields content={block.content} onChange={handleChange} />;
      case 'person_card_list':
        return <PersonCardListFields content={block.content} onChange={handleChange} />;
      case 'image_card_grid':
        return <ImageCardGridFields content={block.content} onChange={handleChange} />;
    }
  };

  return (
    <div className="cms-editor__properties w-72 shrink-0 overflow-y-auto border-l border-soft p-5">
      <h3 className="mb-2 typo-body font-semibold">
        {BLOCK_TYPE_LABELS[block.type]} 설정
      </h3>
      <p className="mb-3 rounded-xl bg-primary/5 px-3 py-3 typo-body-sm leading-relaxed text-primary">
        {BLOCK_TYPE_DESCRIPTIONS[block.type]}
      </p>
      <div className="mb-4 rounded-xl bg-muted/70 px-3 py-3 typo-body-sm text-muted-foreground">
        수정 내용은 상단 <b className="text-foreground">저장</b> 버튼을 눌러야 반영됩니다.
      </div>
      <div className="space-y-3">
        {renderFields()}
      </div>
    </div>
  );
}
