import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';
import { ManualPointAdjustmentDto } from './dto/manual-point-adjustment.dto';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MANUAL_POINT_ADJUSTMENT_PREFIX = '관리자 수동 포인트 조정: ';

export type PointHistorySourceKind =
  | 'review_reward_earn'
  | 'review_reward_revoke'
  | 'order_use'
  | 'expiry'
  | 'order_restore'
  | 'manual_grant'
  | 'manual_debit';

export interface PointHistoryResponseItem {
  id: number;
  userId: number;
  type: 'earn' | 'spend' | 'expire' | 'admin_adjust';
  amount: number;
  balance: number;
  description: string | null;
  createdAt: Date;
  sourceKind: PointHistorySourceKind;
}

export interface AdminPointHistoryResponse {
  items: PointHistoryResponseItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPointAdjustmentResponse {
  pointHistoryId: number;
  auditLogId: number;
  userId: number;
  delta: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
}

export interface ManualPointAdjustmentActor {
  actorId: number;
  actorRole: string;
  ip?: string | null;
  userAgent?: string | null;
}

export function addOneYear(from: Date): Date {
  return new Date(from.getTime() + ONE_YEAR_MS);
}

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepo: Repository<PointHistory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  private effectiveBalanceExpression(): string {
    return `
      COALESCE(SUM(
        CASE
          WHEN ph.type IN ('earn', 'admin_adjust')
            AND ph.amount > 0
            AND ph.remaining_amount IS NOT NULL
            AND (ph.expires_at IS NULL OR ph.expires_at > :now)
          THEN ph.remaining_amount
          ELSE 0
        END
      ), 0)
    `;
  }

  private async assertUserExists(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
  }

  /**
   * Serializes every mutation of a member's ledger.  The user row is the
   * canonical lock row because a member may have no PointHistory yet.
   */
  async lockUserForPointChanges(manager: EntityManager, userId: number): Promise<void> {
    const user = await manager.findOne(User, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
  }

  mapSourceKind(
    entry: Pick<PointHistory, 'type' | 'orderId' | 'relatedEntityType' | 'relatedEntityId'>,
  ): PointHistorySourceKind {
    if (entry.type === 'expire') {
      return 'expiry';
    }

    if (entry.relatedEntityType === 'review' && entry.type === 'earn') {
      return 'review_reward_earn';
    }

    if (entry.relatedEntityType === 'review' && entry.type === 'spend') {
      return 'review_reward_revoke';
    }

    if (entry.type === 'admin_adjust' && entry.orderId != null) {
      return 'order_restore';
    }

    if (entry.type === 'spend' && entry.orderId != null) {
      return 'order_use';
    }

    if (
      entry.type === 'earn' &&
      entry.orderId == null &&
      entry.relatedEntityType == null &&
      entry.relatedEntityId == null
    ) {
      return 'manual_grant';
    }

    if (
      entry.type === 'spend' &&
      entry.orderId == null &&
      entry.relatedEntityType == null &&
      entry.relatedEntityId == null
    ) {
      return 'manual_debit';
    }

    throw new BadRequestException('지원되지 않는 적립금 이력 유형입니다.');
  }

  toHistoryResponse(entry: PointHistory): PointHistoryResponseItem {
    return {
      id: Number(entry.id),
      userId: Number(entry.userId),
      type: entry.type,
      amount: Number(entry.amount),
      balance: Number(entry.balance),
      description: entry.description,
      createdAt: entry.createdAt,
      sourceKind: this.mapSourceKind(entry),
    };
  }

  /**
   * Returns the effective point balance for a user.
   * Uses the running ledger and subtracts only expired earn entries that have not
   * already been represented by scheduler-created expire ledger rows.
   */
  async getUserPointBalance(userId: number): Promise<number> {
    const now = new Date();

    const result = await this.pointHistoryRepo
      .createQueryBuilder('ph')
      .select(this.effectiveBalanceExpression(), 'total')
      .where('ph.user_id = :userId', { userId })
      .setParameter('now', now)
      .getRawOne<{ total: string }>();

    return parseInt(result?.total ?? '0', 10);
  }

  async getUserPointSummary(userId: number): Promise<{ userId: number; balance: number }> {
    await this.assertUserExists(userId);
    const balance = await this.getUserPointBalance(userId);
    return { userId, balance };
  }

  async getUserPointHistory(userId: number, take = 50): Promise<PointHistoryResponseItem[]> {
    const history = await this.pointHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take,
    });

