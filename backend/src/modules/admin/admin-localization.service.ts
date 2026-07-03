import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { Category } from '../products/entities/category.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { Page } from '../pages/entities/page.entity';
import { PageBlock } from '../pages/entities/page-block.entity';
import { NavigationItem } from '../navigation/entities/navigation-item.entity';
import { ExternalReview } from '../reviews/entities/external-review.entity';

const REPORT_LOCALE = 'en';
const SAMPLE_LIMIT = 50;
const CONTENT_TRANSLATION_KEYS = new Set([
  'title',
  'subtitle',
  'description',
  'eyebrow',
  'cta_text',
  'ctaText',
  'hrefLabel',
  'label',
  'sectionLabel',
  'sectionTitle',
  'sectionDesc',
  'html',
  'name',
  'nameKo',
  'region',
  'specialty',
  'story',
]);

export type LocalizationResourceKind =
  | 'product'
  | 'category'
  | 'productOption'
  | 'page'
  | 'pageBlock'
  | 'navigation'
  | 'externalReview';

export interface LocalizationMissingItem {
  kind: LocalizationResourceKind;
  id: number;
  label: string;
  missingFields: string[];
  editHref: string | null;
  fallbackPolicy: 'koFallback' | 'sourceTextFallback';
}

export interface LocalizationCoverageSummary {
  kind: LocalizationResourceKind;
  total: number;
  missing: number;
  complete: number;
}

export interface LocalizationCoverageReport {
  locale: typeof REPORT_LOCALE;
  fallbackPolicy: {
    default: 'koFallback';
    smartStoreReviews: 'sourceTextFallback';
  };
  summaries: LocalizationCoverageSummary[];
  items: LocalizationMissingItem[];
}

