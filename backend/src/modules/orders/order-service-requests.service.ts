import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import {
  OrderServiceRequest,
  OrderServiceRequestStatus,
  OrderServiceRequestType,
} from './entities/order-service-request.entity';
import { CreateOrderServiceRequestDto } from './dto/create-order-service-request.dto';
import { UpdateOrderServiceRequestDto } from './dto/update-order-service-request.dto';
import { AdminOrderServiceRequestQueryDto } from './dto/admin-order-service-request-query.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { assertOwnership } from '../../common/utils/ownership.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { NotificationService } from '../notification/notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { escapeHtml } from '../notification/templates/sanitize';
import { runFirstTerminalTransitionRecovery } from '../payments/services/order-terminal-recovery.util';
import { PointsService } from '../points/points.service';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { ModuleRef } from '@nestjs/core';
import { assertOrderStatusTransition } from './policies/order-status-transition.policy';

const CANCELLABLE_STATUSES = new Set<OrderStatus>([OrderStatus.PENDING, OrderStatus.PAID]);
const AFTER_DELIVERY_REQUEST_STATUSES = new Set<OrderStatus>([
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
]);

interface PaymentCancellationService {
  cancelPaidOrder(orderId: number, reason: string, manager?: EntityManager): Promise<unknown>;
}
const ACTIVE_REQUEST_STATUSES = [
  OrderServiceRequestStatus.REQUESTED,
  OrderServiceRequestStatus.APPROVED,
];

class GatewayCancellationRequiredError extends Error {
  constructor() {
    super('gateway cancellation required');
    Object.setPrototypeOf(this, GatewayCancellationRequiredError.prototype);
  }
}

function isGatewayCancellationRequiredError(err: unknown): boolean {
  return err instanceof Error && err.message === 'gateway cancellation required';
}

function assertMemberOwnedOrder(order: Order, userId: number): void {
  if (order.userId == null) {
    throw new ForbiddenException(
      '비회원 주문은 주문 취소/반품/교환/환불 신청을 지원하지 않습니다.',
    );
  }

  assertOwnership(order.userId, userId);
}

@Injectable()
export class OrderServiceRequestsService {
  private readonly logger = new Logger(OrderServiceRequestsService.name);

  constructor(
    @InjectRepository(OrderServiceRequest)
    private readonly requestRepository: Repository<OrderServiceRequest>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
    private readonly moduleRef: ModuleRef,
    private readonly pointsService: PointsService,
  ) {}

