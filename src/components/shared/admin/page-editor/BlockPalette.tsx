'use client';

import { localMessage } from '@/utils/localMessages';
import { useState } from 'react';
import { Image, Grid3X3, GalleryHorizontalEnd, FolderTree, Megaphone, Type, Info, X, AlignLeft, BookOpen, Palette, Clock3, Images, Contact } from 'lucide-react';
import type { PageBlock } from '@/lib/api';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';

type BlockType = PageBlock['type'];

interface BlockTypeCard {
  type: BlockType;
  label: string;
  description: string;
  detail: string;
  icon: React.ElementType;
}

const BLOCK_TYPES: BlockTypeCard[] = [
  {
    type: 'hero_banner',
    label: localMessage('adminEnglish.heroBanner'),
    description: localMessage('adminEnglish.largeBannerAtTheTopOfThe'),
    detail: localMessage('adminEnglish.aLargeImageBannerAtTheTop'),
    icon: Image,
  },
  {
    type: 'product_grid',
    label: localMessage('adminEnglish.productGrid'),
    description: localMessage('adminEnglish.displayProductsInAGrid'),
    detail: localMessage('adminEnglish.displayProductsInTwoThreeOrFour'),
    icon: Grid3X3,
  },
  {
    type: 'product_carousel',
    label: localMessage('adminEnglish.productCarousel'),
    description: localMessage('adminEnglish.displayProductsInAHorizontalSlider'),
    detail: localMessage('adminEnglish.displayProductsInAHorizontallyScrollingSlider'),
    icon: GalleryHorizontalEnd,
  },
  {
    type: 'category_nav',
    label: localMessage('adminEnglish.categoryNavigation'),
    description: localMessage('adminEnglish.categoryShortcutButtons'),
    detail: localMessage('adminEnglish.displayCategoriesAsButtonsIconsOrImages'),
    icon: FolderTree,
  },
  {
    type: 'split_content',
    label: localMessage('adminEnglish.splitContent'),
    description: localMessage('adminEnglish.textFocusedContentSection'),
    detail: localMessage('adminEnglish.setASubtitleTitleDescriptionAndCta'),
    icon: AlignLeft,
  },
  {
    type: 'promotion_banner',
    label: localMessage('adminEnglish.promotionBanner'),
    description: localMessage('adminEnglish.bannerForDiscountsAndEvents'),
    detail: localMessage('adminEnglish.highlightDiscountsAndLimitedTimePromotionsSet'),
    icon: Megaphone,
  },
  {
    type: 'text_content',
    label: localMessage('adminEnglish.text'),
    description: localMessage('adminEnglish.freeFormHtmlTextArea'),
    detail: localMessage('adminEnglish.writeContentFreelyUsingHtmlUseIt'),
    icon: Type,
  },
  {
    type: 'journal_preview',
    label: localMessage('adminEnglish.journalPreview'),
    description: localMessage('adminEnglish.displayJournalEntriesAsCards'),
    detail: localMessage('adminEnglish.previewRecentJournalEntriesAsCardsSet'),
    icon: BookOpen,
  },

  {
    type: 'color_card_list',
    label: localMessage('adminEnglish.colorCards'),
    description: localMessage('adminEnglish.colorCardsWithDescriptions'),
    detail: localMessage('adminEnglish.cardsWithColorSwatchesAndTextChoose'),
    icon: Palette,
  },
  {
    type: 'timeline_list',
    label: localMessage('adminEnglish.timeline'),
    description: localMessage('adminEnglish.stepByStepContent'),
    detail: localMessage('adminEnglish.displayAProcessOrHistoryAsA'),
    icon: Clock3,
  },
  {
    type: 'person_card_list',
    label: localMessage('adminEnglish.personCards'),
    description: localMessage('adminEnglish.profileCards'),
    detail: localMessage('adminEnglish.displayPortraitsAndStoriesInAnAlternating'),
    icon: Contact,
  },
  {
    type: 'image_card_grid',
    label: localMessage('adminEnglish.imageCardGrid'),
    description: localMessage('adminEnglish.imageBasedCardGrid'),
    detail: localMessage('adminEnglish.displayImageCardsInATwoTo'),
    icon: Images,
  },
];

interface BlockPaletteProps {
  onAddBlock: (type: BlockType, content: Record<string, unknown>) => void;
}

function getDefaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'hero_banner':
      return { title: '', subtitle: '', image_url: '', cta_text: '', cta_url: '', template: 'fullscreen' };
    case 'product_grid':
      return { product_ids: [], limit: 8, template: '3col', title: '' };
    case 'product_carousel':
      return { product_ids: [], limit: 8, template: 'default', title: '' };
    case 'category_nav':
      return { category_ids: [], template: 'text' };
    case 'promotion_banner':
      return { title: '', subtitle: '', image_url: '', cta_text: '', cta_url: '', template: 'full-width' };
    case 'text_content':
      return { html: '', template: 'default' };
    case 'split_content':
    case 'brand_story':
      return { title: '', subtitle: '', description: '', cta_text: '', cta_url: '', template: 'default' };
    case 'journal_preview':
      return { title: localMessage('adminEnglish.journal'), limit: 6, more_href: '/journal' };
    case 'color_card_list':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', layout: 'alternating', items: [] };
    case 'timeline_list':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', items: [] };
    case 'person_card_list':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', items: [] };
    case 'image_card_grid':
      return { sectionLabel: '', sectionTitle: '', sectionDesc: '', columns: 3, items: [] };
  }
}

export default function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const [tooltip, setTooltip] = useState<BlockType | null>(null);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBlockTypes = normalizedQuery
    ? BLOCK_TYPES.filter(({ label, description, detail, type }) =>
        [label, description, detail, type].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : BLOCK_TYPES;

  return (
    <div className="cms-editor__palette surface-card w-64 shrink-0 overflow-y-auto rounded-none border-0 border-r border-soft p-4">
      <h3 className="mb-3 typo-label font-semibold uppercase text-muted-foreground">{localMessage('adminEnglish.addBlock')}</h3>
      <FormInput
        id="block-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={localMessage('adminEnglish.searchBlocks')}
        className="mb-3 rounded-xl border-soft py-3 typo-body-sm"
      />
      <div className="space-y-1.5">
        {visibleBlockTypes.map(({ type, label, description, detail, icon: Icon }) => (
          <div key={type} className="relative">
            <div className="flex items-stretch gap-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onAddBlock(type, getDefaultContent(type))}
                className="surface-card flex h-auto min-h-16 flex-1 items-start justify-start gap-2 p-3 text-left transition-colors hover:bg-muted"
                data-testid={`add-block-${type}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="block typo-body-sm font-semibold">{label}</span>
                  <span className="block typo-label leading-tight text-muted-foreground">{description}</span>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setTooltip(tooltip === type ? null : type)}
                className="h-auto min-h-16 w-10 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={localMessage('adminEnglish.describeBlock', { label })}
              >
                {tooltip === type ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {tooltip === type && (
              <div className="mt-2 rounded-xl bg-muted/70 px-3 py-3 typo-body-sm leading-relaxed text-foreground whitespace-pre-line">
                {detail}
              </div>
            )}
          </div>
        ))}
        {visibleBlockTypes.length === 0 && (
          <p className="rounded-xl border border-dashed border-soft p-4 text-center typo-body-sm text-muted-foreground">
            {localMessage('admin.points.memberSearchEmpty')}
          </p>
        )}
      </div>
    </div>
  );
}

export { BLOCK_TYPES, getDefaultContent };
