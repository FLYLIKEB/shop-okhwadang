import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { Page } from '../pages/entities/page.entity';
import { JournalEntry } from '../journal/entities/journal-entry.entity';

interface SitemapItem {
  pathByLocale: Record<string, string>;
  updatedAt: Date;
}

const LOCALES = ['ko', 'en', 'ja', 'zh'] as const;

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(JournalEntry)
    private readonly journalRepo: Repository<JournalEntry>,
  ) {}

  private getSiteUrl(): string {
    const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
    return raw.replace(/\/+$/, '');
  }

  private escapeXml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildLocalizedPaths(basePath: string): Record<string, string> {
    return Object.fromEntries(LOCALES.map((locale) => [locale, `/${locale}${basePath}`]));
  }

  private buildUrlNode(item: SitemapItem): string {
    const siteUrl = this.getSiteUrl();
    const canonicalLocale = 'ko';
    const canonicalUrl = `${siteUrl}${item.pathByLocale[canonicalLocale]}`;
    const alternates = LOCALES.map(
      (locale) =>
        `<xhtml:link rel="alternate" hreflang="${locale}" href="${this.escapeXml(`${siteUrl}${item.pathByLocale[locale]}`)}" />`,
    ).join('');

    return [
      '<url>',
      `<loc>${this.escapeXml(canonicalUrl)}</loc>`,
      `<lastmod>${item.updatedAt.toISOString()}</lastmod>`,
      alternates,
      `<xhtml:link rel="alternate" hreflang="x-default" href="${this.escapeXml(canonicalUrl)}" />`,
      '</url>',
    ].join('');
  }

  async generateSitemapXml(): Promise<string> {
    const [products, pages, journalEntries] = await Promise.all([
      this.productRepo.find({
        where: { status: ProductStatus.ACTIVE },
        select: { id: true, updatedAt: true },
        order: { updatedAt: 'DESC' },
      }),
      this.pageRepo.find({
        where: { is_published: true },
        select: { slug: true, updated_at: true },
        order: { updated_at: 'DESC' },
      }),
      this.journalRepo.find({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    const productItems: SitemapItem[] = products.map((product) => ({
      pathByLocale: this.buildLocalizedPaths(`/products/${product.id}`),
      updatedAt: product.updatedAt,
    }));

    const pageItems: SitemapItem[] = pages.map((page) => ({
      pathByLocale: page.slug === 'home'
        ? Object.fromEntries(LOCALES.map((locale) => [locale, `/${locale}`]))
        : this.buildLocalizedPaths(`/p/${page.slug}`),
      updatedAt: page.updated_at,
    }));

    const articleItems: SitemapItem[] = journalEntries.map((article) => ({
      pathByLocale: this.buildLocalizedPaths(`/journal/${article.slug}`),
      updatedAt: article.updatedAt,
    }));

    const allItems = [...productItems, ...pageItems, ...articleItems].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

    const urlNodes = allItems.map((item) => this.buildUrlNode(item)).join('');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      urlNodes,
      '</urlset>',
    ].join('');
  }

  generateRobotsTxt(): string {
    const siteUrl = this.getSiteUrl();
    const env = (process.env.NODE_ENV || 'development').toLowerCase();
    const isProduction = env === 'production';

    if (!isProduction) {
      return [
        'User-agent: *',
        'Disallow: /',
      ].join('\n');
    }

    return [
      'User-agent: *',
      'Allow: /',
      `Sitemap: ${siteUrl}/sitemap.xml`,
    ].join('\n');
  }
}
