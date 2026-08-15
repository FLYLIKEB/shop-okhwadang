import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { ReconcileRefundDto } from '../dto/reconcile-refund.dto';
import { Payment, PaymentGatewayType, PaymentStatus } from '../entities/payment.entity';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { findOrThrow } from '../../../common/utils/repository.util';

type ResolveGatewayByType = (gatewayType: PaymentGatewayType) => PaymentGateway;

interface PaymentRefundDependencies {
  paymentRepository: Repository<Payment>;
  refundRepository: Repository<Refund>;
  dataSource: DataSource;
  resolveGatewayByType: ResolveGatewayByType;
  logger: Logger;
}

export class PaymentRefundService {
  constructor(private readonly deps: PaymentRefundDependencies) {}

  async partialRefund(orderId: number, dto: CreateRefundDto): Promise<Refund> {
    if (!dto.idempotencyKey) {
      throw new BadRequestException('환불 작업 키가 필요합니다.');
    }
    const idempotencyKey = dto.idempotencyKey;
    const reservation = await this.deps.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) {
        throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
      }
      if (!payment.paymentKey) {
        throw new BadRequestException('결제 키가 없습니다.');
      }

      const existingRefund = await manager.findOne(Refund, {
        where: { idempotencyKey },
      });
      if (existingRefund) {
        if (
          existingRefund.paymentId !== Number(payment.id)
          || Number(existingRefund.amount) !== dto.amount
          || existingRefund.reason !== dto.reason
        ) {
          throw new BadRequestException('환불 작업 키가 다른 요청에 이미 사용되었습니다.');
        }
        return { payment, refund: existingRefund, isNew: false };
      }
      if (payment.status !== PaymentStatus.CONFIRMED && payment.status !== PaymentStatus.PARTIAL_CANCELLED) {
        throw new BadRequestException('환불 가능한 상태가 아닙니다.');
      }

      // The payment lock serializes reservations; pending refunds reserve money too.
      const reservedRefundsResult = await manager
        .createQueryBuilder(Refund, 'r')
        .select('COALESCE(SUM(r.amount), 0)', 'total')
        .where('r.paymentId = :paymentId AND r.status IN (:...statuses)', {
          paymentId: payment.id,
          statuses: [RefundStatus.PENDING, RefundStatus.COMPLETED],
        })
        .getRawOne<{ total: string }>();
      const reservedAmount = Number(reservedRefundsResult?.total ?? 0);
      const remaining = Number(payment.amount) - reservedAmount;
      if (dto.amount > remaining) {
        throw new BadRequestException(
          `환불 가능 금액(${remaining}원)을 초과했습니다.`,
        );
      }

