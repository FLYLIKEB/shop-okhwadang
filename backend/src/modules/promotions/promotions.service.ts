import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { Banner } from './entities/banner.entity';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { applyLocale } from '../../common/utils/locale.util';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(Banner)
    private readonly bannerRepo: Repository<Banner>,
  ) {}

  private applyLocaleToPromotion(promotion: Promotion, locale?: string): Promotion {
    return applyLocale(promotion, locale, ['title', 'description']);
  }

  private applyLocaleToBanner(banner: Banner, locale?: string): Banner {
    return applyLocale(banner, locale, ['title']);
  }

  async findAllActive(locale?: string): Promise<Promotion[]> {
    const now = new Date();
    const promotions = await this.promotionRepo.find({
      where: {
        isActive: true,
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThanOrEqual(now),
      },
      order: { createdAt: 'DESC' },
    });
    return promotions.map((p) => this.applyLocaleToPromotion(p, locale));
  }

  async findOne(id: number, locale?: string): Promise<Promotion> {
    const promotion = await findOrThrow(this.promotionRepo, { id }, '프로모션을 찾을 수 없습니다.');
    return this.applyLocaleToPromotion(promotion, locale);
  }

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    const promotion = this.promotionRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      isActive: dto.isActive ?? true,
      discountRate: dto.discountRate ?? null,
      imageUrl: dto.imageUrl ?? null,
    });
    const saved = await this.promotionRepo.save(promotion);
    this.logger.log(`Promotion created: id=${saved.id}`);
    return saved;
  }

  async update(id: number, dto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await findOrThrow(this.promotionRepo, { id }, '프로모션을 찾을 수 없습니다.');
    if (dto.title !== undefined) promotion.title = dto.title;
    if (dto.description !== undefined) promotion.description = dto.description;
    if (dto.type !== undefined) promotion.type = dto.type;
    if (dto.startsAt !== undefined) promotion.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) promotion.endsAt = new Date(dto.endsAt);
    if (dto.isActive !== undefined) promotion.isActive = dto.isActive;
    if (dto.discountRate !== undefined) promotion.discountRate = dto.discountRate;
    if (dto.imageUrl !== undefined) promotion.imageUrl = dto.imageUrl;
    return this.promotionRepo.save(promotion);
  }

  async remove(id: number): Promise<void> {
    const promotion = await findOrThrow(this.promotionRepo, { id }, '프로모션을 찾을 수 없습니다.');
    await this.promotionRepo.remove(promotion);
    this.logger.log(`Promotion deleted: id=${id}`);
  }

  async findAllActiveBanners(locale?: string): Promise<Banner[]> {
    const now = new Date();
    const banners = await this.bannerRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return banners
      .filter((b) => {
        if (b.startsAt && b.startsAt > now) return false;
        if (b.endsAt && b.endsAt < now) return false;
        return true;
      })
      .map((b) => this.applyLocaleToBanner(b, locale));
  }

  async createBanner(dto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepo.create({
      title: dto.title,
      imageUrl: dto.imageUrl,
      linkUrl: dto.linkUrl ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    });
    const saved = await this.bannerRepo.save(banner);
    this.logger.log(`Banner created: id=${saved.id}`);
    return saved;
  }

  async updateBanner(id: number, dto: UpdateBannerDto): Promise<Banner> {
    const banner = await findOrThrow(this.bannerRepo, { id }, '배너를 찾을 수 없습니다.');
    if (dto.title !== undefined) banner.title = dto.title;
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl;
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl;
    if (dto.sortOrder !== undefined) banner.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) banner.isActive = dto.isActive;
    if (dto.startsAt !== undefined) banner.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) banner.endsAt = new Date(dto.endsAt);
    return this.bannerRepo.save(banner);
  }

  async removeBanner(id: number): Promise<void> {
    const banner = await findOrThrow(this.bannerRepo, { id }, '배너를 찾을 수 없습니다.');
    await this.bannerRepo.remove(banner);
    this.logger.log(`Banner deleted: id=${id}`);
  }
}
