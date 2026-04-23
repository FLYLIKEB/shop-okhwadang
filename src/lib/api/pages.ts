import { apiClient } from './core';
import type { Product, Category, ProductSort } from './products';
import type { Journal, JournalCategory } from './journals';

export interface PageBlock {
  id: number;
  type: 'hero_banner' | 'product_grid' | 'product_carousel' | 'category_nav' | 'promotion_banner' | 'text_content' | 'split_content' | 'brand_story' | 'journal_preview';
  content: Record<string, unknown>;
  sort_order: number;
  is_visible: boolean;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  blocks: PageBlock[];
  is_published: boolean;
}

export interface HeroBannerSlide {
  title: string;
  subtitle?: string;
  image_url?: string;
  bg_color?: string;
  cta_text?: string;
  cta_url?: string;
}

export interface HeroBannerContent {
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  cta_text?: string;
  cta_url?: string;
  template: 'slider' | 'fullscreen' | 'split';
  slides?: HeroBannerSlide[];
}

export interface ProductGridContent {
  product_ids?: number[];
  category_id?: number;
  auto?: boolean;
  limit: number;
  template: '2col' | '3col' | '4col';
  title?: string;
  more_href?: string;
  /** 서버에서 미리 가져온 상품 데이터 (fallback용) */
  prefetched_products?: Product[];
}

export interface ProductCarouselContent {
  product_ids?: number[];
  category_id?: number;
  auto?: boolean;
  sort?: ProductSort;
  limit: number;
  template: 'default' | 'large';
  title?: string;
}

export interface CategoryNavContent {
  title?: string;
  category_ids: number[];
  template: 'icon' | 'image' | 'text';
  prefetched_categories?: Category[];
}

export interface PromotionBannerContent {
  title: string;
  subtitle?: string;
  image_url?: string;
  cta_text?: string;
  cta_url?: string;
  template: 'full-width' | 'card' | 'timer';
  end_date?: string;
}

export interface TextContentContent {
  html: string;
  textAlign?: 'left' | 'center' | 'right';
  template?: 'default' | 'highlight';
}

export interface SplitContentContent {
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  image_position?: 'left' | 'right';
  cta_text?: string;
  cta_url?: string;
  template?: 'default' | 'large' | 'compact';
  use_alternate_bg?: boolean;
}

export interface NewsletterSignupContent {
  title: string;
  description?: string;
  placeholder?: string;
  button_text?: string;
  template?: 'default' | 'minimal' | 'with_image';
  background_image?: string;
}

export interface ImageGalleryContent {
  title?: string;
  images: Array<{
    url: string;
    alt?: string;
    caption?: string;
    link_url?: string;
  }>;
  template?: 'grid' | 'masonry' | 'carousel';
  columns?: 2 | 3 | 4;
}

export interface JournalPreviewContent {
  title?: string;
  limit?: number;
  category?: JournalCategory;
  more_href?: string;
  prefetched_journals?: Journal[];
}

export const pagesApi = {
  getBySlug: (slug: string, locale?: string) =>
    apiClient.get<Page>(`/pages/${slug}`, { params: locale ? { locale } : undefined }),
  getAll: () => apiClient.get<Page[]>('/pages'),
};
