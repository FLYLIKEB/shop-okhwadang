import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentWebhookEvent,
  PaymentWebhookResult,
  PaymentWebhookState,
} from './entities/payment-webhook-event.entity';
import { PaymentGatewayType } from './entities/payment.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { MessageNotificationService } from '../notification/message-notification.service';

/**
 * 웹훅 이벤트 관측성 (issue #725)
 *
 * 운영자가 다음을 추적할 수 있도록 한다:
 *   - 어떤 PG 에서 어떤 이벤트가 수신되었는가 (received_at desc)
 *   - 결과(success/ignored/failed) 별 필터
 *   - failed 인 경우 error_message 와 raw_payload 로 사후 재처리 판단
 */
@ApiTags('관리자 - 결제 웹훅')
@Controller('admin/payment-webhooks')
@Roles('admin', 'super_admin')
export class AdminPaymentWebhooksController {
  constructor(
    @InjectRepository(PaymentWebhookEvent)
    private readonly repo: Repository<PaymentWebhookEvent>,
    private readonly auditLogService: AuditLogService,
    private readonly messageNotifications: MessageNotificationService,
  ) {}

  @Post('message-deliveries/:effectKey/reconcile')
  @ApiOperation({ summary: '제공자 확인으로 메시지 전달 및 결제 효과를 정합화합니다' })
  async reconcileMessageDelivery(
    @Param('effectKey') effectKey: string,
    @Body('reason') reason: string,
    @Body('providerMessageId') providerMessageId: string | undefined,
    @CurrentUser() actor: { id: number; role: string },
  ): Promise<{ reconciled: boolean }> {
    if (!reason?.trim() || !providerMessageId?.trim()) {
      throw new BadRequestException('정합화 사유와 제공자 메시지 ID가 필요합니다.');
    }
    const reconciled = await this.repo.manager.transaction(async (manager) => {
      const updated = await this.messageNotifications.reconcileDelivered(effectKey, providerMessageId.trim(), manager);
      if (!updated) throw new BadRequestException('정합화할 메시지 전달 또는 결제 효과를 찾을 수 없습니다.');
      await this.auditLogService.logWithManager(manager, {
        actorId: Number(actor.id), actorRole: actor.role, action: AuditAction.ORDER_STATUS_UPDATE,
        resourceType: 'message_delivery', resourceId: 0,
        beforeJson: { effectKey },
        afterJson: { effectKey, providerMessageId: providerMessageId.trim(), reason: reason.trim() },
      });
      return true;
    });
    return { reconciled };
  }


  @Post(':id/replay')
  @ApiOperation({ summary: '실패한 웹훅을 재처리 대기열에 넣습니다' })
  @ApiResponse({ status: 200, description: '재처리 대기열 등록 완료' })
  async replay(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() actor: { id: number; role: string },
  ): Promise<{ queued: boolean }> {
    if (!reason?.trim()) {
      throw new BadRequestException('재처리 사유가 필요합니다.');
    }
    await this.repo.manager.transaction(async (manager) => {
      const receipt = await manager.findOne(PaymentWebhookEvent, { where: { id } });
      if (
        !receipt ||
        !receipt.replayable ||
        !receipt.rawBody ||
        !receipt.signatureValue ||
        !receipt.normalizedMetadata ||
        ![PaymentWebhookState.FAILED, PaymentWebhookState.MANUAL_REVIEW].includes(receipt.state)
      ) {
        throw new BadRequestException('서명된 증거가 있는 실패 웹훅만 재처리할 수 있습니다.');
      }
      const before = {
        state: receipt.state, result: receipt.result, attemptCount: receipt.attemptCount, replayable: receipt.replayable,
      };
      // Manual replay explicitly grants a fresh worker budget; evidence remains immutable.
      const updated = await manager.getRepository(PaymentWebhookEvent).createQueryBuilder()
        .update(PaymentWebhookEvent)
        .set({
          state: PaymentWebhookState.PENDING, attemptCount: 0, nextAttemptAt: new Date(),
          leaseOwner: null, leaseExpiresAt: null,
          replayCount: () => 'replay_count + 1', replayedAt: new Date(),
          lastError: `Replay requested by ${Number(actor.id)} (${actor.role}): ${reason.trim()}`,
        })
        .where('id = :id', { id })
        .andWhere('state IN (:...states)', { states: [PaymentWebhookState.FAILED, PaymentWebhookState.MANUAL_REVIEW] })
        .andWhere('replayable = :replayable', { replayable: true })
        .andWhere('raw_body IS NOT NULL AND signature_value IS NOT NULL AND normalized_metadata IS NOT NULL')
        .execute();
      if (updated.affected !== 1) {
        throw new BadRequestException('서명된 증거가 있는 실패 웹훅만 재처리할 수 있습니다.');
      }
      await this.auditLogService.logWithManager(manager, {
        actorId: Number(actor.id), actorRole: actor.role, action: AuditAction.ORDER_STATUS_UPDATE,
        resourceType: 'payment_webhook_receipt', resourceId: id, beforeJson: before,
        afterJson: { state: PaymentWebhookState.PENDING, attemptCount: 0, reason: reason.trim(), receiptId: id },
      });
    });
    return { queued: true };
  }

  @Get()
  @ApiOperation({ summary: '웹훅 이벤트 목록', description: '결제 웹훅 수신 로그를 페이지네이션으로 조회.' })
  @ApiQuery({ name: 'gateway', required: false, enum: PaymentGatewayType })
  @ApiQuery({ name: 'result', required: false, enum: PaymentWebhookResult })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '웹훅 이벤트 목록' })
  async list(
    @Query('gateway') gateway?: PaymentGatewayType,
    @Query('result') result?: PaymentWebhookResult,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<PaymentWebhookEvent>> {
    const qb = this.repo.createQueryBuilder('event').orderBy('event.received_at', 'DESC');
    if (gateway) qb.andWhere('event.gateway = :gateway', { gateway });
    if (result) qb.andWhere('event.result = :result', { result });
    return paginate(qb, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