    return history.map((entry) => this.toHistoryResponse(entry));
  }

  async getUserPointHistoryForAdmin(
    userId: number,
    page = 1,
    limit = 20,
  ): Promise<AdminPointHistoryResponse> {
    await this.assertUserExists(userId);

    const normalizedPage = Number(page) > 0 ? Number(page) : 1;
    const normalizedLimit = Number(limit) > 0 ? Number(limit) : 20;

    const [items, total] = await this.pointHistoryRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (normalizedPage - 1) * normalizedLimit,
      take: normalizedLimit,
    });

    return {
      items: items.map((entry) => this.toHistoryResponse(entry)),
      total,
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }

  /**
   * Returns the effective balance within an active transaction.
   */
  async getEffectiveBalanceInTx(manager: EntityManager, userId: number): Promise<number> {
    const now = new Date();

    const result = await manager
      .createQueryBuilder(PointHistory, 'ph')
      .select(this.effectiveBalanceExpression(), 'total')
      .where('ph.user_id = :userId', { userId })
      .setParameter('now', now)
      .getRawOne<{ total: string }>();

    return parseInt(result?.total ?? '0', 10);
  }

  async getRunningBalanceInTx(manager: EntityManager, userId: number): Promise<number> {
    const latestEntry = await manager.findOne(PointHistory, {
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return latestEntry ? Number(latestEntry.balance) : 0;
  }

  async adjustPointsManually(
    actor: ManualPointAdjustmentActor,
    dto: ManualPointAdjustmentDto,
  ): Promise<AdminPointAdjustmentResponse> {
    if (dto.delta === 0) {
      throw new BadRequestException('0 포인트 조정은 허용되지 않습니다.');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.lockUserForPointChanges(manager, dto.userId);

      const beforeBalance = await this.getEffectiveBalanceInTx(manager, dto.userId);
      const description = `${MANUAL_POINT_ADJUSTMENT_PREFIX}${dto.reason}`;

      let entry: PointHistory;
      let balanceAfter: number;
      if (dto.delta > 0) {
        entry = await this.creditLocked(
          manager,
          dto.userId,
          dto.delta,
          description,
          addOneYear(new Date()),
        );
        balanceAfter = beforeBalance + dto.delta;
      } else {
        entry = await this.deductFifoLocked(
          manager,
          dto.userId,
          Math.abs(dto.delta),
          description,
          null,
        );
        balanceAfter = beforeBalance - Math.abs(dto.delta);
      }

      const auditLog = await this.auditLogService.logWithManager(manager, {
        actorId: actor.actorId,
        actorRole: actor.actorRole,
        action: AuditAction.POINT_MANUAL_ADJUSTMENT,
        resourceType: 'point_history',
        resourceId: Number(entry.id),
        beforeJson: {
          userId: dto.userId,
          balance: beforeBalance,
        },
        afterJson: {
          userId: dto.userId,
          delta: dto.delta,
          balanceAfter,
          reason: dto.reason,
          pointHistoryId: Number(entry.id),
        },
        ip: actor.ip ?? null,
        userAgent: actor.userAgent ?? null,
      });

      return {
        pointHistoryId: Number(entry.id),
        auditLogId: Number(auditLog.id),
        userId: dto.userId,
        delta: dto.delta,
        balanceAfter,
        description: entry.description,
        createdAt: entry.createdAt,
      };
    });
  }

  async creditFifo(
    manager: EntityManager,
    userId: number,
    amount: number,
    description: string,
    expiresAt: Date | null,
    orderId: number | null = null,
    relatedEntityType: PointHistory['relatedEntityType'] = null,
    relatedEntityId: number | null = null,
    type: Extract<PointHistory['type'], 'earn' | 'admin_adjust'> = 'earn',
  ): Promise<PointHistory> {
    await this.lockUserForPointChanges(manager, userId);
    return this.creditLocked(
      manager,
      userId,
      amount,
      description,
      expiresAt,
      orderId,
      relatedEntityType,
      relatedEntityId,
      type,
    );
  }

  private async creditLocked(
    manager: EntityManager,
    userId: number,
    amount: number,
    description: string,
    expiresAt: Date | null,
    orderId: number | null = null,
    relatedEntityType: PointHistory['relatedEntityType'] = null,
    relatedEntityId: number | null = null,
    type: Extract<PointHistory['type'], 'earn' | 'admin_adjust'> = 'earn',
  ): Promise<PointHistory> {
    if (amount <= 0) {
      throw new BadRequestException('적립 포인트는 0보다 커야 합니다.');
    }

    const balance = await this.getRunningBalanceInTx(manager, userId);
    return manager.save(PointHistory, {
      userId,
      type,
      amount,
      remainingAmount: amount,
      balance: balance + amount,
      description,
      expiresAt,
      orderId,
      relatedEntityType,
      relatedEntityId,
    });
  }

  async deductFifo(
    manager: EntityManager,
    userId: number,
    amount: number,
    description: string,
    orderId: number | null = null,
  ): Promise<number> {
    await this.lockUserForPointChanges(manager, userId);
    const entry = await this.deductFifoLocked(manager, userId, amount, description, orderId);
    return Number(entry.balance);
  }

  /**
   * Revokes an untouched credit lot that belongs to one source entity. This
   * deliberately does not use FIFO: a source reward may only revoke itself.
   */
  async revokeSourceCreditLocked(
    manager: EntityManager,
    userId: number,
    relatedEntityType: NonNullable<PointHistory['relatedEntityType']>,
    relatedEntityId: number,
    description: string,
  ): Promise<PointHistory | null> {
    await this.lockUserForPointChanges(manager, userId);

    const lot = await manager.findOne(PointHistory, {
      where: {
        userId,
        type: 'earn',
        relatedEntityType,
        relatedEntityId,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lot) {
      return null;
    }

    const amount = Number(lot.amount);
    if (amount <= 0 || Number(lot.remainingAmount) !== amount) {
      throw new BadRequestException('사용된 적립금은 환수할 수 없습니다.');
    }

    lot.remainingAmount = 0;
    await manager.save(PointHistory, lot);

    const balance = await this.getRunningBalanceInTx(manager, userId);
    return manager.save(PointHistory, {
      userId,
      type: 'spend',
      amount: -amount,
      remainingAmount: null,
      balance: balance - amount,
      description,
      relatedEntityType,
      relatedEntityId,
    });
  }

  private async deductFifoLocked(
    manager: EntityManager,
    userId: number,
    amount: number,
    description: string,
    orderId: number | null,
  ): Promise<PointHistory> {
    if (amount <= 0) {
      throw new BadRequestException('차감 포인트는 0보다 커야 합니다.');
    }

    const now = new Date();
    const lots = await manager
      .createQueryBuilder(PointHistory, 'ph')
      .setLock('pessimistic_write')
      .where('ph.user_id = :userId', { userId })
      .andWhere(`ph.type IN ('earn', 'admin_adjust')`)
      .andWhere('ph.amount > 0')
      .andWhere('ph.remaining_amount > 0')
      .andWhere('(ph.expires_at IS NULL OR ph.expires_at > :now)', { now })
      .orderBy('CASE WHEN ph.expires_at IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('ph.expires_at', 'ASC')
      .addOrderBy('ph.created_at', 'ASC')
      .addOrderBy('ph.id', 'ASC')
      .getMany();

    const available = lots.reduce((total, lot) => total + Number(lot.remainingAmount), 0);
    if (amount > available) {
      throw new BadRequestException('적립금이 부족합니다.');
    }

    let outstanding = amount;
    for (const lot of lots) {
      if (outstanding === 0) break;
      const consumed = Math.min(Number(lot.remainingAmount), outstanding);
      lot.remainingAmount = Number(lot.remainingAmount) - consumed;
      outstanding -= consumed;
      await manager.save(PointHistory, lot);
    }

    const currentBalance = await this.getRunningBalanceInTx(manager, userId);
    return manager.save(PointHistory, {
      userId,
      type: 'spend' as const,
      amount: -amount,
      remainingAmount: null,
      balance: currentBalance - amount,
      orderId,
      description,
    });
  }
}