      const pendingRefund = manager.create(Refund, {
        paymentId: Number(payment.id),
        orderItemId: null,
        amount: dto.amount,
        reason: dto.reason,
        status: RefundStatus.PENDING,
        gatewayRefundId: null,
        idempotencyKey,
        // Claim ownership while the payment lock is held, before another worker
        // can retry this operation. Non-idempotent providers then fail closed.
        gatewayAttemptedAt: new Date(),
      });
      return { payment, refund: await manager.save(Refund, pendingRefund), isNew: true };
    });

    let refund = reservation.refund;
    const payment = await findOrThrow(
      this.deps.paymentRepository,
      { orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );
    const cancelGateway = this.deps.resolveGatewayByType(payment.gateway);

    if (refund.status === RefundStatus.COMPLETED || refund.status === RefundStatus.FAILED) {
      return refund;
    }

    if (!refund.gatewayRefundId) {
      if (!reservation.isNew && refund.gatewayAttemptedAt && !cancelGateway.supportsRefundIdempotency) {
        this.deps.logger.error(
          `partialRefund reconciliation required: orderId=${orderId}, refundId=${refund.id}`,
        );
        throw new InternalServerErrorException('환불 처리 상태를 확인 중입니다. 운영팀에 문의하세요.');
      }

      try {
        const gatewayResult = await cancelGateway.partialCancel({
          paymentKey: payment.paymentKey!,
          cancelAmount: refund.amount,
          cancelReason: refund.reason,
          idempotencyKey: refund.idempotencyKey,
          originalAmount: Number(payment.amount),
          orderNumber: payment.order?.orderNumber,
          rawResponse: payment.rawResponse,
        });
        // Save the provider reference separately before final state changes so a
        // retry reconciles rather than sends a second refund after a DB failure.
        await this.deps.refundRepository.update(refund.id, {
          gatewayRefundId: gatewayResult.refundId,
        });
        refund = { ...refund, gatewayRefundId: gatewayResult.refundId };
      } catch (err) {
        if (err instanceof BadRequestException) {
          await this.deps.refundRepository.update(refund.id, { status: RefundStatus.FAILED });
          throw err;
        }
        this.deps.logger.error(`partialRefund gateway failed: orderId=${orderId}, refundId=${refund.id}, error=${String(err)}`);
        throw new InternalServerErrorException('환불 처리에 실패했습니다.');
      }
    }

    try {
      await this.deps.dataSource.transaction(async (manager) => {
        const lockedPayment = await manager.findOne(Payment, {
          where: { id: payment.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedPayment) {
          throw new InternalServerErrorException('결제 정보를 찾을 수 없습니다.');
        }
        await manager.update(Refund, refund.id, {
          status: RefundStatus.COMPLETED,
        });
        await this.syncPaymentStatus(manager, lockedPayment);
      });
    } catch (err) {
      this.deps.logger.error({
        event: 'refund_db_sync_failed',
        orderId,
        refundId: refund.id,
        gatewayRefundId: refund.gatewayRefundId,
        amount: refund.amount,
        error: err instanceof Error ? err.message : String(err),
      }, 'Gateway refund succeeded but DB sync failed - manual reconciliation required');
      throw new InternalServerErrorException('환불이 처리됐으나 시스템 반영에 실패했습니다. 운영팀에 문의하세요.');
    }

    refund = await findOrThrow(this.deps.refundRepository, { id: refund.id }, '환불 정보를 찾을 수 없습니다.');

    // 부분 환불은 배송 완료 후 적용되며, 물리적 반품 없이 금액만 환불하므로 재고 복구 대상이 아니다 (#723).
    // 포인트 환수도 동일 이유로 미적용.
    // 주문 전체 취소·환불 시 재고/포인트 복구 진입점:
    //   - AdminOrdersService.updateStatus → restoreStock / restorePoints
    //   - PaymentsService.cancel (사용자 취소) → restoreOrderStock 직접 호출
    //   - PaymentWebhookService.handleCancel (PG 웹훅) → restoreOrderStock 직접 호출
    //   - PaymentConfirmationService.confirm catch 블록 (결제 승인 실패) → restoreOrderStock 직접 호출

    return refund;
  }

  async reconcileRefund(refundId: number, dto: ReconcileRefundDto): Promise<Refund> {
    await this.deps.dataSource.transaction(async (manager) => {
      const refund = await manager.findOne(Refund, {
        where: { id: refundId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!refund) {
        throw new BadRequestException('환불 정보를 찾을 수 없습니다.');
      }
      const payment = await manager.findOne(Payment, {
        where: { id: refund.paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) {
        throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
      }

      if (
        refund.gatewayRefundId
        && refund.gatewayRefundId !== dto.gatewayRefundId
      ) {
        throw new BadRequestException('PG 환불 참조가 기존 환불 정보와 일치하지 않습니다.');
      }
      if (refund.status !== RefundStatus.PENDING && refund.status !== dto.outcome) {
        throw new BadRequestException('이미 다른 결과로 처리된 환불입니다.');
      }
      await manager.update(Refund, refund.id, {
        status: dto.outcome,
        gatewayRefundId: dto.gatewayRefundId,
        reconciliationEvidence: dto.verificationEvidence,
        reconciledAt: new Date(),
      });
      await this.syncPaymentStatus(manager, payment);
    });

    return findOrThrow(this.deps.refundRepository, { id: refundId }, '환불 정보를 찾을 수 없습니다.');
  }

  private async syncPaymentStatus(manager: EntityManager, payment: Payment): Promise<void> {
    const completedRefundsResult = await manager
      .createQueryBuilder(Refund, 'r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .where('r.paymentId = :paymentId AND r.status = :status', {
        paymentId: payment.id,
        status: RefundStatus.COMPLETED,
      })
      .getRawOne<{ total: string }>();
    const totalRefunded = Number(completedRefundsResult?.total ?? 0);
    if (totalRefunded > Number(payment.amount)) {
      throw new InternalServerErrorException('완료된 환불 금액이 결제 금액을 초과했습니다.');
    }

    if (totalRefunded >= Number(payment.amount)) {
      await manager.update(Payment, payment.id, { status: PaymentStatus.REFUNDED });
      await manager.update(Order, payment.orderId, { status: OrderStatus.REFUNDED });
    } else if (totalRefunded > 0) {
      await manager.update(Payment, payment.id, { status: PaymentStatus.PARTIAL_CANCELLED });
    } else {
      await manager.update(Payment, payment.id, { status: PaymentStatus.CONFIRMED });
    }
  }
}
