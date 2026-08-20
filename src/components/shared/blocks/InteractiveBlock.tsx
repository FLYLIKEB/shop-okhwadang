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
import JournalPreviewBlock from './JournalPreviewBlock';
import UnknownBlock from './UnknownBlock';

type BlockComponent = ComponentType<{ content: Record<string, unknown> }>;

const interactiveBlockComponentMap: Partial<Record<PageBlock['type'], BlockComponent>> = {
  hero_banner: HeroBannerBlock as unknown as BlockComponent,
  product_grid: ProductGridBlock as unknown as BlockComponent,
  product_carousel: ProductCarouselBlock as unknown as BlockComponent,
  category_nav: CategoryNavBlock as unknown as BlockComponent,
  promotion_banner: PromotionBannerBlock as unknown as BlockComponent,
  journal_preview: JournalPreviewBlock as unknown as BlockComponent,
};

interface Props {
  block: PageBlock;
  index: number;
}

export default function InteractiveBlock({ block, index }: Props) {
  const Component = interactiveBlockComponentMap[block.type];
  const isHero = block.type === 'hero_banner';

  return (
    <BlockErrorBoundary blockType={block.type}>
      {isHero ? (
        Component ? <Component content={block.content} /> : <UnknownBlock type={block.type} />
      ) : (
        <BlockReveal delay={index * 90}>
          {Component ? <Component content={block.content} /> : <UnknownBlock type={block.type} />}
        </BlockReveal>
      )}
    </BlockErrorBoundary>
  );
}
