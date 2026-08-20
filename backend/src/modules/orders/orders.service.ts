import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertOwnership } from '../../common/utils/ownership.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { OrderCreationWorkflowService } from './order-creation.workflow.service';
import { OrderPostCommitService } from './order-post-commit.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { applyOrderReadRelationJoins, localizeOrderReadProjection } from './order-read-projection.util';

function assertMemberOrderOwnership(order: Order, userId: number): void {
  if (order.userId == null) {
    throw new NotFoundException('주문을 찾을 수 없습니다.');
  }

  assertOwnership(order.userId, userId);
}


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
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * 주문 생성 오케스트레이션.
   *
   * 단계:
   *   1) pre-flight 검증 (트랜잭션 외부에서 처리 가능한 입력 검증)
   *   2) 트랜잭션 블록 — 재고 차감, 가격 계산, 주문/아이템 저장, 쿠폰/포인트 사용, 카트 정리
   *   3) post-commit 후처리 — 이벤트 발행 / 알림 디스패치 (실패가 주문에 영향 주면 안 됨)
   *
   * Lock/write order is fixed:
   *   - user(point ledger) lock → product/option stock UPDATE (ID order) → order INSERT
   *     → coupon/point UPDATE → order_items INSERT → cart DELETE
   */
  async create(userId: number, dto: CreateOrderDto, idempotencyKey?: string): Promise<Order> {
    this.orderCreationWorkflow.assertCreatePayload(dto);

    const pointsToUse = dto.pointsUsed ?? 0;
    const operation = await this.idempotencyService.execute(
      `member:${userId}`, 'order.create', idempotencyKey, dto,
      (manager) => this.orderCreationWorkflow.runCreateOrderTransaction(manager, userId, dto, pointsToUse),
    );
    const postCommit = operation.result;

    if (!operation.replayed) {
      this.logger.log(`Order created: ${postCommit.savedOrder.orderNumber} userId=${userId}`);
      await this.orderPostCommitService.dispatchOrderCreated(userId, postCommit);
    }

    return this.findOne(Number(postCommit.savedOrder.id), userId);
  }

  async findAll(
    userId: number,
    page = 1,
    limit = 10,
    locale?: string,
  ): Promise<PaginatedResult<Order>> {
    const qb = applyOrderReadRelationJoins(this.orderRepository.createQueryBuilder('order'))
      .loadRelationCountAndMap('order.itemCount', 'order.items')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC');

    const paged = await paginate(qb, { page, limit });
    return {
      ...paged,
      items: paged.items.map((order) => localizeOrderReadProjection(order, locale)),
    };
  }

  async findOne(id: number, userId: number, locale?: string): Promise<Order> {
    const order = await applyOrderReadRelationJoins(this.orderRepository.createQueryBuilder('order'))
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    assertMemberOrderOwnership(order, userId);

    return localizeOrderReadProjection(order, locale);
  }
}
