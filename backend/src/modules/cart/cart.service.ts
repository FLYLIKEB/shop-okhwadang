import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartQuantityDto } from './dto/update-cart-quantity.dto';
import {
  CartIssueType,
  CartItemValidationResultDto,
  ValidateCartResponseDto,
} from './dto/validate-cart.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { assertOwnership } from '../../common/utils/ownership.util';
import { applyLocale } from '../../common/utils/locale.util';

export interface CartItemWithPrice {
  id: number;
  productId: number;
  productOptionId: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: Product;
  option: ProductOption | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartResponse {
  items: CartItemWithPrice[];
  totalAmount: number;
  itemCount: number;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductOption)
    private readonly productOptionRepository: Repository<ProductOption>,
  ) {}

  async findAll(userId: number, locale?: string): Promise<CartResponse> {
    const items = await this.cartItemRepository
      .createQueryBuilder('cartItem')
      .leftJoinAndSelect('cartItem.product', 'product')
      .leftJoinAndSelect(
        'product.images',
        'image',
        'image.is_thumbnail = :isThumbnail',
        { isThumbnail: true },
      )
      .leftJoinAndSelect('cartItem.option', 'option')
      .where('cartItem.userId = :userId', { userId })
      .orderBy('cartItem.createdAt', 'DESC')
      .getMany();

    const itemsWithPrice: CartItemWithPrice[] = items.map((item) => {
      const basePrice = Number(
        item.product.salePrice ?? item.product.price,
      );
      const adjustment = item.option ? Number(item.option.priceAdjustment) : 0;
      const unitPrice = basePrice + adjustment;
      const subtotal = unitPrice * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        productOptionId: item.productOptionId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        product: applyLocale(item.product, locale, ['name']),
        option: item.option ? applyLocale(item.option, locale, ['name', 'value']) : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    const totalAmount = itemsWithPrice.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const itemCount = itemsWithPrice.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return { items: itemsWithPrice, totalAmount, itemCount };
  }

  async add(userId: number, dto: AddToCartDto, locale?: string): Promise<CartResponse> {
    await findOrThrow(this.productRepository, { id: dto.productId }, '상품을 찾을 수 없습니다.');

    if (dto.productOptionId != null) {
      const option = await this.productOptionRepository.findOne({
        where: { id: dto.productOptionId },
      });
      if (!option || Number(option.productId) !== Number(dto.productId)) {
        throw new BadRequestException(
          '해당 상품의 옵션을 찾을 수 없습니다.',
        );
      }
    }

    const optionIdForQuery =
      dto.productOptionId != null ? dto.productOptionId : IsNull();
    const existing = await this.cartItemRepository.findOne({
      where: {
        userId,
        productId: dto.productId,
        productOptionId: optionIdForQuery,
      },
    });

    if (existing) {
      existing.quantity += dto.quantity;
      await this.cartItemRepository.save(existing);
      this.logger.log(
        `Cart upsert: userId=${userId} productId=${dto.productId} qty+=${dto.quantity}`,
      );
    } else {
      const newItem = this.cartItemRepository.create({
        userId,
        productId: dto.productId,
        productOptionId: dto.productOptionId ?? null,
        quantity: dto.quantity,
      });
      await this.cartItemRepository.save(newItem);
      this.logger.log(
        `Cart add: userId=${userId} productId=${dto.productId} qty=${dto.quantity}`,
      );
    }

    return this.findAll(userId, locale);
  }

  async updateQuantity(
    id: number,
    userId: number,
    dto: UpdateCartQuantityDto,
  ): Promise<CartItem> {
    const item = await findOrThrow(this.cartItemRepository, { id }, '장바구니 항목을 찾을 수 없습니다.');
    assertOwnership(item.userId, userId);

    item.quantity = dto.quantity;
    return this.cartItemRepository.save(item);
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    const item = await findOrThrow(this.cartItemRepository, { id }, '장바구니 항목을 찾을 수 없습니다.');
    assertOwnership(item.userId, userId);

    await this.cartItemRepository.remove(item);
    return { message: '삭제되었습니다.' };
  }

  async validate(
    userId: number,
    itemIds: number[],
  ): Promise<ValidateCartResponseDto> {
    const items = await this.cartItemRepository
      .createQueryBuilder('cartItem')
      .leftJoinAndSelect('cartItem.product', 'product')
      .leftJoinAndSelect('cartItem.option', 'option')
      .where('cartItem.userId = :userId', { userId })
      .andWhere('cartItem.id IN (:...itemIds)', { itemIds })
      .getMany();

    const results: CartItemValidationResultDto[] = items.map((item) => {
      const product = item.product;
      const option = item.option;

      const basePrice = Number(product.salePrice ?? product.price);
      const adjustment = option ? Number(option.priceAdjustment) : 0;
      const unitPrice = basePrice + adjustment;

      // 옵션이 있으면 옵션 재고 우선, 없으면 상품 재고
      const stock = option !== null ? option.stock : product.stock;

      const issues: CartIssueType[] = [];

      if (
        product.status === ProductStatus.HIDDEN ||
        product.status === ProductStatus.DRAFT
      ) {
        issues.push('discontinued');
      }

      if (product.status === ProductStatus.SOLDOUT || stock <= 0) {
        issues.push('out_of_stock');
      }

      const available = issues.length === 0;

      this.logger.log(
        `Validate cart: userId=${userId} itemId=${item.id} issues=${issues.join(',')}`,
      );

      return {
        itemId: item.id,
        available,
        unitPrice,
        stock,
        issues,
      };
    });

    return { results };
  }
}
