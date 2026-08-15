import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { applyLocale } from '../../common/utils/locale.util';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { LookupGuestOrderDto } from './dto/lookup-guest-order.dto';
import { Order } from './entities/order.entity';
import { GuestOrderCreationWorkflowService } from './guest-order-creation.workflow.service';
import { GuestOrderAccessService } from './guest-order-access.service';
import { OrderPostCommitService } from './order-post-commit.service';
import { IdempotencyService } from '../../common/services/idempotency.service';

@Injectable()
export class GuestOrdersService {
  private readonly logger = new Logger(GuestOrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly guestOrderCreationWorkflow: GuestOrderCreationWorkflowService,
    private readonly guestOrderAccessService: GuestOrderAccessService,
    private readonly orderPostCommitService: OrderPostCommitService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateGuestOrderDto, idempotencyKey?: string): Promise<{
    order: Order;
    guestAccessToken: string;
    guestAccessTokenExpiresAt: Date;
  }> {
    this.guestOrderCreationWorkflow.assertCreatePayload(dto);

    const operation = await this.idempotencyService.execute(`guest:${dto.guestEmail.trim().toLowerCase()}`, 'guest-order.create', idempotencyKey, dto, async (manager) => {
      const postCommit = await this.guestOrderCreationWorkflow.runCreateOrderTransaction(manager, dto);
      const access = await this.guestOrderAccessService.issueAccessToken(
        Number(postCommit.savedOrder.id),
        manager,
      );

      return { postCommit, access };
    });
    const result = operation.result;

    if (!operation.replayed) {
      this.logger.log(
        `Guest order created: ${result.postCommit.savedOrder.orderNumber} email=${result.postCommit.guestEmailNormalized}`,
      );
      await this.orderPostCommitService.dispatchOrderCreated(null, result.postCommit);
    }

    const order = await this.findOne(
      Number(result.postCommit.savedOrder.id),
      dto.orderLocale,
    );

    return {
      order,
      guestAccessToken: result.access.guestAccessToken,
      guestAccessTokenExpiresAt: result.access.guestAccessTokenExpiresAt,
    };
  }

  async getById(
    id: number,
    guestAccessToken: string | undefined,
    locale?: 'ko' | 'en',
  ): Promise<Order> {
    return this.guestOrderAccessService.getOrderForAccessOrThrow(id, guestAccessToken, locale);
  }

  async lookup(dto: LookupGuestOrderDto): Promise<{
    order: Order;
    guestAccessToken: string;
    guestAccessTokenExpiresAt: Date;
  }> {
    const result = await this.guestOrderAccessService.lookupAndIssueAccessToken(dto);

    return {
      order: result.order,
      guestAccessToken: result.guestAccessToken,
      guestAccessTokenExpiresAt: result.guestAccessTokenExpiresAt,
    };
  }

  async findOne(id: number, locale?: string, manager?: EntityManager): Promise<Order> {
    const repository = manager ? manager.getRepository(Order) : this.orderRepository;
    const order = typeof repository.createQueryBuilder === 'function'
      ? await repository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'item')
        .leftJoinAndSelect('item.product', 'product')
        .leftJoinAndSelect('item.option', 'option')
        .where('order.id = :id', { id })
        .getOne()
      : await repository.findOne({
        where: { id },
        relations: ['items', 'items.product', 'items.option'],
      });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    return this.localizeOrder(order, locale ?? this.readOrderLocale(order));
  }

  private readOrderLocale(order: Order): 'ko' | 'en' {
    return (order as Order & { orderLocale?: 'ko' | 'en' }).orderLocale === 'en' ? 'en' : 'ko';
  }

  private localizeOrder(order: Order, locale?: string): Order {
    if (!locale || locale === 'ko') {
      return order;
    }

    const localizedItems = order.items?.map((item) => {
      const localizedProduct = item.product
        ? applyLocale(item.product, locale, ['name'])
        : item.product;
      const localizedOption = item.option
        ? applyLocale(item.option, locale, ['name', 'value'])
        : item.option;

      return {
        ...item,
        product: localizedProduct,
        option: localizedOption,
        productName: localizedProduct?.name || item.productName,
        optionName: localizedOption
          ? `${localizedOption.name}: ${localizedOption.value}`
          : item.optionName,
      };
    });

    return { ...order, items: localizedItems ?? [] };
  }
}
