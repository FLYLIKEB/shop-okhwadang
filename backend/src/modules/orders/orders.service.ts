import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `ORD-${date}-${random}`;
  }

  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('주문 항목이 없습니다.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderItems: Partial<OrderItem>[] = [];
      let totalAmount = 0;

      for (const item of dto.items) {
        const product = await queryRunner.manager
          .createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: item.productId })
          .getOne();

        if (!product) {
          throw new NotFoundException(`상품을 찾을 수 없습니다. (id: ${item.productId})`);
        }

        let optionName: string | null = null;
        let priceAdjustment = 0;

        if (item.productOptionId != null) {
          const option = await queryRunner.manager
            .createQueryBuilder(ProductOption, 'option')
            .setLock('pessimistic_write')
            .where('option.id = :id', { id: item.productOptionId })
            .getOne();

          if (!option || Number(option.productId) !== Number(item.productId)) {
            throw new BadRequestException('해당 상품의 옵션을 찾을 수 없습니다.');
          }

          if (option.stock < item.quantity) {
            throw new BadRequestException(
              `재고가 부족합니다. (${product.name} - ${option.name}: ${option.value}: ${option.stock}개 남음)`,
            );
          }

          optionName = `${option.name}: ${option.value}`;
          priceAdjustment = Number(option.priceAdjustment);

          await queryRunner.manager.update(ProductOption, option.id, {
            stock: option.stock - item.quantity,
          });
        } else {
          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `재고가 부족합니다. (${product.name}: ${product.stock}개 남음)`,
            );
          }
        }

        await queryRunner.manager.update(Product, product.id, {
          stock: product.stock - item.quantity,
        });

        const unitPrice = Number(product.salePrice ?? product.price) + priceAdjustment;
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        orderItems.push({
          productId: Number(item.productId),
          productOptionId: item.productOptionId ?? null,
          productName: product.name,
          optionName,
          price: unitPrice,
          quantity: item.quantity,
        });
      }

      const order = queryRunner.manager.create(Order, {
        userId,
        orderNumber: this.generateOrderNumber(),
        status: 'pending' as any,
        totalAmount,
        discountAmount: 0,
        shippingFee: 0,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        zipcode: dto.zipcode,
        address: dto.address,
        addressDetail: dto.addressDetail ?? null,
        memo: dto.memo ?? null,
        pointsUsed: dto.pointsUsed ?? 0,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      const itemEntities = orderItems.map((item) =>
        queryRunner.manager.create(OrderItem, { ...item, orderId: Number(savedOrder.id) }),
      );
      await queryRunner.manager.save(OrderItem, itemEntities);

      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(CartItem)
        .where('userId = :userId', { userId })
        .andWhere('productId IN (:...productIds)', {
          productIds: dto.items.map((i) => i.productId),
        })
        .execute();

      await queryRunner.commitTransaction();
      this.logger.log(`Order created: ${savedOrder.orderNumber} userId=${userId}`);

      return this.findOne(Number(savedOrder.id), userId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId: number, page = 1, limit = 10): Promise<{ items: Order[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: number, userId: number): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    if (Number(order.userId) !== Number(userId)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return order;
  }
}
