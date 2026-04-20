import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeoService } from '../seo.service';
import { Product, ProductStatus } from '../../products/entities/product.entity';
import { Page } from '../../pages/entities/page.entity';
import { JournalEntry } from '../../journal/entities/journal-entry.entity';

describe('SeoService', () => {
  let service: SeoService;

  const mockProductRepo = {
    find: jest.fn(),
  } as unknown as Repository<Product>;

  const mockPageRepo = {
    find: jest.fn(),
  } as unknown as Repository<Page>;

  const mockJournalRepo = {
    find: jest.fn(),
  } as unknown as Repository<JournalEntry>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Page), useValue: mockPageRepo },
        { provide: getRepositoryToken(JournalEntry), useValue: mockJournalRepo },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://www.okhwadang.com';
  });

  it('should generate sitemap with localized alternate links', async () => {
    mockProductRepo.find = jest.fn().mockResolvedValue([
      { id: 101, status: ProductStatus.ACTIVE, updatedAt: new Date('2026-04-19T10:00:00.000Z') },
    ]);
    mockPageRepo.find = jest.fn().mockResolvedValue([
      { slug: 'home', updated_at: new Date('2026-04-19T09:00:00.000Z'), is_published: true },
    ]);
    mockJournalRepo.find = jest.fn().mockResolvedValue([
      { slug: 'tea-brewing', updatedAt: new Date('2026-04-18T10:00:00.000Z'), isPublished: true },
    ]);

    const xml = await service.generateSitemapXml();

    expect(xml).toContain('<urlset');
    expect(xml).toContain('https://www.okhwadang.com/ko/products/101');
    expect(xml).toContain('hreflang="en" href="https://www.okhwadang.com/en/products/101"');
    expect(xml).toContain('https://www.okhwadang.com/ko/journal/tea-brewing');
    expect(xml).toContain('<lastmod>2026-04-19T10:00:00.000Z</lastmod>');
  });

  it('should generate disallow-all robots for non-production', () => {
    process.env.NODE_ENV = 'staging';

    const robots = service.generateRobotsTxt();

    expect(robots).toBe('User-agent: *\nDisallow: /');
  });

  it('should generate allow robots with sitemap for production', () => {
    process.env.NODE_ENV = 'production';

    const robots = service.generateRobotsTxt();

    expect(robots).toBe(
      'User-agent: *\nAllow: /\nSitemap: https://www.okhwadang.com/sitemap.xml',
    );
  });
});
