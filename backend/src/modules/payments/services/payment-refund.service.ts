import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateRefundDto } from '../dto/create-refund.dto';
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
    // Phase 1: lock payment + validate + create pending Refund
    let refund = await this.deps.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) {
        throw new BadRequestException('결제 정보를 찾을 수 없습니다.');
      }
      if (payment.status !== PaymentStatus.CONFIRMED && payment.status !== PaymentStatus.PARTIAL_CANCELLED) {
        throw new BadRequestException('환불 가능한 상태가 아닙니다.');
      }
      if (!payment.paymentKey) {
        throw new BadRequestException('결제 키가 없습니다.');
      }

      // Validate remaining refundable amount
      const completedRefundsResult = await manager
        .createQueryBuilder(Refund, 'r')
        .select('COALESCE(SUM(r.amount), 0)', 'total')
        .where('r.paymentId = :paymentId AND r.status = :status', {
          paymentId: payment.id,
          status: RefundStatus.COMPLETED,
        })
        .getRawOne<{ total: string }>();
      const alreadyRefunded = Number(completedRefundsResult?.total ?? 0);
      const remaining = Number(payment.amount) - alreadyRefunded;
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
      });
      return manager.save(Refund, pendingRefund);
    });

    // Phase 2: call gateway outside transaction
    const payment = await findOrThrow(
      this.deps.paymentRepository,
      { orderId },
      '결제 정보를 찾을 수 없습니다.',
    );
    const cancelGateway = this.deps.resolveGatewayByType(payment.gateway);

    let gatewayResult: { refundId: string };
    try {
      gatewayResult = await cancelGateway.partialCancel({
        paymentKey: payment.paymentKey!,
        cancelAmount: dto.amount,
        cancelReason: dto.reason,
      });
    } catch (err) {
      await this.deps.refundRepository.update(refund.id, { status: RefundStatus.FAILED });
      this.deps.logger.error(`partialRefund gateway failed: orderId=${orderId}, refundId=${refund.id}, error=${String(err)}`);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('환불 처리에 실패했습니다.');
    }

    // Phase 3: DB sync of gateway success
    try {
      await this.deps.dataSource.transaction(async (manager) => {
        await manager.update(Refund, refund.id, {
          status: RefundStatus.COMPLETED,
          gatewayRefundId: gatewayResult.refundId,
        });

        // SUM already includes current refund (updated to COMPLETED above)
        const completedRefundsResult = await manager
          .createQueryBuilder(Refund, 'r')
          .select('COALESCE(SUM(r.amount), 0)', 'total')
          .where('r.paymentId = :paymentId AND r.status = :status', {
            paymentId: payment.id,
            status: RefundStatus.COMPLETED,
          })
          .getRawOne<{ total: string }>();
        const totalRefunded = Number(completedRefundsResult?.total ?? 0);

        if (totalRefunded >= Number(payment.amount)) {
          await manager.update(Payment, payment.id, { status: PaymentStatus.REFUNDED });
          await manager.update(Order, payment.orderId, { status: OrderStatus.REFUNDED });
        } else {
          await manager.update(Payment, payment.id, { status: PaymentStatus.PARTIAL_CANCELLED });
        }
      });
    } catch (err) {
      this.deps.logger.error({
        event: 'refund_db_sync_failed',
        orderId,
        refundId: refund.id,
        gatewayRefundId: gatewayResult.refundId,
        amount: dto.amount,
        error: err instanceof Error ? err.message : String(err),
      }, 'Gateway refund succeeded but DB sync failed - manual reconciliation required');
      throw new InternalServerErrorException('환불이 처리됐으나 시스템 반영에 실패했습니다. 운영팀에 문의하세요.');
    }

    refund = await findOrThrow(this.deps.refundRepository, { id: refund.id }, '환불 정보를 찾을 수 없습니다.');

    // TODO(#481, #483): 재고 복구/포인트 환수 연계

    return refund;
  }
}

