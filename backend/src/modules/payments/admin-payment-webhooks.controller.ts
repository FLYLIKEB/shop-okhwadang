import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentWebhookEvent,
  PaymentWebhookResult,
} from './entities/payment-webhook-event.entity';
import { PaymentGatewayType } from './entities/payment.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';

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
  ) {}

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
