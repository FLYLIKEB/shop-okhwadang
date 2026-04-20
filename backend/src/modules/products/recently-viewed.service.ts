import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecentlyViewedProduct } from './entities/recently-viewed-product.entity';

export interface RecentlyViewedItem {
  productId: number;
  viewedAt: Date;
  product?: {
    id: number;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    status: string;
    images: { url: string; alt: string | null; isThumbnail: boolean }[];
  };
}

export interface RecentlyViewedListResult {
  data: RecentlyViewedItem[];
  total: number;
}

@Injectable()
export class RecentlyViewedService {
  private readonly logger = new Logger(RecentlyViewedService.name);

  constructor(
    @InjectRepository(RecentlyViewedProduct)
    private readonly recentlyViewedRepo: Repository<RecentlyViewedProduct>,
  ) {}

  async upsert(userId: number, productId: number): Promise<void> {
    await this.recentlyViewedRepo
      .createQueryBuilder()
      .insert()
      .into(RecentlyViewedProduct)
      .values({ userId, productId, viewedAt: new Date() })
      .orUpdate(['viewed_at'], ['user_id', 'product_id'])
      .execute();

    this.logger.debug(`Recently viewed upsert: userId=${userId}, productId=${productId}`);
  }

  async findAll(userId: number, limit = 20): Promise<RecentlyViewedListResult> {
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const [items, total] = await this.recentlyViewedRepo.findAndCount({
      where: { userId },
      relations: ['product', 'product.images'],
      order: { viewedAt: 'DESC' },
      take: safeLimit,
    });

    return {
      data: items.map((item) => this.toResponse(item)),
      total,
    };
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.recentlyViewedRepo
      .createQueryBuilder()
      .delete()
      .from(RecentlyViewedProduct)
      .where('viewed_at < :cutoff', { cutoff })
      .execute();

    return result.affected ?? 0;
  }

  private toResponse(item: RecentlyViewedProduct): RecentlyViewedItem {
    const base: RecentlyViewedItem = {
      productId: Number(item.productId),
      viewedAt: item.viewedAt,
    };

    if (item.product) {
      base.product = {
        id: Number(item.product.id),
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        salePrice: item.product.salePrice != null ? Number(item.product.salePrice) : null,
        status: item.product.status,
        images: (item.product.images ?? []).map((img) => ({
          url: img.url,
          alt: img.alt,
          isThumbnail: img.isThumbnail,
        })),
      };
    }

    return base;
  }
}