interface FieldPair {
  base: string;
  localized: string;
  label: string;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function missingEntityFields(entity: Record<string, unknown>, fields: FieldPair[]): string[] {
  return fields
    .filter(({ base, localized }) => hasText(entity[base]) && !hasText(entity[localized]))
    .map(({ label }) => label);
}

function localizedKeyCandidates(key: string): string[] {
  if (key === 'nameKo') return ['nameEn'];
  return [`${key}_en`, `${key}En`];
}

function collectContentMissingFields(
  content: unknown,
  path = 'content',
  seen = new WeakSet<object>(),
): string[] {
  if (content === null || typeof content !== 'object') return [];
  if (seen.has(content)) return [];
  seen.add(content);

  if (Array.isArray(content)) {
    return content.flatMap((item, index) => collectContentMissingFields(item, `${path}[${index}]`, seen));
  }

  const source = content as Record<string, unknown>;
  const missing: string[] = [];

  for (const [key, value] of Object.entries(source)) {
    if (CONTENT_TRANSLATION_KEYS.has(key) && hasText(value)) {
      const hasLocalizedValue = localizedKeyCandidates(key).some((candidate) => hasText(source[candidate]));
      if (!hasLocalizedValue) {
        missing.push(`${path}.${key}`);
      }
    }

    if (value !== null && typeof value === 'object') {
      missing.push(...collectContentMissingFields(value, `${path}.${key}`, seen));
    }
  }

  return missing;
}

function pushSummary(
  summaries: LocalizationCoverageSummary[],
  kind: LocalizationResourceKind,
  total: number,
  missing: number,
): void {
  summaries.push({ kind, total, missing, complete: total - missing });
}

@Injectable()
export class AdminLocalizationService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductOption)
    private readonly productOptionRepository: Repository<ProductOption>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(PageBlock)
    private readonly pageBlockRepository: Repository<PageBlock>,
    @InjectRepository(NavigationItem)
    private readonly navigationRepository: Repository<NavigationItem>,
    @InjectRepository(ExternalReview)
    private readonly externalReviewRepository: Repository<ExternalReview>,
  ) {}

  async getCoverage(): Promise<LocalizationCoverageReport> {
    const [products, categories, productOptions, pages, pageBlocks, navigationItems, externalReviews] = await Promise.all([
      this.productRepository.find({
        select: [
          'id',
          'name',
          'nameEn',
          'description',
          'descriptionEn',
          'shortDescription',
          'shortDescriptionEn',
          'status',
        ],
      }),
      this.categoryRepository.find({
        select: ['id', 'name', 'nameEn', 'description', 'descriptionEn', 'isActive'],
      }),
      this.productOptionRepository.find({ select: ['id', 'productId', 'name', 'nameEn', 'value', 'valueEn'] }),
      this.pageRepository.find({ select: ['id', 'slug', 'title', 'titleEn', 'is_published'] }),
      this.pageBlockRepository.find({ select: ['id', 'page_id', 'type', 'content', 'is_visible'] }),
      this.navigationRepository.find({ select: ['id', 'label', 'labelEn', 'group', 'is_active'] }),
      this.externalReviewRepository.find({ select: ['id', 'content', 'externalReviewId', 'isVisible'] }),
    ]);

    const items: LocalizationMissingItem[] = [];
    const summaries: LocalizationCoverageSummary[] = [];
    const visibleProducts = products.filter((product) =>
      product.status === ProductStatus.ACTIVE || product.status === ProductStatus.SOLDOUT,
    );
    const visibleProductIds = new Set(visibleProducts.map((product) => Number(product.id)));
    const visibleCategories = categories.filter((category) => category.isActive);
    const publishedPages = pages.filter((page) => page.is_published);
    const publishedPageIds = new Set(publishedPages.map((page) => Number(page.id)));
    const visiblePageBlocks = pageBlocks.filter((block) =>
      block.is_visible && publishedPageIds.has(Number(block.page_id)),
    );
    const visibleProductOptions = productOptions.filter((option) =>
      visibleProductIds.has(Number(option.productId)),
    );

    const productMissing = visibleProducts.flatMap((product) => {
      const missingFields = missingEntityFields(product as unknown as Record<string, unknown>, [
        { base: 'name', localized: 'nameEn', label: 'name' },
        { base: 'description', localized: 'descriptionEn', label: 'description' },
        { base: 'shortDescription', localized: 'shortDescriptionEn', label: 'shortDescription' },
      ]);
      return missingFields.length
        ? [{
            kind: 'product' as const,
            id: Number(product.id),
            label: product.name,
            missingFields,
            editHref: `/admin/products/${product.id}/edit`,
            fallbackPolicy: 'koFallback' as const,
          }]
        : [];
    });
    items.push(...productMissing);
    pushSummary(summaries, 'product', visibleProducts.length, productMissing.length);


    const productOptionMissing = visibleProductOptions.flatMap((option) => {
      const missingFields = missingEntityFields(option as unknown as Record<string, unknown>, [
        { base: 'name', localized: 'nameEn', label: 'name' },
        { base: 'value', localized: 'valueEn', label: 'value' },
      ]);
      return missingFields.length
        ? [{
            kind: 'productOption' as const,
            id: Number(option.id),
            label: `${option.name}: ${option.value}`,
            missingFields,
            editHref: `/admin/products/${option.productId}/edit`,
            fallbackPolicy: 'koFallback' as const,
          }]
        : [];
    });
    items.push(...productOptionMissing);
    pushSummary(summaries, 'productOption', visibleProductOptions.length, productOptionMissing.length);

    const categoryMissing = visibleCategories.flatMap((category) => {
      const missingFields = missingEntityFields(category as unknown as Record<string, unknown>, [
        { base: 'name', localized: 'nameEn', label: 'name' },
        { base: 'description', localized: 'descriptionEn', label: 'description' },
      ]);
      return missingFields.length
        ? [{
            kind: 'category' as const,
            id: Number(category.id),
            label: category.name,
            missingFields,
            editHref: '/admin/categories',
            fallbackPolicy: 'koFallback' as const,
          }]
        : [];
    });
    items.push(...categoryMissing);
    pushSummary(summaries, 'category', visibleCategories.length, categoryMissing.length);

    const pageMissing = publishedPages.flatMap((page) => {
      const missingFields = missingEntityFields(page as unknown as Record<string, unknown>, [
        { base: 'title', localized: 'titleEn', label: 'title' },
      ]);
      return missingFields.length
        ? [{
            kind: 'page' as const,
            id: Number(page.id),
            label: `${page.slug} · ${page.title}`,
            missingFields,
            editHref: '/admin/pages',
            fallbackPolicy: 'koFallback' as const,
          }]
        : [];
    });
    items.push(...pageMissing);
    pushSummary(summaries, 'page', publishedPages.length, pageMissing.length);

    const pageBlockMissing = visiblePageBlocks.flatMap((block) => {
      const missingFields = collectContentMissingFields(block.content);
      return missingFields.length
        ? [{
            kind: 'pageBlock' as const,
            id: Number(block.id),
            label: `${block.type} #${block.id}`,
            missingFields,
            editHref: '/admin/pages',
            fallbackPolicy: 'koFallback' as const,
          }]
        : [];
    });
    items.push(...pageBlockMissing);
    pushSummary(summaries, 'pageBlock', visiblePageBlocks.length, pageBlockMissing.length);

    const navigationMissing = navigationItems.flatMap((item) => {
      if (!item.is_active) return [];
      const missingFields = missingEntityFields(item as unknown as Record<string, unknown>, [
        { base: 'label', localized: 'labelEn', label: 'label' },
      ]);
      return missingFields.length
        ? [{
            kind: 'navigation' as const,
            id: Number(item.id),
            label: `${item.group} · ${item.label}`,
            missingFields,
            editHref: '/admin/navigation',
            fallbackPolicy: 'koFallback' as const,
          }]
        : [];
    });
    items.push(...navigationMissing);
    pushSummary(summaries, 'navigation', navigationItems.filter((item) => item.is_active).length, navigationMissing.length);

    const externalReviewMissing = externalReviews.flatMap((review) => {
      if (!review.isVisible || !hasText(review.content)) return [];
      return [{
        kind: 'externalReview' as const,
        id: Number(review.id),
        label: review.externalReviewId,
        missingFields: ['content'],
        editHref: '/admin/reviews',
        fallbackPolicy: 'sourceTextFallback' as const,
      }];
    });
    items.push(...externalReviewMissing);
    pushSummary(
      summaries,
      'externalReview',
      externalReviews.filter((review) => review.isVisible && hasText(review.content)).length,
      externalReviewMissing.length,
    );

    return {
      locale: REPORT_LOCALE,
      fallbackPolicy: {
        default: 'koFallback',
        smartStoreReviews: 'sourceTextFallback',
      },
      summaries,
      items: items.slice(0, SAMPLE_LIMIT),
    };
  }
}
