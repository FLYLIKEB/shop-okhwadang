import type { ReactNode } from 'react';
import type { PageBlock } from '@/lib/api';
import { englishBlockControls } from '@/utils/blockControls';
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
  contained?: boolean;
  englishControls?: boolean;
}

export default function BlockRenderer({ blocks, contained = false, englishControls = true }: Props) {
  const visibleBlocks = blocks
    .filter((block) => block.is_visible)
    .map((block) => englishControls ? { ...block, content: englishBlockControls(block.content) } : block)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (visibleBlocks.length === 0) return null;

  return (
    <div className="toss-cms__blocks space-y-8">
      {visibleBlocks.map((block, index) => {
        const Component = staticBlockComponentMap[block.type];
        const rendered = interactiveBlockTypes.has(block.type)
          ? <InteractiveBlock key={block.id} block={block} index={index} />
          : Component
            ? <Component key={block.id} content={block.content} />
            : <UnknownBlock key={block.id} type={block.type} />;

        return contained && block.type !== 'split_content' && block.type !== 'brand_story'
          ? <div key={block.id} className="layout-container catalog-container">{rendered}</div>
          : rendered;
      })}
    </div>
  );
}
