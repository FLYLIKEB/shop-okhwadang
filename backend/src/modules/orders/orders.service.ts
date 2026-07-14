import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertOwnership } from '../../common/utils/ownership.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { applyLocale } from '../../common/utils/locale.util';
import { OrderCreationWorkflowService } from './order-creation.workflow.service';
import { OrderPostCommitService } from './order-post-commit.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly orderCreationWorkflow: OrderCreationWorkflowService,
    private readonly orderPostCommitService: OrderPostCommitService,
  ) {}

  /**
   * 주문 생성 오케스트레이션.
   *
   * 단계:
   *   1) pre-flight 검증 (트랜잭션 외부에서 처리 가능한 입력 검증)
   *   2) 트랜잭션 블록 — 재고 차감, 가격 계산, 주문/아이템 저장, 쿠폰/포인트 사용, 카트 정리
   *   3) post-commit 후처리 — 이벤트 발행 / 알림 디스패치 (실패가 주문에 영향 주면 안 됨)
   *
   * DB write 순서는 절대 변경되지 않는다:
   *   - product/option stock UPDATE → order INSERT → coupon/point UPDATE → order_items INSERT → cart DELETE
   */
  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
    this.orderCreationWorkflow.assertCreatePayload(dto);

    const pointsToUse = dto.pointsUsed ?? 0;
    const postCommit = await this.dataSource.transaction((manager) =>
      this.orderCreationWorkflow.runCreateOrderTransaction(manager, userId, dto, pointsToUse),
    );

    this.logger.log(`Order created: ${postCommit.savedOrder.orderNumber} userId=${userId}`);
    await this.orderPostCommitService.dispatchOrderCreated(userId, postCommit);

    return this.findOne(Number(postCommit.savedOrder.id), userId);
  }

  async findAll(
    userId: number,
    page = 1,
    limit = 10,
    locale?: string,
  ): Promise<PaginatedResult<Order>> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.option', 'option')
      .loadRelationCountAndMap('order.itemCount', 'order.items')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC');

    const paged = await paginate(qb, { page, limit });
    return {
      ...paged,
      items: paged.items.map((order) => this.localizeOrder(order, locale)),
    };
  }

  async findOne(id: number, userId: number, locale?: string): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.option', 'option')
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    assertOwnership(order.userId, userId);

    return this.localizeOrder(order, locale);
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
