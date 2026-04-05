'use client';

import type { ComponentType } from 'react';
import type { PageBlock } from '@/lib/api';
import BlockErrorBoundary from './BlockErrorBoundary';
import BlockReveal from './BlockReveal';
import HeroBannerBlock from './HeroBannerBlock';
import ProductGridBlock from './ProductGridBlock';
import ProductCarouselBlock from './ProductCarouselBlock';
import CategoryNavBlock from './CategoryNavBlock';
import PromotionBannerBlock from './PromotionBannerBlock';
import TextContentBlock from './TextContentBlock';
import SplitContentBlock from './SplitContentBlock';
import JournalPreviewBlock from './JournalPreviewBlock';
import UnknownBlock from './UnknownBlock';

type BlockComponent = ComponentType<{ content: Record<string, unknown> }>;

const blockComponentMap: Record<string, BlockComponent> = {
  hero_banner: HeroBannerBlock as unknown as BlockComponent,
  product_grid: ProductGridBlock as unknown as BlockComponent,
  product_carousel: ProductCarouselBlock as unknown as BlockComponent,
  category_nav: CategoryNavBlock as unknown as BlockComponent,
  promotion_banner: PromotionBannerBlock as unknown as BlockComponent,
  text_content: TextContentBlock as unknown as BlockComponent,
  split_content: SplitContentBlock as unknown as BlockComponent,
  brand_story: SplitContentBlock as unknown as BlockComponent,
  journal_preview: JournalPreviewBlock as unknown as BlockComponent,
};

interface Props {
  blocks: PageBlock[];
}

export default function BlockRenderer({ blocks }: Props) {
  const visibleBlocks = blocks
    .filter((block) => block.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (visibleBlocks.length === 0) return null;

  return (
    <div className="space-y-8">
      {visibleBlocks.map((block, index) => {
        const Component = blockComponentMap[block.type];
        const isHero = block.type === 'hero_banner';
        const staggerDelay = isHero ? 0 : index * 90;

        return (
          <BlockErrorBoundary key={block.id} blockType={block.type}>
            {isHero ? (
              <Component content={block.content} />
            ) : (
              <BlockReveal delay={staggerDelay}>
                {Component ? (
                  <Component content={block.content} />
                ) : (
                  <UnknownBlock type={block.type} />
                )}
              </BlockReveal>
            )}
          </BlockErrorBoundary>
        );
      })}
    </div>
  );
}
