import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { LookupGuestOrderDto } from './dto/lookup-guest-order.dto';
import { Order } from './entities/order.entity';
import { GuestOrderCreationWorkflowService } from './guest-order-creation.workflow.service';
import { GuestOrderAccessService } from './guest-order-access.service';
import { OrderPostCommitService } from './order-post-commit.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import {
  applyOrderReadRelationJoins,
  localizeOrderReadProjection,
  ORDER_READ_RELATIONS,
  readOrderLocale,
} from './order-read-projection.util';

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
      ? await applyOrderReadRelationJoins(repository.createQueryBuilder('order'))
        .where('order.id = :id', { id })
        .getOne()
      : await repository.findOne({
        where: { id },
        relations: [...ORDER_READ_RELATIONS],
      });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    return localizeOrderReadProjection(order, locale ?? readOrderLocale(order));
  }
}
