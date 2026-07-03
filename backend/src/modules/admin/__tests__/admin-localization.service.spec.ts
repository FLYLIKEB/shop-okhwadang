import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminLocalizationService } from '../admin-localization.service';
import { Product } from '../../products/entities/product.entity';
import { Category } from '../../products/entities/category.entity';
import { ProductOption } from '../../products/entities/product-option.entity';
import { Page } from '../../pages/entities/page.entity';
import { PageBlock } from '../../pages/entities/page-block.entity';
import { NavigationItem } from '../../navigation/entities/navigation-item.entity';
import { ExternalReview } from '../../reviews/entities/external-review.entity';

describe('AdminLocalizationService', () => {
  let service: AdminLocalizationService;

  const productRepo = { find: jest.fn() };
  const categoryRepo = { find: jest.fn() };
  const productOptionRepo = { find: jest.fn() };
  const pageRepo = { find: jest.fn() };
  const pageBlockRepo = { find: jest.fn() };
  const navigationRepo = { find: jest.fn() };
  const externalReviewRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminLocalizationService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(ProductOption), useValue: productOptionRepo },
        { provide: getRepositoryToken(Page), useValue: pageRepo },
        { provide: getRepositoryToken(PageBlock), useValue: pageBlockRepo },
        { provide: getRepositoryToken(NavigationItem), useValue: navigationRepo },
        { provide: getRepositoryToken(ExternalReview), useValue: externalReviewRepo },
      ],
    }).compile();

    service = module.get(AdminLocalizationService);
    jest.clearAllMocks();
  });

  it('영문 번역 누락 리소스와 fallback 정책을 집계한다', async () => {
    productRepo.find.mockResolvedValue([
      {
        id: 1,
        name: '보이차',
        nameEn: null,
        description: '설명',
        descriptionEn: 'Description',
        shortDescription: '짧은 설명',
        shortDescriptionEn: null,
        status: 'active',
      },
      {
        id: 2,
        name: 'Tea',
        nameEn: 'Tea',
        description: null,
        descriptionEn: null,
        shortDescription: null,
        shortDescriptionEn: null,
        status: 'hidden',
      },
    ]);
    categoryRepo.find.mockResolvedValue([
      { id: 3, name: '다구', nameEn: '', description: '찻잔', descriptionEn: null, isActive: true },
      { id: 11, name: '숨김', nameEn: null, description: null, descriptionEn: null, isActive: false },
    ]);
    productOptionRepo.find.mockResolvedValue([
      { id: 10, productId: 1, name: '색상', nameEn: 'Color', value: '검정', valueEn: null },
      { id: 12, productId: 2, name: '비공개', nameEn: null, value: '옵션', valueEn: null },
    ]);
    pageRepo.find.mockResolvedValue([
      { id: 4, slug: 'home', title: '홈', titleEn: 'Home', is_published: true },
      { id: 13, slug: 'draft', title: '초안', titleEn: null, is_published: false },
    ]);
    pageBlockRepo.find.mockResolvedValue([
      {
        id: 5,
        page_id: 4,
        type: 'hero_banner',
        is_visible: true,
        content: { title: '대표 문구', title_en: 'Hero', slides: [{ cta_text: '구매하기' }] },
      },
      {
        id: 14,
        page_id: 13,
        type: 'text_content',
        is_visible: true,
        content: { title: '비공개 페이지 블록' },
      },
    ]);
    navigationRepo.find.mockResolvedValue([
      { id: 6, group: 'gnb', label: '상품', labelEn: null, is_active: true },
      { id: 7, group: 'footer', label: 'Hidden', labelEn: null, is_active: false },
    ]);
    externalReviewRepo.find.mockResolvedValue([
      { id: 8, externalReviewId: 'naver-1', content: '좋아요', isVisible: true },
      { id: 9, externalReviewId: 'naver-2', content: '', isVisible: true },
    ]);

    const report = await service.getCoverage();

    expect(report.locale).toBe('en');
    expect(report.fallbackPolicy).toEqual({
      default: 'koFallback',
      smartStoreReviews: 'sourceTextFallback',
    });
    expect(report.summaries).toEqual(expect.arrayContaining([
      { kind: 'product', total: 1, missing: 1, complete: 0 },
      { kind: 'category', total: 1, missing: 1, complete: 0 },
      { kind: 'productOption', total: 1, missing: 1, complete: 0 },
      { kind: 'pageBlock', total: 1, missing: 1, complete: 0 },
      { kind: 'navigation', total: 1, missing: 1, complete: 0 },
      { kind: 'externalReview', total: 1, missing: 1, complete: 0 },
    ]));
    expect(report.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'product',
        id: 1,
        missingFields: ['name', 'shortDescription'],
      }),
      expect.objectContaining({ kind: 'productOption', id: 10, missingFields: ['value'] }),
      expect.objectContaining({
        kind: 'pageBlock',
        id: 5,
        missingFields: ['content.slides[0].cta_text'],
      }),
      expect.objectContaining({
        kind: 'externalReview',
        id: 8,
        fallbackPolicy: 'sourceTextFallback',
      }),
    ]));
    expect(report.items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'pageBlock', id: 14 }),
    ]));
  });
});