  async create(
    orderId: number,
    userId: number,
    dto: CreateOrderServiceRequestDto,
  ): Promise<OrderServiceRequest> {
    const order = await findOrThrow(
      this.orderRepository,
      { id: orderId },
      '주문을 찾을 수 없습니다.',
    );
    assertMemberOwnedOrder(order, userId);
    this.assertRequestAllowed(order.status, dto.type);

    const existing = await this.requestRepository.findOne({
      where: ACTIVE_REQUEST_STATUSES.map((status) => ({ orderId, userId, type: dto.type, status })),
    });
    if (existing) {
      throw new BadRequestException('이미 처리 중인 신청이 있습니다.');
    }

    const request = this.buildRequest(order, userId, dto);

    if (dto.type === OrderServiceRequestType.CANCEL && order.status === OrderStatus.PENDING) {
      const saved = await this.createCompletedPendingCancellation(order, request);
      this.logger.log(`Pending order cancelled by user: requestId=${saved.id}, orderId=${orderId}`);
      const completed = await this.findOneForUser(Number(saved.id), userId);
      void this.notifyRequestStatusChanged(completed);
      return completed;
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOrder) {
        throw new BadRequestException('주문을 찾을 수 없습니다.');
      }

      const existingRequest = await manager.findOne(OrderServiceRequest, {
        where: ACTIVE_REQUEST_STATUSES.map((status) => ({ orderId, userId, type: dto.type, status })),
      });
      if (existingRequest) {
        throw new BadRequestException('이미 처리 중인 신청이 있습니다.');
      }

      return manager.save(OrderServiceRequest, request);
    });
    this.logger.log(
      `Order service request created: id=${saved.id}, orderId=${orderId}, type=${dto.type}`,
    );
    void this.notifyRequestReceived(saved, order);
    return this.findOneForUser(Number(saved.id), userId);
  }

  private buildRequest(
    order: Order,
    userId: number,
    dto: CreateOrderServiceRequestDto,
  ): OrderServiceRequest {
    const useShippingAddress = dto.useShippingAddress ?? true;
    return this.requestRepository.create({
      orderId: Number(order.id),
      userId,
      type: dto.type,
      reason: dto.reason.trim(),
      detail: dto.detail?.trim() || null,
      imageUrls: dto.imageUrls ?? null,
      useShippingAddress,
      pickupName: useShippingAddress ? order.recipientName : (dto.pickupName ?? null),
      pickupPhone: useShippingAddress ? order.recipientPhone : (dto.pickupPhone ?? null),
      pickupZipcode: useShippingAddress ? order.zipcode : (dto.pickupZipcode ?? null),
      pickupAddress: useShippingAddress ? order.address : (dto.pickupAddress ?? null),
      pickupAddressDetail: useShippingAddress
        ? order.addressDetail
        : (dto.pickupAddressDetail ?? null),
    });
  }

  private isGatewayCancellationReconciliation(payment: Payment | null): boolean {
    if (
      !payment ||
      typeof payment.rawResponse !== 'object' ||
      payment.rawResponse === null ||
      Array.isArray(payment.rawResponse)
    ) {
      return false;
    }

    const rawResponse = payment.rawResponse as Record<string, unknown>;
    return (
      rawResponse.reconciliationRequired === true &&
      rawResponse.gatewayCancellationSucceeded === true
    );
  }

  private isGatewayCancellationAmbiguous(payment: Payment | null): boolean {
    if (
      !payment ||
      payment.status !== PaymentStatus.CONFIRMED ||
      typeof payment.rawResponse !== 'object' ||
      payment.rawResponse === null ||
      Array.isArray(payment.rawResponse)
    ) {
      return false;
    }

    const rawResponse = payment.rawResponse as Record<string, unknown>;
    return (
      rawResponse.reconciliationRequired === true &&
      rawResponse.gatewayCancellationAmbiguous === true
    );
  }

  private async createCompletedPendingCancellation(
    order: Order,
    request: OrderServiceRequest,
  ): Promise<OrderServiceRequest> {
    const saveCompletedRequest = async (
      allowCancelledState = false,
    ): Promise<OrderServiceRequest> =>
      this.dataSource.transaction(async (manager) => {
        const lockedOrder = await manager.findOne(Order, {
          where: { id: order.id },
          lock: { mode: 'pessimistic_write' },
        });
        const lockedPayment = await manager.findOne(Payment, {
          where: { orderId: Number(order.id) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedOrder) throw new BadRequestException('주문을 찾을 수 없습니다.');
        if (
          ![
            OrderStatus.PENDING,
            OrderStatus.PAID,
            ...(allowCancelledState ? [OrderStatus.CANCELLED] : []),
          ].includes(lockedOrder.status)
        ) {
          throw new BadRequestException(
            '결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.',
          );
        }
        if (
          lockedOrder.status === OrderStatus.PAID &&
          lockedPayment?.status !== PaymentStatus.CONFIRMED &&
          !this.isGatewayCancellationReconciliation(lockedPayment)
        ) {
          throw new BadRequestException(
            '결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.',
          );
        }
        const existingRequest = await manager.findOne(OrderServiceRequest, {
          where: ACTIVE_REQUEST_STATUSES.map((status) => ({
            orderId: Number(order.id),
            userId: request.userId,
            type: request.type,
            status,
          })),
        });
        if (existingRequest) {
          throw new BadRequestException('이미 처리 중인 신청이 있습니다.');
        }

        if (this.isGatewayCancellationAmbiguous(lockedPayment)) {
          throw new BadRequestException('결제 취소 상태 확인이 필요합니다. 수동 확인 후 다시 시도해주세요.');
        }

        const processedAt = new Date();
        const saved = await manager.save(OrderServiceRequest, {
          ...request,
          status: OrderServiceRequestStatus.COMPLETED,
          adminNote: '결제대기 주문 사용자 즉시 취소',
          processedAt,
        });

        await this.applyCompletedRequest(manager, {
          ...saved,
          order: lockedOrder,
        } as OrderServiceRequest);

        return saved;
      });

    try {
      return await saveCompletedRequest();
    } catch (err) {
      if (!isGatewayCancellationRequiredError(err)) {
        throw err;
      }
    }

    await this.getPaymentsService().cancelPaidOrder(Number(order.id), request.reason);
    return saveCompletedRequest(true);
  }

  async findByOrderForUser(orderId: number, userId: number): Promise<OrderServiceRequest[]> {
    const order = await findOrThrow(
      this.orderRepository,
      { id: orderId },
      '주문을 찾을 수 없습니다.',
    );
    assertMemberOwnedOrder(order, userId);
    return this.requestRepository.find({
      where: { orderId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(id: number, userId: number): Promise<OrderServiceRequest> {
    const request = await findOrThrow(
      this.requestRepository,
      { id },
      '신청 내역을 찾을 수 없습니다.',
      ['order'],
    );
    assertOwnership(request.userId, userId);
    return request;
  }

  async findAllForAdmin(
    query: AdminOrderServiceRequestQueryDto = {},
  ): Promise<PaginatedResult<OrderServiceRequest>> {
    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.order', 'order')
      .leftJoinAndSelect('request.user', 'user')
      .orderBy('request.createdAt', 'DESC');

    if (query.type) qb.andWhere('request.type = :type', { type: query.type });
    if (query.status) qb.andWhere('request.status = :status', { status: query.status });

    return paginate(qb, { page: query.page ?? 1, limit: query.limit ?? 20 });
  }

  async updateForAdmin(
    id: number,
    dto: UpdateOrderServiceRequestDto,
  ): Promise<OrderServiceRequest> {
    const request = await findOrThrow(
      this.requestRepository,
      { id },
      '신청 내역을 찾을 수 없습니다.',
      ['order', 'user'],
    );

    const adminNote = dto.adminNote?.trim() || null;
    let shouldNotify = true;
    const applyStatusUpdate = async (): Promise<void> => {
      await this.dataSource.transaction(async (manager) => {
        const lockedRequest = await manager.findOne(OrderServiceRequest, {
          where: { id },
          relations: ['order', 'user'],
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedRequest) {
          throw new BadRequestException('신청 내역을 찾을 수 없습니다.');
        }
        if (lockedRequest.status === dto.status && lockedRequest.adminNote === adminNote) {
          shouldNotify = false;
          return;
        }

        if (dto.status === OrderServiceRequestStatus.COMPLETED) {
          await this.applyCompletedRequest(manager, lockedRequest);
        }

        await manager.update(OrderServiceRequest, id, {
          status: dto.status,
          adminNote,
          processedAt: dto.status === OrderServiceRequestStatus.REQUESTED ? null : new Date(),
        });
      });
    };

    try {
      await applyStatusUpdate();
    } catch (err) {
      if (
        !isGatewayCancellationRequiredError(err) ||
        dto.status !== OrderServiceRequestStatus.COMPLETED ||
        request.type !== OrderServiceRequestType.CANCEL
      ) {
        throw err;
      }

      await this.getPaymentsService().cancelPaidOrder(
        Number(request.orderId),
        adminNote || `고객 취소 신청 처리: ${request.reason}`,
      );
      await applyStatusUpdate();
    }

    const updated = await findOrThrow(
      this.requestRepository,
      { id },
      '신청 내역을 찾을 수 없습니다.',
      ['order', 'user'],
    );
    if (shouldNotify) {
      void this.notifyRequestStatusChanged(updated);
    }
    return updated;
  }

  private getPaymentsService(): PaymentCancellationService {
    return this.moduleRef.get<PaymentCancellationService>('PaymentsService', { strict: false });
  }

  private assertRequestAllowed(orderStatus: OrderStatus, type: OrderServiceRequestType): void {
    if (type === OrderServiceRequestType.CANCEL) {
      if (!CANCELLABLE_STATUSES.has(orderStatus)) {
        throw new BadRequestException(
          '배송 준비 이후에는 주문 취소 신청이 제한됩니다. 고객센터로 문의해주세요.',
        );
      }
      return;
    }

    if (!AFTER_DELIVERY_REQUEST_STATUSES.has(orderStatus)) {
      throw new BadRequestException('반품/교환/환불 신청은 배송 완료 후 접수할 수 있습니다.');
    }
  }

  private async applyCompletedRequest(
    manager: import('typeorm').EntityManager,
    request: OrderServiceRequest,
  ): Promise<void> {
    const order = await manager.findOne(Order, {
      where: { id: request.orderId },
      relations: ['items'],
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new BadRequestException('주문을 찾을 수 없습니다.');

    if (request.type === OrderServiceRequestType.CANCEL) {
      const lockedPayment = await manager.findOne(Payment, {
        where: { orderId: Number(order.id) },
        lock: { mode: 'pessimistic_write' },
      });
      const usesGatewayCancellationReconciliation =
        this.isGatewayCancellationReconciliation(lockedPayment);

      if (this.isGatewayCancellationAmbiguous(lockedPayment)) {
        throw new BadRequestException('결제 취소 상태 확인이 필요합니다. 수동 확인 후 다시 시도해주세요.');
      }

      if (lockedPayment?.status === PaymentStatus.CONFIRMED) {
        throw new GatewayCancellationRequiredError();
      }

      if (order.status === OrderStatus.CANCELLED) {
        return;
      }
      if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
        throw new BadRequestException('결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
      }
      if (order.status === OrderStatus.PAID && !usesGatewayCancellationReconciliation) {
        throw new BadRequestException('결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
      }

      const cancelledAt = lockedPayment?.cancelledAt ?? new Date();
      const recovery = await runFirstTerminalTransitionRecovery(manager, {
        orderId: Number(order.id),
        nextOrderStatus: OrderStatus.CANCELLED,
        pointsService: this.pointsService,
        pointRestoreDescription: `주문 ${order.orderNumber} 고객 신청 처리로 인한 적립금 복구`,
        applyMutations: async (lockedOrder) => {
          const canCancelLocally =
            lockedOrder.status === OrderStatus.PENDING ||
            (lockedOrder.status === OrderStatus.PAID && usesGatewayCancellationReconciliation);
          if (!canCancelLocally) {
            return false;
          }

          assertOrderStatusTransition(lockedOrder.status, OrderStatus.CANCELLED);
          await manager.update(Order, order.id, {
            status: OrderStatus.CANCELLED,
            cancelReason: request.reason,
            cancelledAt,
          });
          await manager.update(
            Payment,
            { orderId: Number(order.id), status: PaymentStatus.PENDING },
            { status: PaymentStatus.CANCELLED, cancelReason: request.reason, cancelledAt },
          );
          return true;
        },
      });
      if (!recovery.lockedOrder) throw new BadRequestException('주문을 찾을 수 없습니다.');
      if (!recovery.didMutate) {
        throw new BadRequestException('결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
      }
      return;
    }

    if (
      request.type === OrderServiceRequestType.REFUND ||
      request.type === OrderServiceRequestType.RETURN
    ) {
      if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED) {
        await manager.update(Order, order.id, { status: OrderStatus.REFUND_REQUESTED });
      }
    }
  }

  private async notifyRequestReceived(request: OrderServiceRequest, order: Order): Promise<void> {
    await this.notificationDispatchHelper.dispatch({
      event: 'order-service-request.received',
      userId: request.userId,
      resourceId: request.id,
      mode: 'fire-and-forget',
      logger: this.logger,
      send: (recipient) => {
        const recipientNameHtml = escapeHtml(recipient.name);
        return this.notificationService.sendEmail({
          to: recipient.email,
          subject: `[옥화당] ${order.orderNumber} 신청이 접수되었습니다`,
          text: `${recipient.name}님, ${this.getRequestTypeLabel(request.type)} 신청이 접수되었습니다. 처리 상태는 마이페이지 주문 상세에서 확인하실 수 있습니다.`,
          html: `<p>${recipientNameHtml}님, ${this.getRequestTypeLabel(request.type)} 신청이 접수되었습니다.</p><p>처리 상태는 마이페이지 주문 상세에서 확인하실 수 있습니다.</p>`,
        });
      },
    });
  }

  private async notifyRequestStatusChanged(request: OrderServiceRequest): Promise<void> {
    await this.notificationDispatchHelper.dispatch({
      event: 'order-service-request.status-changed',
      userId: request.userId,
      resourceId: request.id,
      mode: 'fire-and-forget',
      logger: this.logger,
      send: (recipient) => {
        const recipientNameHtml = escapeHtml(recipient.name);
        const adminNoteHtml = request.adminNote ? escapeHtml(request.adminNote) : '';
        return this.notificationService.sendEmail({
          to: recipient.email,
          subject: `[옥화당] ${request.order.orderNumber} 신청 처리 상태 안내`,
          text: `${recipient.name}님, ${this.getRequestTypeLabel(request.type)} 신청 상태가 ${this.getRequestStatusLabel(request.status)}(으)로 변경되었습니다.${request.adminNote ? `\n안내: ${request.adminNote}` : ''}`,
          html: `<p>${recipientNameHtml}님, ${this.getRequestTypeLabel(request.type)} 신청 상태가 <strong>${this.getRequestStatusLabel(request.status)}</strong>(으)로 변경되었습니다.</p>${adminNoteHtml ? `<p>안내: ${adminNoteHtml}</p>` : ''}`,
        });
      },
    });
  }

  private getRequestTypeLabel(type: OrderServiceRequestType): string {
    const labels: Record<OrderServiceRequestType, string> = {
      [OrderServiceRequestType.CANCEL]: '주문 취소',
      [OrderServiceRequestType.RETURN]: '반품',
      [OrderServiceRequestType.EXCHANGE]: '교환',
      [OrderServiceRequestType.REFUND]: '환불',
    };
    return labels[type];
  }

  private getRequestStatusLabel(status: OrderServiceRequestStatus): string {
    const labels: Record<OrderServiceRequestStatus, string> = {
      [OrderServiceRequestStatus.REQUESTED]: '접수',
      [OrderServiceRequestStatus.APPROVED]: '승인',
      [OrderServiceRequestStatus.REJECTED]: '반려',
      [OrderServiceRequestStatus.COMPLETED]: '처리 완료',
    };
    return labels[status];
  }
}
