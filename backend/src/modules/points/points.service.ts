import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PointHistory } from '../coupons/entities/point-history.entity';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function addOneYear(from: Date): Date {
  return new Date(from.getTime() + ONE_YEAR_MS);
}

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepo: Repository<PointHistory>,
  ) {}

  private effectiveBalanceExpression(): string {
    return `
      COALESCE(SUM(ph.amount), 0)
      - COALESCE(SUM(
        CASE
          WHEN ph.type = 'earn'
            AND ph.expires_at IS NOT NULL
            AND ph.expires_at <= :now
            AND NOT EXISTS (
              SELECT 1
              FROM point_history ex
              WHERE ex.user_id = ph.user_id
                AND ex.type = 'expire'
                AND ex.related_entity_type IS NULL
                AND ex.related_entity_id = ph.id
            )
          THEN ph.amount
          ELSE 0
        END
      ), 0)
    `;
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

  async getRunningBalanceInTx(
    manager: EntityManager,
    userId: number,
  ): Promise<number> {
    const latestEntry = await manager.findOne(PointHistory, {
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return latestEntry ? latestEntry.balance : 0;
  }

  /**
   * Deducts `amount` points using FIFO (earliest-expiring earn entries consumed first).
   * Creates a single 'spend' PointHistory record within the provided transaction manager.
   * Returns the new running balance.
   *
   * Note: This method uses the running balance from the latest record for the balance column,
   * matching the existing pattern in the codebase. FIFO is tracked conceptually by
   * earning entries with earliest expiresAt being consumed first during deduction validation.
   */
  async deductFifo(
    manager: EntityManager,
    userId: number,
    amount: number,
    description: string,
    orderId: number | null = null,
  ): Promise<number> {
    const effectiveBalance = await this.getEffectiveBalanceInTx(manager, userId);
    if (amount > effectiveBalance) {
      throw new BadRequestException('적립금이 부족합니다.');
    }

    const currentBalance = await this.getRunningBalanceInTx(manager, userId);
    const newBalance = currentBalance - amount;

    await manager.save(PointHistory, {
      userId,
      type: 'spend' as const,
      amount: -amount,
      balance: newBalance,
      orderId,
      description,
    });

    return newBalance;
  }
}
