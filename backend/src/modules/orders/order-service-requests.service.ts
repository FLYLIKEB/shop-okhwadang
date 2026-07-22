import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { restoreOrderStock } from './order-stock.util';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { ModuleRef } from '@nestjs/core';

const CANCELLABLE_STATUSES = new Set<OrderStatus>([OrderStatus.PENDING, OrderStatus.PAID]);
const AFTER_DELIVERY_REQUEST_STATUSES = new Set<OrderStatus>([OrderStatus.DELIVERED, OrderStatus.COMPLETED]);

interface PaymentCancellationService {
  cancelPaidOrder(orderId: number, reason: string): Promise<unknown>;
}
const ACTIVE_REQUEST_STATUSES = [OrderServiceRequestStatus.REQUESTED, OrderServiceRequestStatus.APPROVED];


function assertMemberOwnedOrder(order: Order, userId: number): void {
  if (order.userId == null) {
    throw new ForbiddenException('비회원 주문은 주문 취소/반품/교환/환불 신청을 지원하지 않습니다.');
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
  ) {}

  async create(orderId: number, userId: number, dto: CreateOrderServiceRequestDto): Promise<OrderServiceRequest> {
    const order = await findOrThrow(this.orderRepository, { id: orderId }, '주문을 찾을 수 없습니다.');
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

    const saved = await this.requestRepository.save(request);
    this.logger.log(`Order service request created: id=${saved.id}, orderId=${orderId}, type=${dto.type}`);
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
      pickupName: useShippingAddress ? order.recipientName : dto.pickupName ?? null,
      pickupPhone: useShippingAddress ? order.recipientPhone : dto.pickupPhone ?? null,
      pickupZipcode: useShippingAddress ? order.zipcode : dto.pickupZipcode ?? null,
      pickupAddress: useShippingAddress ? order.address : dto.pickupAddress ?? null,
      pickupAddressDetail: useShippingAddress ? order.addressDetail : dto.pickupAddressDetail ?? null,
    });
  }

  private async createCompletedPendingCancellation(
    order: Order,
    request: OrderServiceRequest,
  ): Promise<OrderServiceRequest> {
    return this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOrder) throw new BadRequestException('주문을 찾을 수 없습니다.');
      if (lockedOrder.status !== OrderStatus.PENDING) {
        throw new BadRequestException('결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
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
  }

  async findByOrderForUser(orderId: number, userId: number): Promise<OrderServiceRequest[]> {
    const order = await findOrThrow(this.orderRepository, { id: orderId }, '주문을 찾을 수 없습니다.');
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

  async findAllForAdmin(query: AdminOrderServiceRequestQueryDto = {}): Promise<PaginatedResult<OrderServiceRequest>> {
    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.order', 'order')
      .leftJoinAndSelect('request.user', 'user')
      .orderBy('request.createdAt', 'DESC');

    if (query.type) qb.andWhere('request.type = :type', { type: query.type });
    if (query.status) qb.andWhere('request.status = :status', { status: query.status });

    return paginate(qb, { page: query.page ?? 1, limit: query.limit ?? 20 });
  }

  async updateForAdmin(id: number, dto: UpdateOrderServiceRequestDto): Promise<OrderServiceRequest> {
    const request = await findOrThrow(
      this.requestRepository,
      { id },
      '신청 내역을 찾을 수 없습니다.',
      ['order', 'user'],
    );

    const adminNote = dto.adminNote?.trim() || null;

    // 유료 주문의 취소 신청 완료는 외부 PG 취소를 포함하므로, 신청 상태 업데이트
    // 트랜잭션을 연 채로 네트워크 호출을 수행하지 않는다. 결제 취소 서비스가 PG
    // 성공 후 Payment/Order/stock/points 동기화를 자체 트랜잭션으로 처리한다.
    if (this.isPaidCancelCompletion(request, dto.status)) {
      await this.getPaymentsService().cancelPaidOrder(
        Number(request.orderId),
        adminNote || `고객 취소 신청 처리: ${request.reason}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(OrderServiceRequest, id, {
        status: dto.status,
        adminNote,
        processedAt: dto.status === OrderServiceRequestStatus.REQUESTED ? null : new Date(),
      });

      if (dto.status === OrderServiceRequestStatus.COMPLETED) {
        await this.applyCompletedRequest(manager, request);
      }
    });

    const updated = await findOrThrow(
      this.requestRepository,
      { id },
      '신청 내역을 찾을 수 없습니다.',
      ['order', 'user'],
    );
    void this.notifyRequestStatusChanged(updated);
    return updated;
  }

  private getPaymentsService(): PaymentCancellationService {
    return this.moduleRef.get<PaymentCancellationService>('PaymentsService', { strict: false });
  }

  private isPaidCancelCompletion(
    request: OrderServiceRequest,
    nextStatus: OrderServiceRequestStatus,
  ): boolean {
    return nextStatus === OrderServiceRequestStatus.COMPLETED
      && request.type === OrderServiceRequestType.CANCEL
      && request.order?.status === OrderStatus.PAID;
  }

  private assertRequestAllowed(orderStatus: OrderStatus, type: OrderServiceRequestType): void {
    if (type === OrderServiceRequestType.CANCEL) {
      if (!CANCELLABLE_STATUSES.has(orderStatus)) {
        throw new BadRequestException('배송 준비 이후에는 주문 취소 신청이 제한됩니다. 고객센터로 문의해주세요.');
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
    });
    if (!order) throw new BadRequestException('주문을 찾을 수 없습니다.');

    if (request.type === OrderServiceRequestType.CANCEL) {
      if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) return;

      if (order.status === OrderStatus.PAID) {
        // Paid cancellations are handled before this transaction by PaymentsService
        // so the external gateway call is not made while this request transaction is open.
        return;
      }

      const cancelledAt = new Date();
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
      await restoreOrderStock(manager, Number(order.id));
      await this.restorePoints(manager, order);
      return;
    }

    if (request.type === OrderServiceRequestType.REFUND || request.type === OrderServiceRequestType.RETURN) {
      if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED) {
        await manager.update(Order, order.id, { status: OrderStatus.REFUND_REQUESTED });
      }
    }
  }

  private async restorePoints(manager: import('typeorm').EntityManager, order: Order): Promise<void> {
    if (!order.pointsUsed || order.pointsUsed <= 0 || order.userId == null) return;

    const last = await manager.findOne(PointHistory, {
      where: { userId: order.userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const balance = Number(last?.balance ?? 0) + Number(order.pointsUsed);
    await manager.save(PointHistory, {
      userId: order.userId,
      type: 'admin_adjust',
      amount: order.pointsUsed,
      balance,
      orderId: Number(order.id),
      description: `주문 ${order.orderNumber} 고객 신청 처리로 인한 적립금 복구`,
    });
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
