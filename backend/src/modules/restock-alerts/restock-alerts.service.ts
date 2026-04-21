import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RestockAlert } from './entities/restock-alert.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { findOrThrow } from '../../common/utils/repository.util';
import { CreateRestockAlertDto } from './dto/create-restock-alert.dto';

@Injectable()
export class RestockAlertsService {
  private readonly logger = new Logger(RestockAlertsService.name);

  constructor(
    @InjectRepository(RestockAlert)
    private readonly restockAlertRepository: Repository<RestockAlert>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductOption)
    private readonly productOptionRepository: Repository<ProductOption>,
    private readonly notificationService: NotificationService,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
  ) {}

  async createAlert(userId: number, productId: number, dto: CreateRestockAlertDto): Promise<RestockAlert> {
    const product = await findOrThrow(this.productRepository, { id: productId }, '상품을 찾을 수 없습니다.');

    let option: ProductOption | null = null;
    let currentStock = product.stock;

    if (dto.productOptionId !== undefined) {
      option = await findOrThrow(
        this.productOptionRepository,
        { id: dto.productOptionId, productId },
        '상품 옵션을 찾을 수 없습니다.',
      );
      currentStock = option.stock;
    }

    if (currentStock > 0) {
      throw new BadRequestException('이미 재고가 있는 상품입니다.');
    }

    const existing = await this.restockAlertRepository.findOne({
      where: {
        userId,
        productId,
        productOptionId: dto.productOptionId ?? IsNull(),
        notifiedAt: IsNull(),
      },
      relations: ['product', 'productOption'],
    });
    if (existing) {
      return existing;
    }

    const alert = this.restockAlertRepository.create({
      userId,
      productId,
      productOptionId: dto.productOptionId ?? null,
      notifiedAt: null,
    });

    const saved = await this.restockAlertRepository.save(alert);
    this.logger.log(`Restock alert created: userId=${userId}, productId=${productId}, optionId=${dto.productOptionId ?? 'null'}`);

    return findOrThrow(this.restockAlertRepository, { id: saved.id }, '재입고 알림을 찾을 수 없습니다.', ['product', 'productOption']);
  }

  async findUserAlerts(userId: number): Promise<RestockAlert[]> {
    return this.restockAlertRepository.find({
      where: { userId },
      relations: ['product', 'productOption'],
      order: { createdAt: 'DESC' },
    });
  }

  async processProductRestock(productId: number, previousStock: number, nextStock: number): Promise<void> {
    if (!(previousStock <= 0 && nextStock > 0)) {
      return;
    }

    const alerts = await this.restockAlertRepository.find({
      where: {
        productId,
        productOptionId: IsNull(),
        notifiedAt: IsNull(),
      },
      relations: ['product'],
      order: { createdAt: 'ASC' },
    });

    if (alerts.length === 0) {
      return;
    }

    for (const alert of alerts) {
      await this.notificationDispatchHelper.dispatch({
        event: 'restock.alert',
        userId: alert.userId,
        resourceId: Number(alert.id),
        mode: 'await',
        logger: this.logger,
        send: (recipient) =>
          this.notificationService.sendRestockAlert(recipient.email, {
            recipientName: recipient.name,
            productName: alert.product.name,
            productUrl: this.buildProductUrl(alert.product.slug),
          }),
      });
      alert.notifiedAt = new Date();
      await this.restockAlertRepository.save(alert);
    }

    this.logger.log(`Restock alerts processed: productId=${productId}, count=${alerts.length}`);
  }

  private buildProductUrl(slug: string): string {
    const baseUrl = process.env.FRONTEND_URL;
    if (!baseUrl) {
      throw new Error('FRONTEND_URL environment variable is required');
    }

    return new URL(`/products/${slug}`, baseUrl).toString();
  }
}
