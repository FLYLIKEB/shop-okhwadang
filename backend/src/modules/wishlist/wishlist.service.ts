import {
  Injectable,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { assertOwnership } from '../../common/utils/ownership.util';

export interface WishlistItemResponse {
  id: number;
  productId: number;
  createdAt: Date;
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

export interface WishlistListResult {
  data: WishlistItemResponse[];
  total: number;
}

export interface WishlistCheckResult {
  isWishlisted: boolean;
  wishlistId: number | null;
}

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
  ) {}

  private toResponse(w: Wishlist): WishlistItemResponse {
    const base: WishlistItemResponse = {
      id: Number(w.id),
      productId: Number(w.productId),
      createdAt: w.createdAt,
    };

    if (w.product) {
      base.product = {
        id: Number(w.product.id),
        name: w.product.name,
        slug: w.product.slug,
        price: Number(w.product.price),
        salePrice: w.product.salePrice != null ? Number(w.product.salePrice) : null,
        status: w.product.status,
        images: (w.product.images ?? []).map((img) => ({
          url: img.url,
          alt: img.alt,
          isThumbnail: img.isThumbnail,
        })),
      };
    }

    return base;
  }

  async findAll(userId: number): Promise<WishlistListResult> {
    const [items, total] = await this.wishlistRepo.findAndCount({
      where: { userId },
      relations: ['product', 'product.images'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: items.map((w) => this.toResponse(w)),
      total,
    };
  }

  async check(userId: number, productId: number): Promise<WishlistCheckResult> {
    const item = await this.wishlistRepo.findOne({
      where: { userId, productId },
    });

    return {
      isWishlisted: !!item,
      wishlistId: item ? Number(item.id) : null,
    };
  }

  async create(userId: number, dto: CreateWishlistDto): Promise<WishlistItemResponse> {
    const existing = await this.wishlistRepo.findOne({
      where: { userId, productId: dto.productId },
    });

    if (existing) {
      throw new ConflictException('이미 위시리스트에 추가된 상품입니다.');
    }

    const item = this.wishlistRepo.create({
      userId,
      productId: dto.productId,
    });

    const saved = await this.wishlistRepo.save(item);
    this.logger.log(`Wishlist created: id=${saved.id}, userId=${userId}, productId=${dto.productId}`);

    return {
      id: Number(saved.id),
      productId: Number(saved.productId),
      createdAt: saved.createdAt,
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    const item = await findOrThrow(this.wishlistRepo, { id }, '위시리스트 항목을 찾을 수 없습니다.');

    assertOwnership(item.userId, userId, '권한이 없습니다.');

    await this.wishlistRepo.remove(item);
    this.logger.log(`Wishlist deleted: id=${id}, by userId=${userId}`);
  }
}
