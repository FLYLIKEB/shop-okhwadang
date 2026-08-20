import type { ReactNode } from 'react';
import type { PageBlock } from '@/lib/api';
import InteractiveBlock from './InteractiveBlock';
import TextContentBlock from './TextContentBlock';
import SplitContentBlock from './SplitContentBlock';
import ColorCardListBlock from './ColorCardListBlock';
import TimelineListBlock from './TimelineListBlock';
import PersonCardListBlock from './PersonCardListBlock';
import ImageCardGridBlock from './ImageCardGridBlock';
import UnknownBlock from './UnknownBlock';

type StaticBlockComponent = (props: { content: Record<string, unknown> }) => ReactNode;

const staticBlockComponentMap: Partial<Record<PageBlock['type'], StaticBlockComponent>> = {
  text_content: TextContentBlock as unknown as StaticBlockComponent,
  split_content: SplitContentBlock as unknown as StaticBlockComponent,
  brand_story: SplitContentBlock as unknown as StaticBlockComponent,
  color_card_list: ColorCardListBlock as unknown as StaticBlockComponent,
  timeline_list: TimelineListBlock as unknown as StaticBlockComponent,
  person_card_list: PersonCardListBlock as unknown as StaticBlockComponent,
  image_card_grid: ImageCardGridBlock as unknown as StaticBlockComponent,
};

const interactiveBlockTypes = new Set<PageBlock['type']>([
  'hero_banner',
  'product_grid',
  'product_carousel',
  'category_nav',
  'promotion_banner',
  'journal_preview',
]);

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
        if (interactiveBlockTypes.has(block.type)) {
          return <InteractiveBlock key={block.id} block={block} index={index} />;
        }

        const Component = staticBlockComponentMap[block.type];
        return Component
          ? <Component key={block.id} content={block.content} />
          : <UnknownBlock key={block.id} type={block.type} />;
      })}
    </div>
  );
}
